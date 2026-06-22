import fs from 'node:fs';
import path from 'node:path';
import { db, bumpActivity, awardXP } from './db.js';
import { getStore, lessonMeta } from './content.js';
import { schedule, topicNextReview } from './srs.js';
import {
  hashPassword, verifyPassword, signToken, verifyToken, answerMatches, slugify,
} from './util.js';
import { pushEnabled, publicKey, sendToUser } from './push.js';

const SECRET = process.env.AUTH_SECRET || 'dev-insecure-secret-change-me';
const COOKIE = 'et_token';
const isProd = process.env.NODE_ENV === 'production';
// Effectively forever: log in once and stay in. Survives deploys because
// AUTH_SECRET lives in .env (not regenerated) and data lives in the SQLite volume.
const SESSION_TTL = 60 * 60 * 24 * 3650; // 10 years

function setAuthCookie(reply, token) {
  reply.setCookie(COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: isProd, path: '/',
    maxAge: SESSION_TTL,
  });
}

export async function registerRoutes(app) {
  app.decorateRequest('user', null);

  // Auth gate for everything under /api except whitelisted paths
  app.addHook('preHandler', async (req, reply) => {
    if (!req.url.startsWith('/api/')) return;
    const open = ['/api/health', '/api/auth/login'];
    if (open.includes(req.url.split('?')[0])) return;
    const token = req.cookies?.[COOKIE];
    const payload = verifyToken(token, SECRET);
    if (!payload) return reply.code(401).send({ error: 'unauthorized' });
    // Re-read live role/name from DB so role changes (e.g. promotion to admin) apply
    // immediately — tokens last 10 years, so we must not trust the role baked into them.
    const fresh = db.prepare('SELECT username, display_name, role FROM users WHERE id = ?').get(payload.uid);
    if (!fresh) return reply.code(401).send({ error: 'unauthorized' });
    req.user = { uid: payload.uid, username: fresh.username, name: fresh.display_name, role: fresh.role || 'user' };
  });

  function requireAdmin(req, reply) {
    if (req.user?.role !== 'admin') { reply.code(403).send({ error: 'forbidden' }); return false; }
    return true;
  }

  // ---------------- Health ----------------
  app.get('/api/health', async () => ({ ok: true, time: new Date().toISOString() }));

  // ---------------- Auth ----------------
  app.post('/api/auth/login', async (req, reply) => {
    const { username, password } = req.body || {};
    if (!username || !password) return reply.code(400).send({ error: 'missing credentials' });
    const u = db.prepare('SELECT * FROM users WHERE username = ?').get(String(username).toLowerCase());
    if (!u || !verifyPassword(password, u.password)) {
      return reply.code(401).send({ error: 'invalid credentials' });
    }
    const token = signToken({ uid: u.id, username: u.username, name: u.display_name, role: u.role || 'user' }, SECRET, SESSION_TTL);
    setAuthCookie(reply, token);
    return { user: { id: u.id, username: u.username, name: u.display_name, role: u.role || 'user' } };
  });

  app.post('/api/auth/logout', async (req, reply) => {
    reply.clearCookie(COOKIE, { path: '/' });
    return { ok: true };
  });

  app.get('/api/auth/me', async (req) => ({ user: req.user }));

  // ---------------- Lessons ----------------
  app.get('/api/lessons', async (req) => {
    const store = getStore();
    const done = db.prepare(
      'SELECT lesson_id, COUNT(*) c, SUM(correct) ok FROM lesson_attempts WHERE user_id = ? GROUP BY lesson_id'
    ).all(req.user.uid);
    const map = new Map(done.map((d) => [d.lesson_id, d]));
    return store.lessons.map((l) => {
      const d = map.get(l.id);
      return { ...lessonMeta(l), attempted: d?.c || 0, correct: d?.ok || 0 };
    });
  });

  app.get('/api/lessons/:id', async (req, reply) => {
    const l = getStore().lessonById.get(req.params.id);
    if (!l) return reply.code(404).send({ error: 'not found' });
    const attempts = db.prepare(
      'SELECT exercise_id, correct, answer FROM lesson_attempts WHERE user_id = ? AND lesson_id = ?'
    ).all(req.user.uid, l.id);
    return { ...l, attempts };
  });

  app.post('/api/lessons/:id/attempt', async (req) => {
    const { exerciseId, correct, answer } = req.body || {};
    db.prepare(
      `INSERT INTO lesson_attempts (user_id, lesson_id, exercise_id, correct, answer)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, lesson_id, exercise_id)
       DO UPDATE SET correct = excluded.correct, answer = excluded.answer, created_at = datetime('now')`
    ).run(req.user.uid, req.params.id, exerciseId, correct ? 1 : 0, answer ?? null);
    bumpActivity(req.user.uid, 'exercises');
    awardXP(req.user.uid, correct ? 10 : 2);
    return { ok: true };
  });

  app.post('/api/lessons/:id/add-gloss-to-srs', async (req, reply) => {
    const uid = req.user.uid;
    const lesson = getStore().lessonById.get(req.params.id);
    if (!lesson) return reply.code(404).send({ error: 'not found' });
    const gloss = lesson.reading?.gloss || [];
    if (!gloss.length) return { added: 0, total: 0 };
    let added = 0;
    for (const g of gloss) {
      const wordId = `gloss:${req.params.id}:${slugify(g.en)}`;
      db.prepare(
        `INSERT OR IGNORE INTO custom_words (id, user_id, word, ru, topic) VALUES (?, ?, ?, ?, ?)`
      ).run(wordId, uid, g.en, g.ru || null, req.params.id);
      const exists = db.prepare('SELECT id FROM srs_cards WHERE user_id=? AND word_id=?').get(uid, wordId);
      if (!exists) {
        db.prepare(
          `INSERT INTO srs_cards (user_id, word_id, source, state, due) VALUES (?, ?, 'custom', 'new', datetime('now'))`
        ).run(uid, wordId);
        added++;
      }
    }
    return { added, total: gloss.length };
  });

  // ---------------- Practice ----------------
  app.get('/api/practice/queue', async (req) => {
    const uid = req.user.uid;
    const count = Math.min(Number(req.query.count) || 20, 50);
    const level = req.query.level ? String(req.query.level).toUpperCase() : null;

    const lessons = getStore().lessons;
    const allItems = [];
    for (const lesson of lessons) {
      if (lesson.kind === 'reading') continue; // comprehension Qs need the text context
      if (level && lesson.level !== level) continue;
      for (const ex of lesson.exercises || []) {
        allItems.push({ lessonId: lesson.id, lessonTitle: lesson.title, level: lesson.level, exercise: ex });
      }
    }
    if (!allItems.length) return { items: [] };

    // Per-exercise stats for this user
    const rows = db.prepare(
      'SELECT lesson_id, exercise_id, COUNT(*) total, SUM(correct) correct FROM lesson_attempts WHERE user_id = ? GROUP BY lesson_id, exercise_id'
    ).all(uid);
    const statsMap = new Map(rows.map((r) => [`${r.lesson_id}/${r.exercise_id}`, r]));

    // Weight: never tried=3, always wrong=2.5, 50% correct=1.5, always correct=0.5
    const weighted = allItems.map((item) => {
      const key = `${item.lessonId}/${item.exercise.id}`;
      const s = statsMap.get(key);
      const weight = s ? 0.5 + 2 * (1 - s.correct / s.total) : 3;
      return { ...item, weight };
    });

    // Weighted random sample without replacement
    const items = weightedSample(weighted, Math.min(count, weighted.length));
    return { items: items.map(({ weight, ...rest }) => rest) };
  });

  app.get('/api/practice/stats', async (req) => {
    const uid = req.user.uid;
    const all = db.prepare(
      'SELECT lesson_id, COUNT(*) total, SUM(correct) correct FROM lesson_attempts WHERE user_id = ? GROUP BY lesson_id'
    ).all(uid);
    const today = db.prepare(
      "SELECT COUNT(*) c, SUM(correct) ok FROM lesson_attempts WHERE user_id = ? AND date(created_at) = date('now')"
    ).get(uid);
    const totalEx = all.reduce((s, r) => s + r.total, 0);
    const totalOk = all.reduce((s, r) => s + r.correct, 0);
    const weak = all
      .filter((r) => r.total >= 3)
      .sort((a, b) => (a.correct / a.total) - (b.correct / b.total))
      .slice(0, 3)
      .map((r) => {
        const lesson = getStore().lessonById.get(r.lesson_id);
        return { lessonId: r.lesson_id, title: lesson?.title || r.lesson_id, correctRate: Math.round(100 * r.correct / r.total) };
      });
    return { total: totalEx, correct: totalOk, todayCount: today?.c || 0, todayCorrect: today?.ok || 0, weakSpots: weak };
  });

  // Server-side answer check (also done client-side; this is the source of truth)
  app.post('/api/check', async (req) => {
    const { accepted, given } = req.body || {};
    return { correct: answerMatches(given, accepted) };
  });

  // ---------------- Grammar ----------------
  app.get('/api/grammar', async () =>
    getStore().grammar.map(({ body, ...meta }) => meta));

  app.get('/api/grammar/:id', async (req, reply) => {
    const g = getStore().grammarById.get(req.params.id);
    if (!g) return reply.code(404).send({ error: 'not found' });
    return g;
  });

  // ---------------- Vocab ----------------
  app.get('/api/vocab/categories', async () => getStore().vocabCategories);

  app.get('/api/vocab/words', async (req) => {
    const { category, topic, level, pos, search, limit = 200, offset = 0 } = req.query || {};
    let words = getStore().words;
    if (category) words = words.filter((w) => w.category === category);
    if (topic) words = words.filter((w) => w.topic === topic);
    if (level) words = words.filter((w) => w.level === level);
    if (pos) words = words.filter((w) => w.pos === pos);
    if (search) {
      const s = String(search).toLowerCase();
      words = words.filter((w) => w.word.toLowerCase().includes(s) || (w.ru || '').toLowerCase().includes(s));
    }
    // When not scoped to a single category, a word may appear in several
    // categories — collapse to one entry per id for display.
    if (!category) {
      const seen = new Set();
      words = words.filter((w) => (seen.has(w.id) ? false : (seen.add(w.id), true)));
    }
    const total = words.length;
    const page = words.slice(Number(offset), Number(offset) + Number(limit));
    // annotate with whether already in user's deck
    const inDeck = new Set(
      db.prepare('SELECT word_id FROM srs_cards WHERE user_id = ?').all(req.user.uid).map((r) => r.word_id)
    );
    return { total, words: page.map((w) => ({ ...w, inDeck: inDeck.has(w.id) })) };
  });

  app.get('/api/vocab/word/:id', async (req, reply) => {
    const w = getStore().wordById.get(req.params.id);
    if (!w) return reply.code(404).send({ error: 'not found' });
    return w;
  });

  // ---------------- SRS ----------------
  function resolveWord(card) {
    if (card.source === 'custom') {
      const c = db.prepare('SELECT * FROM custom_words WHERE id = ? AND user_id = ?').get(card.word_id, card.user_id);
      if (!c) return null;
      return {
        id: c.id, word: c.word, ru: c.ru, ipa: c.ipa, pos: c.pos || 'phrase',
        exampleEn: c.example_en, exampleRu: c.example_ru, level: 'custom', topic: c.topic || 'custom', custom: true,
      };
    }
    return getStore().wordById.get(card.word_id) || null;
  }

  app.get('/api/srs/queue', async (req) => {
    const uid = req.user.uid;
    const newPerDay = Number(getSetting(uid, 'newPerDay', '12'));
    const now = new Date().toISOString();
    const dueCards = db.prepare(
      `SELECT * FROM srs_cards WHERE user_id = ? AND state != 'new' AND due <= ? ORDER BY due ASC LIMIT 100`
    ).all(uid, now);
    const newCards = db.prepare(
      `SELECT * FROM srs_cards WHERE user_id = ? AND state = 'new' ORDER BY created_at ASC LIMIT ?`
    ).all(uid, newPerDay);
    const cards = [...dueCards, ...newCards]
      .map((c) => {
        const w = resolveWord(c);
        return w ? { card: { id: c.id, wordId: c.word_id, state: c.state, reps: c.reps, source: c.source }, word: w } : null;
      })
      .filter(Boolean);
    return { cards, counts: { due: dueCards.length, new: newCards.length } };
  });

  app.post('/api/srs/review', async (req, reply) => {
    const { wordId, rating } = req.body || {};
    if (!['again', 'hard', 'good', 'easy'].includes(rating)) return reply.code(400).send({ error: 'bad rating' });
    const card = db.prepare('SELECT * FROM srs_cards WHERE user_id = ? AND word_id = ?').get(req.user.uid, wordId);
    if (!card) return reply.code(404).send({ error: 'no card' });
    const next = schedule(card, rating);
    db.prepare(
      `UPDATE srs_cards SET ease=?, interval=?, reps=?, lapses=?, state=?, due=?, last_review=datetime('now') WHERE id=?`
    ).run(next.ease, next.interval, next.reps, next.lapses, next.state, next.due, card.id);
    bumpActivity(req.user.uid, 'reviews');
    awardXP(req.user.uid, rating === 'again' ? 1 : 5);
    return { ok: true, due: next.due, state: next.state };
  });

  function addCard(uid, wordId, source = 'content') {
    db.prepare(
      `INSERT INTO srs_cards (user_id, word_id, source, state, due) VALUES (?, ?, ?, 'new', datetime('now'))
       ON CONFLICT(user_id, word_id) DO NOTHING`
    ).run(uid, wordId, source);
  }

  app.post('/api/srs/add', async (req) => {
    const { wordId, wordIds } = req.body || {};
    const ids = wordIds || (wordId ? [wordId] : []);
    let added = 0;
    for (const id of ids) {
      const source = String(id).startsWith('custom:') ? 'custom' : 'content';
      addCard(req.user.uid, id, source);
      added++;
    }
    return { ok: true, added };
  });

  app.post('/api/srs/add-set', async (req) => {
    const { category, topic, level } = req.body || {};
    let words = getStore().words;
    if (category) words = words.filter((w) => w.category === category);
    if (topic) words = words.filter((w) => w.topic === topic);
    if (level) words = words.filter((w) => w.level === level);
    for (const w of words) addCard(req.user.uid, w.id, 'content');
    return { ok: true, added: words.length };
  });

  app.delete('/api/srs/:wordId', async (req) => {
    db.prepare('DELETE FROM srs_cards WHERE user_id = ? AND word_id = ?').run(req.user.uid, req.params.wordId);
    return { ok: true };
  });

  app.get('/api/srs/stats', async (req) => {
    const uid = req.user.uid;
    const now = new Date().toISOString();
    const row = db.prepare(
      `SELECT
        COUNT(*) total,
        SUM(CASE WHEN state='new' THEN 1 ELSE 0 END) new,
        SUM(CASE WHEN state='learning' THEN 1 ELSE 0 END) learning,
        SUM(CASE WHEN state='review' THEN 1 ELSE 0 END) review,
        SUM(CASE WHEN state!='new' AND due <= ? THEN 1 ELSE 0 END) due
       FROM srs_cards WHERE user_id = ?`
    ).get(now, uid);
    return row;
  });

  // ---------------- Custom words + translator ----------------
  app.get('/api/custom-words', async (req) =>
    db.prepare('SELECT * FROM custom_words WHERE user_id = ? ORDER BY created_at DESC').all(req.user.uid));

  app.post('/api/custom-words', async (req) => {
    const { word, ru, ipa, pos, exampleEn, exampleRu, topic, addToSrs } = req.body || {};
    const id = `custom:${req.user.username}:${slugify(word)}`;
    db.prepare(
      `INSERT INTO custom_words (id, user_id, word, ru, ipa, pos, example_en, example_ru, topic)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET ru=excluded.ru, ipa=excluded.ipa, example_en=excluded.example_en, example_ru=excluded.example_ru`
    ).run(id, req.user.uid, word, ru ?? null, ipa ?? null, pos ?? null, exampleEn ?? null, exampleRu ?? null, topic ?? null);
    if (addToSrs) addCard(req.user.uid, id, 'custom');
    return { ok: true, id };
  });

  app.delete('/api/custom-words/:id', async (req) => {
    db.prepare('DELETE FROM custom_words WHERE id = ? AND user_id = ?').run(req.params.id, req.user.uid);
    db.prepare('DELETE FROM srs_cards WHERE word_id = ? AND user_id = ?').run(req.params.id, req.user.uid);
    return { ok: true };
  });

  app.post('/api/translate', async (req, reply) => {
    const { text, context } = req.body || {};
    if (!text) return reply.code(400).send({ error: 'no text' });
    let { source, target } = req.body || {};
    if (!source || source === 'auto') {
      const hasCyr = /[а-яё]/i.test(text);
      source = hasCyr ? 'ru' : 'en';
    }
    if (!target) target = source === 'ru' ? 'en' : 'ru';
    const cacheKey = `${source}|${target}|${String(text).trim().toLowerCase()}|${String(context || '').trim().toLowerCase()}`;
    const cached = db.prepare('SELECT translation, note, provider FROM translations_cache WHERE key = ?').get(cacheKey);
    if (cached) {
      return { translation: cached.translation, alternatives: [], note: cached.note || '', provider: cached.provider, source, target, cached: true };
    }
    const result = await translate(text, source, target, context);
    if (result?.translation && result.provider && result.provider !== 'none') {
      try {
        db.prepare('INSERT INTO translations_cache (key, translation, note, provider) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO NOTHING')
          .run(cacheKey, result.translation, result.note || '', result.provider);
      } catch { /* ignore cache write errors */ }
    }
    return { ...result, source, target };
  });

  app.get('/api/define', async (req, reply) => {
    const word = req.query?.word;
    if (!word) return reply.code(400).send({ error: 'no word' });
    return await define(word);
  });

  // AI writing feedback — automates the "handwrite → screenshot → tutor grades" loop.
  app.post('/api/check-writing', async (req, reply) => {
    const { text, task, mode } = req.body || {};
    const clean = String(text || '').trim();
    if (clean.length < 10) return reply.code(400).send({ error: 'too short' });
    if (clean.length > 6000) return reply.code(400).send({ error: 'too long' });
    if (!process.env.LLM_TRANSLATE_URL) return reply.code(503).send({ error: 'AI feedback is not configured' });
    const result = await checkWriting({
      text: clean,
      task: String(task || '').slice(0, 1000),
      mode: ['free', 'task1', 'task2', 'speaking'].includes(mode) ? mode : 'free',
      level: 'A1-A2',
    });
    if (!result) return reply.code(502).send({ error: 'AI feedback temporarily unavailable' });
    // Reward the effort of producing language — the hardest, most valuable practice.
    try { awardXP(req.user.uid, 15); bumpActivity(req.user.uid); } catch { /* non-fatal */ }
    return result;
  });

  // ---------------- Progress (mastery tracker) ----------------
  app.get('/api/progress', async (req) =>
    db.prepare('SELECT * FROM progress WHERE user_id = ? ORDER BY updated_at DESC').all(req.user.uid));

  app.put('/api/progress/:topicId', async (req) => {
    const { status, note, scheduleReview } = req.body || {};
    const existing = db.prepare('SELECT * FROM progress WHERE user_id = ? AND topic_id = ?').get(req.user.uid, req.params.topicId);
    let review_due = existing?.review_due ?? null;
    let review_step = existing?.review_step ?? 0;
    if (status === 'confident' && scheduleReview) {
      const r = topicNextReview(0);
      review_due = r.due; review_step = 0;
    }
    db.prepare(
      `INSERT INTO progress (user_id, topic_id, status, note, review_due, review_step, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id, topic_id) DO UPDATE SET
         status=excluded.status, note=excluded.note, review_due=excluded.review_due,
         review_step=excluded.review_step, updated_at=datetime('now')`
    ).run(req.user.uid, req.params.topicId, status || 'learning', note ?? null, review_due, review_step);
    return { ok: true };
  });

  // ---------------- Error log ----------------
  app.get('/api/errors', async (req) => {
    const status = req.query?.status;
    const q = status
      ? db.prepare('SELECT * FROM error_log WHERE user_id = ? AND status = ? ORDER BY updated_at DESC')
      : db.prepare('SELECT * FROM error_log WHERE user_id = ? ORDER BY updated_at DESC');
    return status ? q.all(req.user.uid, status) : q.all(req.user.uid);
  });

  app.post('/api/errors', async (req) => {
    const { wrong, correct, rule, tags, source } = req.body || {};
    // if an identical "wrong" already open, bump hits instead of duplicating
    const existing = db.prepare(
      "SELECT id FROM error_log WHERE user_id = ? AND wrong = ? AND status = 'open'"
    ).get(req.user.uid, wrong || '');
    if (existing) {
      db.prepare("UPDATE error_log SET hits = hits + 1, updated_at = datetime('now') WHERE id = ?").run(existing.id);
      return { ok: true, id: existing.id, bumped: true };
    }
    const info = db.prepare(
      'INSERT INTO error_log (user_id, wrong, correct, rule, tags, source) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(req.user.uid, wrong || '', correct || '', rule ?? null, Array.isArray(tags) ? tags.join(',') : (tags ?? null), source ?? 'manual');
    return { ok: true, id: info.lastInsertRowid };
  });

  app.put('/api/errors/:id', async (req) => {
    const { wrong, correct, rule, tags, status } = req.body || {};
    db.prepare(
      `UPDATE error_log SET
        wrong=COALESCE(?, wrong), correct=COALESCE(?, correct), rule=COALESCE(?, rule),
        tags=COALESCE(?, tags), status=COALESCE(?, status), updated_at=datetime('now')
       WHERE id=? AND user_id=?`
    ).run(wrong ?? null, correct ?? null, rule ?? null, Array.isArray(tags) ? tags.join(',') : (tags ?? null), status ?? null, req.params.id, req.user.uid);
    return { ok: true };
  });

  app.delete('/api/errors/:id', async (req) => {
    db.prepare('DELETE FROM error_log WHERE id = ? AND user_id = ?').run(req.params.id, req.user.uid);
    return { ok: true };
  });

  // ---------------- Warm-up (assembled session) ----------------
  app.get('/api/warmup', async (req) => {
    const uid = req.user.uid;
    const now = new Date().toISOString();
    const errors = db.prepare(
      "SELECT id, wrong, correct, rule FROM error_log WHERE user_id = ? AND status = 'open' ORDER BY hits DESC, updated_at DESC LIMIT 5"
    ).all(uid);
    const dueTopics = db.prepare(
      'SELECT topic_id, status FROM progress WHERE user_id = ? AND review_due IS NOT NULL AND review_due <= ? LIMIT 5'
    ).all(uid, now);
    const dueWords = db.prepare(
      "SELECT word_id, source FROM srs_cards WHERE user_id = ? AND state != 'new' AND due <= ? ORDER BY due ASC LIMIT 5"
    ).all(uid, now);
    const grammar = getStore().grammarById;
    return {
      errors,
      topics: dueTopics.map((t) => ({ id: t.topic_id, status: t.status, title: grammar.get(t.topic_id)?.title || t.topic_id })),
      words: dueWords.map((c) => {
        const w = c.source === 'custom'
          ? db.prepare('SELECT id, word, ru FROM custom_words WHERE id = ?').get(c.word_id)
          : getStore().wordById.get(c.word_id);
        return w ? { id: w.id, word: w.word, ru: w.ru } : null;
      }).filter(Boolean),
    };
  });

  // ---------------- Dashboard ----------------
  app.get('/api/dashboard', async (req) => {
    const uid = req.user.uid;
    const now = new Date().toISOString();
    const srs = db.prepare(
      `SELECT COUNT(*) total, SUM(CASE WHEN state!='new' AND due<=? THEN 1 ELSE 0 END) due,
              SUM(CASE WHEN state='new' THEN 1 ELSE 0 END) new FROM srs_cards WHERE user_id=?`
    ).get(now, uid);
    const openErrors = db.prepare("SELECT COUNT(*) c FROM error_log WHERE user_id=? AND status='open'").get(uid).c;
    const lessons = getStore().lessons.filter((l) => l.kind !== 'reading');
    const lessonIds = new Set(lessons.map((l) => l.id));
    const attemptedIds = db.prepare('SELECT DISTINCT lesson_id FROM lesson_attempts WHERE user_id=?').all(uid).map((r) => r.lesson_id);
    const lessonsDone = attemptedIds.filter((id) => lessonIds.has(id)).length;
    const days = db.prepare('SELECT day FROM activity WHERE user_id=? ORDER BY day DESC LIMIT 60').all(uid).map((r) => r.day);
    const { xp } = db.prepare('SELECT xp FROM users WHERE id=?').get(uid) || { xp: 0 };
    const { level, levelXp, nextLevelXp } = xpLevel(xp);
    return {
      user: req.user,
      streak: computeStreak(days),
      xp, level, levelXp, nextLevelXp,
      srs: { total: srs.total || 0, due: srs.due || 0, new: srs.new || 0 },
      openErrors,
      lessonsDone,
      lessonsTotal: lessons.length,
      activeDays: days.slice(0, 14),
    };
  });

  // ---------------- Study plan & pacing ----------------
  app.get('/api/plan', async (req) => {
    const uid = req.user.uid;
    const store = getStore();
    const rows = db.prepare(
      'SELECT lesson_id, COUNT(DISTINCT exercise_id) attempted FROM lesson_attempts WHERE user_id=? GROUP BY lesson_id'
    ).all(uid);
    const attemptedMap = new Map(rows.map((r) => [r.lesson_id, r.attempted]));

    const phases = new Map();
    for (const l of store.lessons) {
      if (l.kind === 'reading') continue; // reading texts are a separate track
      const total = l.exercises.length;
      const att = attemptedMap.get(l.id) || 0;
      const done = total > 0 && att >= total;
      const p = l.phase ?? 0;
      if (!phases.has(p)) phases.set(p, { phase: p, lessons: [], done: 0, total: 0 });
      const bucket = phases.get(p);
      bucket.lessons.push({ id: l.id, title: l.title, level: l.level, exerciseCount: total, attempted: att, done });
      bucket.total++;
      if (done) bucket.done++;
    }

    const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const studyDaysThisWeek = db.prepare('SELECT COUNT(*) c FROM activity WHERE user_id=? AND day>=?').get(uid, since).c;
    const lessonsThisWeek = db.prepare(
      'SELECT COUNT(DISTINCT lesson_id) c FROM lesson_attempts WHERE user_id=? AND date(created_at)>=?'
    ).get(uid, since).c;
    const srsTotal = db.prepare('SELECT COUNT(*) c FROM srs_cards WHERE user_id=?').get(uid).c;
    const firstDay = db.prepare('SELECT MIN(day) d FROM activity WHERE user_id=?').get(uid)?.d || null;

    const phaseList = [...phases.values()].sort((a, b) => a.phase - b.phase);
    const totalDone = phaseList.reduce((s, p) => s + p.done, 0);

    return {
      phases: phaseList,
      totalDone,
      totalLessons: store.lessons.length,
      studyDaysThisWeek,
      lessonsThisWeek,
      srsTotal,
      firstDay,
    };
  });

  // ---------------- Gamification ----------------
  app.get('/api/gamification', async (req) => {
    const uid = req.user.uid;
    const { xp } = db.prepare('SELECT xp FROM users WHERE id=?').get(uid) || { xp: 0 };
    const { level, levelXp, nextLevelXp } = xpLevel(xp);
    const days = db.prepare('SELECT day FROM activity WHERE user_id=? ORDER BY day DESC').all(uid).map((r) => r.day);
    const streak = computeStreak(days);
    const longestStreak = computeLongestStreak(days);
    db.prepare('UPDATE users SET longest_streak = MAX(COALESCE(longest_streak,0), ?) WHERE id=?').run(longestStreak, uid);
    const ex = db.prepare('SELECT COUNT(*) total, SUM(correct) correct FROM lesson_attempts WHERE user_id=?').get(uid);
    const lessonsDone = db.prepare('SELECT COUNT(DISTINCT lesson_id) c FROM lesson_attempts WHERE user_id=?').get(uid).c;
    const srsTotal = db.prepare('SELECT COUNT(*) c FROM srs_cards WHERE user_id=?').get(uid).c;
    const stats = { xp, level, streak, longestStreak, totalExercises: ex?.total || 0, totalCorrect: ex?.correct || 0, lessonsDone, srsTotal };
    const badges = BADGES_DEF.map(({ req: check, ...b }) => ({ ...b, earned: check(stats) }));
    return { xp, level, levelXp, nextLevelXp, streak, longestStreak, badges };
  });

  // ---------------- Settings ----------------
  app.get('/api/settings', async (req) => {
    const rows = db.prepare('SELECT key, value FROM settings WHERE user_id = ?').all(req.user.uid);
    const out = { newPerDay: 12 };
    for (const r of rows) out[r.key] = isNaN(Number(r.value)) ? r.value : Number(r.value);
    return out;
  });

  app.put('/api/settings', async (req) => {
    for (const [k, v] of Object.entries(req.body || {})) {
      db.prepare(
        `INSERT INTO settings (user_id, key, value) VALUES (?, ?, ?)
         ON CONFLICT(user_id, key) DO UPDATE SET value=excluded.value`
      ).run(req.user.uid, k, String(v));
    }
    return { ok: true };
  });

  // ---------------- Account (self) ----------------
  app.post('/api/account/password', async (req, reply) => {
    const { oldPassword, newPassword } = req.body || {};
    if (!newPassword || String(newPassword).length < 4) return reply.code(400).send({ error: 'newPassword too short' });
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.uid);
    if (!u || !verifyPassword(oldPassword || '', u.password)) return reply.code(403).send({ error: 'wrong current password' });
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashPassword(newPassword), req.user.uid);
    return { ok: true };
  });

  // ---------------- Admin ----------------
  app.get('/api/admin/users', async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    const rows = db.prepare(`
      SELECT u.id, u.username, u.display_name, u.role, u.created_at, COALESCE(u.xp,0) AS xp,
             (SELECT COUNT(*) FROM srs_cards s WHERE s.user_id=u.id) AS words,
             (SELECT COUNT(*) FROM lesson_attempts l WHERE l.user_id=u.id) AS attempts,
             (SELECT COUNT(*) FROM lesson_attempts l WHERE l.user_id=u.id AND l.correct=1) AS correct,
             (SELECT COUNT(DISTINCT l.lesson_id) FROM lesson_attempts l WHERE l.user_id=u.id) AS lessonsTouched,
             (SELECT COUNT(*) FROM error_log e WHERE e.user_id=u.id AND e.status='open') AS openErrors,
             (SELECT MAX(day) FROM activity a WHERE a.user_id=u.id) AS lastActive,
             (SELECT COUNT(*) FROM activity a WHERE a.user_id=u.id) AS activeDays
      FROM users u ORDER BY u.id`).all();
    // Fully-completed lessons require comparing attempted-distinct to each lesson's exercise count.
    const store = getStore();
    const exCount = new Map(store.lessons.map((l) => [l.id, l.exercises.length]));
    return rows.map((u) => {
      const done = db.prepare(
        'SELECT lesson_id, COUNT(DISTINCT exercise_id) a FROM lesson_attempts WHERE user_id=? GROUP BY lesson_id'
      ).all(u.id).filter((r) => exCount.get(r.lesson_id) && r.a >= exCount.get(r.lesson_id)).length;
      const { level } = xpLevel(u.xp);
      const days = db.prepare('SELECT day FROM activity WHERE user_id=? ORDER BY day DESC').all(u.id).map((r) => r.day);
      return { ...u, lessonsDone: done, lessonsTotal: store.lessons.length, level, streak: computeStreak(days) };
    });
  });

  app.post('/api/admin/users', async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    const { username, name, password, role } = req.body || {};
    if (!username || !password) return reply.code(400).send({ error: 'username and password required' });
    const uname = String(username).toLowerCase().trim();
    if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(uname)) return reply.code(409).send({ error: 'username already exists' });
    const info = db.prepare('INSERT INTO users (username, display_name, password, role) VALUES (?, ?, ?, ?)')
      .run(uname, name || uname, hashPassword(password), role === 'admin' ? 'admin' : 'user');
    return { ok: true, id: info.lastInsertRowid };
  });

  app.post('/api/admin/users/:id/password', async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    const { password } = req.body || {};
    if (!password || String(password).length < 4) return reply.code(400).send({ error: 'password too short' });
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashPassword(password), req.params.id);
    return { ok: true };
  });

  app.patch('/api/admin/users/:id', async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    const { name, role } = req.body || {};
    const id = Number(req.params.id);
    if (role && role !== 'admin') {
      const target = db.prepare('SELECT role FROM users WHERE id=?').get(id);
      if (target?.role === 'admin' && db.prepare("SELECT COUNT(*) c FROM users WHERE role='admin'").get().c <= 1) {
        return reply.code(400).send({ error: 'cannot demote the last admin' });
      }
    }
    db.prepare('UPDATE users SET display_name = COALESCE(?, display_name), role = COALESCE(?, role) WHERE id = ?')
      .run(name ?? null, role ?? null, id);
    return { ok: true };
  });

  app.delete('/api/admin/users/:id', async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    const id = Number(req.params.id);
    if (id === req.user.uid) return reply.code(400).send({ error: 'cannot delete yourself' });
    const target = db.prepare('SELECT role FROM users WHERE id=?').get(id);
    if (target?.role === 'admin' && db.prepare("SELECT COUNT(*) c FROM users WHERE role='admin'").get().c <= 1) {
      return reply.code(400).send({ error: 'cannot delete the last admin' });
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return { ok: true };
  });

  // ---------------- Push notifications ----------------
  app.get('/api/push/pubkey', async () => ({ key: publicKey(), enabled: pushEnabled() }));

  app.post('/api/push/subscribe', async (req, reply) => {
    const s = req.body?.subscription || req.body;
    if (!s?.endpoint || !s?.keys?.p256dh || !s?.keys?.auth) return reply.code(400).send({ error: 'bad subscription' });
    db.prepare(`INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id, p256dh=excluded.p256dh, auth=excluded.auth`)
      .run(req.user.uid, s.endpoint, s.keys.p256dh, s.keys.auth);
    return { ok: true };
  });

  app.post('/api/push/unsubscribe', async (req) => {
    const ep = req.body?.endpoint;
    if (ep) db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?').run(ep, req.user.uid);
    return { ok: true };
  });

  app.post('/api/push/test', async (req) => {
    await sendToUser(req.user.uid, { title: 'English Trainer', body: 'Уведомления работают! Жми, чтобы открыть.', url: '/' });
    return { ok: true };
  });

  // ---------------- Textbook (private PDF, auth-gated, HTTP range support) ----------------
  // The PDF is the user's own legal copy, kept private (never in the repo) and
  // served only to logged-in users. Path via TEXTBOOK_PDF env.
  const TEXTBOOK = process.env.TEXTBOOK_PDF || path.resolve(process.cwd(), '../private/textbook.pdf');

  app.get('/api/textbook/info', async () => {
    try { const st = fs.statSync(TEXTBOOK); return { available: true, size: st.size }; }
    catch { return { available: false }; }
  });

  app.get('/api/textbook/file', async (req, reply) => {
    return sendPdfFile(req, reply, TEXTBOOK, 'no textbook');
  });

  // ---------------- Library (private PDFs by CEFR level) ----------------
  // Put your own legal PDF copies into:
  //   private/library/A1/*.pdf, private/library/A2/*.pdf, private/library/B1/*.pdf, private/library/B2/*.pdf
  // Optional sidecar metadata: same basename as the PDF, with .json extension.
  const LIBRARY = process.env.LIBRARY_DIR || path.resolve(process.cwd(), '../private/library');

  app.get('/api/library/books', async () => ({
    levels: LIBRARY_LEVELS.map((level) => listLibraryLevel(LIBRARY, level)),
  }));

  app.get('/api/library/books/:level/:file/file', async (req, reply) => {
    const book = resolveLibraryBook(LIBRARY, req.params.level, req.params.file);
    if (!book) return reply.code(404).send({ error: 'book not found' });
    return sendPdfFile(req, reply, book.path, 'book not found');
  });

  // Serve cover image (stored next to PDF as <basename>.jpg/.png/.webp)
  app.get('/api/library/books/:level/:file/cover', async (req, reply) => {
    const level = String(req.params.level || '').toUpperCase();
    if (!LIBRARY_LEVELS.includes(level)) return reply.code(404).send({});
    const file = path.basename(String(req.params.file || ''));
    const dir = path.resolve(LIBRARY, level);
    const base = file.replace(/\.pdf$/i, '');
    for (const ext of ['.jpg', '.jpeg', '.webp', '.png']) {
      const imgPath = path.resolve(dir, base + ext);
      if (!imgPath.startsWith(dir + path.sep)) continue;
      try {
        const st = fs.statSync(imgPath);
        if (!st.isFile()) continue;
        const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
        reply.header('Content-Type', mime);
        reply.header('Cache-Control', 'private, max-age=86400');
        return reply.send(fs.createReadStream(imgPath));
      } catch { /* try next ext */ }
    }
    return reply.code(404).send({});
  });
}

// ---------------- helpers ----------------
const LIBRARY_LEVELS = ['A1', 'A2', 'B1', 'B2'];

function listLibraryLevel(root, level) {
  const dir = path.resolve(root, level);
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { /* no books yet */ }
  const books = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.pdf'))
    .map((e) => {
      const file = e.name;
      const filePath = path.join(dir, file);
      const st = fs.statSync(filePath);
      const meta = readBookMeta(dir, file);
      return {
        level,
        file,
        title: meta.title || titleFromFile(file),
        author: meta.author || '',
        description: meta.description || '',
        size: st.size,
        updatedAt: st.mtime.toISOString(),
        url: `/api/library/books/${encodeURIComponent(level)}/${encodeURIComponent(file)}/file`,
        coverUrl: hasCoverImage(dir, file) ? `/api/library/books/${encodeURIComponent(level)}/${encodeURIComponent(file)}/cover` : null,
        recommended: !!meta.recommended,
        tags: Array.isArray(meta.tags) ? meta.tags : [],
        pages: meta.pages || null,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title, 'ru'));
  return { level, title: level, count: books.length, books };
}

function resolveLibraryBook(root, rawLevel, rawFile) {
  const level = String(rawLevel || '').toUpperCase();
  if (!LIBRARY_LEVELS.includes(level)) return null;
  const file = path.basename(String(rawFile || ''));
  if (!file.toLowerCase().endsWith('.pdf')) return null;
  const dir = path.resolve(root, level);
  const filePath = path.resolve(dir, file);
  if (!filePath.startsWith(dir + path.sep)) return null;
  try {
    const st = fs.statSync(filePath);
    if (!st.isFile()) return null;
    return { level, file, path: filePath };
  } catch {
    return null;
  }
}

function weightedSample(items, n) {
  const result = [];
  const pool = items.map((item) => ({ ...item }));
  for (let i = 0; i < n && pool.length > 0; i++) {
    const total = pool.reduce((s, x) => s + x.weight, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (let j = 0; j < pool.length; j++) {
      r -= pool[j].weight;
      if (r <= 0) { idx = j; break; }
    }
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return result;
}

function hasCoverImage(dir, file) {
  const base = file.replace(/\.pdf$/i, '');
  for (const ext of ['.jpg', '.jpeg', '.webp', '.png']) {
    try { fs.statSync(path.join(dir, base + ext)); return true; } catch { /* try next */ }
  }
  return false;
}

function readBookMeta(dir, file) {
  const base = file.replace(/\.pdf$/i, '');
  const metaPath = path.join(dir, `${base}.json`);
  try {
    const raw = fs.readFileSync(metaPath, 'utf8');
    const meta = JSON.parse(raw);
    return {
      title: typeof meta.title === 'string' ? meta.title.trim() : '',
      author: typeof meta.author === 'string' ? meta.author.trim() : '',
      description: typeof meta.description === 'string' ? meta.description.trim() : '',
      cover: typeof meta.cover === 'string' ? meta.cover.trim() : '',
      recommended: !!meta.recommended,
      tags: Array.isArray(meta.tags) ? meta.tags.map(String) : [],
      pages: Number(meta.pages) || null,
    };
  } catch {
    return {};
  }
}

function titleFromFile(file) {
  return file
    .replace(/\.pdf$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sendPdfFile(req, reply, filePath, missingError) {
  let st;
  try { st = fs.statSync(filePath); } catch { return reply.code(404).send({ error: missingError }); }
  reply.header('Accept-Ranges', 'bytes');
  reply.header('Content-Type', 'application/pdf');
  reply.header('Cache-Control', 'private, max-age=86400');
  const range = req.headers.range;
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    let start = m && m[1] ? parseInt(m[1], 10) : 0;
    let end = m && m[2] ? parseInt(m[2], 10) : st.size - 1;
    if (isNaN(start)) start = 0;
    if (isNaN(end) || end >= st.size) end = st.size - 1;
    if (start > end) { reply.header('Content-Range', `bytes */${st.size}`); return reply.code(416).send(); }
    reply.code(206);
    reply.header('Content-Range', `bytes ${start}-${end}/${st.size}`);
    reply.header('Content-Length', end - start + 1);
    return reply.send(fs.createReadStream(filePath, { start, end }));
  }
  reply.header('Content-Length', st.size);
  return reply.send(fs.createReadStream(filePath));
}

function getSetting(uid, key, def) {
  const r = db.prepare('SELECT value FROM settings WHERE user_id = ? AND key = ?').get(uid, key);
  return r ? r.value : def;
}

const XP_THRESHOLDS = [0, 200, 500, 1000, 1800, 2800, 4200, 6000, 8500, 12000];
function xpLevel(xp) {
  let level = 1;
  for (let i = 1; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) level = i + 1;
  }
  level = Math.min(level, XP_THRESHOLDS.length);
  return { level, levelXp: XP_THRESHOLDS[level - 1], nextLevelXp: XP_THRESHOLDS[level] ?? null };
}

function computeLongestStreak(daysDesc) {
  if (!daysDesc.length) return 0;
  const sorted = [...daysDesc].sort();
  let max = 1, run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = Math.round((new Date(sorted[i]) - new Date(sorted[i - 1])) / 86400000);
    if (diff === 1) { run++; if (run > max) max = run; }
    else if (diff > 1) run = 1;
  }
  return max;
}

const BADGES_DEF = [
  { id: 'first_step',   emoji: '🚀', name: 'Первый шаг',       desc: 'сделал первое упражнение',      req: (s) => s.totalExercises >= 1 },
  { id: 'scholar',      emoji: '📚', name: '5 уроков',          desc: '5 уроков пройдено',             req: (s) => s.lessonsDone >= 5 },
  { id: 'master',       emoji: '🎓', name: 'Мастер',            desc: '15 уроков пройдено',            req: (s) => s.lessonsDone >= 15 },
  { id: 'week_fire',    emoji: '🔥', name: '7 дней',            desc: '7 дней занятий подряд',         req: (s) => s.longestStreak >= 7 },
  { id: 'month_fire',   emoji: '🏆', name: 'Месяц',             desc: '30 дней занятий подряд',        req: (s) => s.longestStreak >= 30 },
  { id: 'century',      emoji: '💯', name: 'Сотня',             desc: '100 правильных ответов',        req: (s) => s.totalCorrect >= 100 },
  { id: 'thousand',     emoji: '⚡', name: 'Тысяча',            desc: '1000 правильных ответов',       req: (s) => s.totalCorrect >= 1000 },
  { id: 'level5',       emoji: '⭐', name: 'Уровень 5',         desc: 'достиг 5-го уровня',            req: (s) => s.level >= 5 },
  { id: 'word_hoarder', emoji: '🗂️', name: 'Коллекционер',     desc: '50 слов в карточках',           req: (s) => s.srsTotal >= 50 },
  { id: 'polyglot',     emoji: '🌍', name: 'Полиглот',          desc: '300 слов в карточках',          req: (s) => s.srsTotal >= 300 },
];

function computeStreak(daysDesc) {
  if (!daysDesc.length) return 0;
  const set = new Set(daysDesc);
  let streak = 0;
  const d = new Date();
  // allow today OR yesterday to start the streak
  if (!set.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
  while (set.has(d.toISOString().slice(0, 10))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// Context-aware translation via any OpenAI-compatible chat API (opt-in).
// Returns null when not configured or on any error, so callers fall back to MT.
async function llmTranslate(text, source, target, context) {
  const url = process.env.LLM_TRANSLATE_URL;
  if (!url) return null;
  const key = process.env.LLM_TRANSLATE_KEY;
  const model = process.env.LLM_TRANSLATE_MODEL || 'gpt-4o-mini';
  const langName = (l) => (l === 'ru' ? 'Russian' : 'English');
  const sys =
    'You are a precise EN<->RU dictionary/translator for a language learner. '
    + 'Translate the given text to the target language, choosing the meaning that fits the context sentence if one is provided. '
    + 'Reply ONLY with compact JSON: {"translation": string, "note": string}. '
    + 'If the word is ambiguous, put the best-fitting translation in "translation" and briefly list the other common meanings in Russian (with a tiny cue) in "note"; otherwise "note" is "".';
  const user =
    `Translate from ${langName(source)} to ${langName(target)}.\n`
    + `Text: ${JSON.stringify(text)}\n`
    + `Context sentence (may be empty): ${JSON.stringify(context || '')}`;
  // gpt-5 / o-series are reasoning models: they reject custom temperature and
  // support reasoning_effort. Plain models (gpt-4o-mini, etc.) take temperature.
  const isReasoning = /^(gpt-5|o[1-9])/i.test(model);
  const body = {
    model,
    response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
  };
  if (isReasoning) body.reasoning_effort = 'low';
  else body.temperature = 0;
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const content = j?.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);
    if (!parsed.translation) return null;
    return {
      translation: String(parsed.translation),
      alternatives: [],
      note: parsed.note ? String(parsed.note).replace(/^\s*(ambig(uous)?|note|примечание|hint)\s*[:：\-—]\s*/i, '').trim() : '',
      provider: 'llm',
    };
  } catch {
    return null;
  }
}

async function translate(text, source, target, context) {
  // Best quality (opt-in): context-aware LLM translation. Falls through on any error.
  const viaLlm = await llmTranslate(text, source, target, context);
  if (viaLlm) return viaLlm;

  const lt = process.env.LIBRETRANSLATE_URL;
  if (lt) {
    try {
      const res = await fetch(`${lt.replace(/\/$/, '')}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, source, target, format: 'text', api_key: process.env.LIBRETRANSLATE_API_KEY || undefined }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const j = await res.json();
        if (j.translatedText) return { translation: j.translatedText, alternatives: [], provider: 'libretranslate' };
      }
    } catch { /* fall through */ }
  }
  // Fallback: MyMemory (free, no key)
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${source}|${target}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const j = await res.json();
    const translation = j?.responseData?.translatedText || '';
    const alternatives = (j?.matches || []).map((m) => m.translation).filter((t, i, a) => t && a.indexOf(t) === i).slice(0, 5);
    return { translation, alternatives, provider: 'mymemory' };
  } catch (e) {
    return { translation: '', alternatives: [], provider: 'none', error: 'translation unavailable' };
  }
}

async function define(word) {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { word, found: false };
    const j = await res.json();
    const entry = Array.isArray(j) ? j[0] : null;
    if (!entry) return { word, found: false };
    const phonetic = entry.phonetic || entry.phonetics?.find((p) => p.text)?.text || '';
    const audio = entry.phonetics?.find((p) => p.audio)?.audio || '';
    const meanings = (entry.meanings || []).slice(0, 3).map((m) => ({
      pos: m.partOfSpeech,
      definitions: (m.definitions || []).slice(0, 2).map((d) => d.definition),
      example: m.definitions?.find((d) => d.example)?.example || '',
    }));
    return { word, found: true, phonetic, audio, meanings };
  } catch {
    return { word, found: false };
  }
}

// AI writing feedback — the killer feature for productive skills.
// Calibrated for A1–A2 learners: prioritise the few most impactful errors,
// explain in Russian, stay encouraging. Reuses the same OpenAI-compatible
// endpoint as translation. Returns null when not configured / on any error.
async function checkWriting({ text, task = '', mode = 'free', level = 'A2' }) {
  const url = process.env.LLM_TRANSLATE_URL;
  if (!url) return null;
  const key = process.env.LLM_TRANSLATE_KEY;
  // A stronger model helps for nuanced feedback; allow override, default to translate model.
  const model = process.env.LLM_CHECK_MODEL || process.env.LLM_TRANSLATE_MODEL || 'gpt-4o-mini';
  const taskLabel = mode === 'task1' ? 'IELTS Writing Task 1 (chart description)'
    : mode === 'task2' ? 'IELTS Writing Task 2 (opinion essay)'
    : mode === 'speaking' ? 'IELTS Speaking (spoken-style answer, written down)'
    : 'free writing';
  const sys =
    'You are a warm, encouraging English tutor giving feedback to a Russian-speaking learner whose level is around ' + level + ' (beginner–elementary). '
    + 'Your job mirrors a human tutor correcting handwritten work. Be supportive and concrete. '
    + 'CRITICAL CALIBRATION: do NOT overwhelm. Pick only the 3–6 MOST IMPORTANT errors (the ones that most hurt clarity or are most worth learning at this level). Ignore minor style nitpicks. '
    + 'Explain every error in SIMPLE RUSSIAN. Always provide a fully corrected version that stays close to what the learner tried to say (do not rewrite at a much higher level — keep it natural but level-appropriate). '
    + 'Reply ONLY with compact JSON matching this exact shape: '
    + '{"corrected": string, "level": string, "band": string, "summary": string, "errors": [{"original": string, "fixed": string, "explanation": string, "type": string}], "strengths": [string], "tip": string}. '
    + '"summary" = one warm sentence in Russian. "errors[].explanation" in Russian. "errors[].type" one of: grammar|vocab|spelling|word order|article|preposition|tense|punctuation. '
    + '"strengths" = 1–3 short Russian phrases on what was done well. "tip" = one actionable next-step tip in Russian. '
    + '"level" = estimated CEFR of THIS text (A1/A2/B1/...). "band" = approximate IELTS band as a string like "4.5" ONLY if this is an IELTS task, else "". '
    + 'Keep the JSON small; do not include markdown.';
  const user =
    `Task type: ${taskLabel}.\n`
    + (task ? `Prompt the learner was answering: ${JSON.stringify(task)}\n` : '')
    + `Learner's text:\n${JSON.stringify(text)}`;
  const isReasoning = /^(gpt-5|o[1-9])/i.test(model);
  const body = {
    model,
    response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
  };
  if (isReasoning) body.reasoning_effort = 'medium';
  else body.temperature = 0.2;
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const content = j?.choices?.[0]?.message?.content;
    if (!content) return null;
    const p = JSON.parse(content);
    if (!p.corrected) return null;
    return {
      corrected: String(p.corrected),
      level: String(p.level || ''),
      band: String(p.band || ''),
      summary: String(p.summary || ''),
      errors: Array.isArray(p.errors) ? p.errors.slice(0, 8).map((e) => ({
        original: String(e.original || ''),
        fixed: String(e.fixed || ''),
        explanation: String(e.explanation || ''),
        type: String(e.type || 'grammar'),
      })) : [],
      strengths: Array.isArray(p.strengths) ? p.strengths.slice(0, 3).map(String) : [],
      tip: String(p.tip || ''),
      provider: 'llm',
    };
  } catch {
    return null;
  }
}
