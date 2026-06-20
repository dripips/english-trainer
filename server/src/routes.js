import { db, bumpActivity } from './db.js';
import { getStore, lessonMeta } from './content.js';
import { schedule, topicNextReview } from './srs.js';
import {
  verifyPassword, signToken, verifyToken, answerMatches, slugify,
} from './util.js';

const SECRET = process.env.AUTH_SECRET || 'dev-insecure-secret-change-me';
const COOKIE = 'et_token';
const isProd = process.env.NODE_ENV === 'production';

function setAuthCookie(reply, token) {
  reply.setCookie(COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: isProd, path: '/',
    maxAge: 60 * 60 * 24 * 30,
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
    req.user = { uid: payload.uid, username: payload.username, name: payload.name };
  });

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
    const token = signToken({ uid: u.id, username: u.username, name: u.display_name }, SECRET);
    setAuthCookie(reply, token);
    return { user: { id: u.id, username: u.username, name: u.display_name } };
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
    return { ok: true };
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
    const { text } = req.body || {};
    if (!text) return reply.code(400).send({ error: 'no text' });
    let { source, target } = req.body || {};
    if (!source || source === 'auto') {
      const hasCyr = /[а-яё]/i.test(text);
      source = hasCyr ? 'ru' : 'en';
    }
    if (!target) target = source === 'ru' ? 'en' : 'ru';
    const result = await translate(text, source, target);
    return { ...result, source, target };
  });

  app.get('/api/define', async (req, reply) => {
    const word = req.query?.word;
    if (!word) return reply.code(400).send({ error: 'no word' });
    return await define(word);
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
    ).all(now, uid);
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
    const lessonsDone = db.prepare('SELECT COUNT(DISTINCT lesson_id) c FROM lesson_attempts WHERE user_id=?').get(uid).c;
    const days = db.prepare('SELECT day FROM activity WHERE user_id=? ORDER BY day DESC LIMIT 60').all(uid).map((r) => r.day);
    return {
      user: req.user,
      streak: computeStreak(days),
      srs: { total: srs.total || 0, due: srs.due || 0, new: srs.new || 0 },
      openErrors,
      lessonsDone,
      lessonsTotal: getStore().lessons.length,
      activeDays: days.slice(0, 14),
    };
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
}

// ---------------- helpers ----------------
function getSetting(uid, key, def) {
  const r = db.prepare('SELECT value FROM settings WHERE user_id = ? AND key = ?').get(uid, key);
  return r ? r.value : def;
}

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

async function translate(text, source, target) {
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
