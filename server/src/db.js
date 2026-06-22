import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { hashPassword } from './util.js';

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'app.db');

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Web Push subscriptions (one per device per user)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Spaced-repetition card per (user, word). word_id refers to a content vocab id OR a custom word id.
CREATE TABLE IF NOT EXISTS srs_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'content',  -- 'content' | 'custom'
  ease REAL NOT NULL DEFAULT 2.5,
  interval INTEGER NOT NULL DEFAULT 0,      -- days
  reps INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  state TEXT NOT NULL DEFAULT 'new',        -- new | learning | review
  due TEXT NOT NULL DEFAULT (datetime('now')),
  last_review TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, word_id)
);
CREATE INDEX IF NOT EXISTS idx_srs_due ON srs_cards(user_id, due);

-- Words the user added manually (e.g. via the translator)
CREATE TABLE IF NOT EXISTS custom_words (
  id TEXT PRIMARY KEY,           -- e.g. custom:<user>:<slug>
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  ru TEXT,
  ipa TEXT,
  pos TEXT,
  example_en TEXT,
  example_ru TEXT,
  topic TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Mastery per grammar/lesson topic (the progress tracker)
CREATE TABLE IF NOT EXISTS progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'learning', -- learning(🌱) | consolidating(🔧) | confident(✅)
  note TEXT,
  review_due TEXT,                 -- next spaced review of this topic
  review_step INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, topic_id)
);

-- Personal error log (bug-tracker style)
CREATE TABLE IF NOT EXISTS error_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wrong TEXT NOT NULL,
  correct TEXT NOT NULL,
  rule TEXT,
  tags TEXT,                       -- comma separated
  status TEXT NOT NULL DEFAULT 'open', -- open | fixed
  source TEXT,                     -- lesson:<id> | exercise | manual | translator
  hits INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_err_user ON error_log(user_id, status);

-- Per-exercise attempts (lesson progress + analytics)
CREATE TABLE IF NOT EXISTS lesson_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  correct INTEGER NOT NULL,
  answer TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, lesson_id, exercise_id)
);

-- Daily activity for streaks
CREATE TABLE IF NOT EXISTS activity (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,               -- YYYY-MM-DD
  reviews INTEGER NOT NULL DEFAULT 0,
  exercises INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);

CREATE TABLE IF NOT EXISTS settings (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  PRIMARY KEY (user_id, key)
);

-- Cache of translations (keyed by source|target|text|context) to avoid re-calling
-- the LLM/MT for the same phrase.
CREATE TABLE IF NOT EXISTS translations_cache (
  key TEXT PRIMARY KEY,
  translation TEXT NOT NULL,
  note TEXT,
  provider TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// ---------- Migrations for pre-existing DBs ----------
const userCols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
if (!userCols.includes('role')) {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
}
if (!userCols.includes('xp')) {
  db.exec('ALTER TABLE users ADD COLUMN xp INTEGER NOT NULL DEFAULT 0');
}
if (!userCols.includes('longest_streak')) {
  db.exec('ALTER TABLE users ADD COLUMN longest_streak INTEGER NOT NULL DEFAULT 0');
}

// ---------- Seed users ----------
export function seedUsers() {
  let seed = [];
  if (process.env.SEED_USERS) {
    try {
      seed = JSON.parse(process.env.SEED_USERS);
    } catch (e) {
      console.error('Invalid SEED_USERS JSON:', e.message);
    }
  }
  if (!seed.length) {
    // Local-dev defaults. CHANGE in production via SEED_USERS env.
    seed = [
      { username: 'vadim', name: 'Вадим', password: 'vadim' },
      { username: 'alena', name: 'Алена', password: 'alena' },
    ];
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️  No SEED_USERS set in production — using insecure defaults!');
    }
  }
  const exists = db.prepare('SELECT id FROM users WHERE username = ?');
  const insert = db.prepare(
    'INSERT INTO users (username, display_name, password, role) VALUES (?, ?, ?, ?)'
  );
  for (const u of seed) {
    if (!u.username || !u.password) continue;
    if (exists.get(u.username)) continue;
    insert.run(u.username, u.name || u.username, hashPassword(u.password), u.role === 'admin' ? 'admin' : 'user');
    console.log(`Seeded user: ${u.username}`);
  }

  // Promote admins from env (comma-separated usernames), e.g. ADMIN_USERNAMES=vadim
  const adminEnv = (process.env.ADMIN_USERNAMES || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  for (const name of adminEnv) {
    db.prepare("UPDATE users SET role='admin' WHERE username=?").run(name);
  }
  // Guarantee at least one admin exists (promote the first account).
  const hasAdmin = db.prepare("SELECT 1 FROM users WHERE role='admin' LIMIT 1").get();
  if (!hasAdmin) {
    db.prepare("UPDATE users SET role='admin' WHERE id=(SELECT MIN(id) FROM users)").run();
  }
}

export function awardXP(userId, amount) {
  db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?').run(amount, userId);
}

export function bumpActivity(userId, field = 'exercises') {
  // Whitelist the column — it's interpolated into SQL and some callers omit it.
  const col = field === 'reviews' ? 'reviews' : 'exercises';
  const day = new Date().toISOString().slice(0, 10);
  db.prepare(
    `INSERT INTO activity (user_id, day, ${col}) VALUES (?, ?, 1)
     ON CONFLICT(user_id, day) DO UPDATE SET ${col} = ${col} + 1`
  ).run(userId, day);
}
