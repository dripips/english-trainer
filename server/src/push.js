import webpush from 'web-push';
import { db } from './db.js';

let enabled = false;

export function initPush() {
  const pub = process.env.VAPID_PUBLIC;
  const priv = process.env.VAPID_PRIVATE;
  if (pub && priv) {
    try {
      webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', pub, priv);
      enabled = true;
      console.log('Web Push enabled.');
    } catch (e) {
      console.error('Web Push init failed:', e.message);
    }
  } else {
    console.warn('Web Push disabled (set VAPID_PUBLIC / VAPID_PRIVATE to enable).');
  }
  return enabled;
}

export function pushEnabled() { return enabled; }
export function publicKey() { return process.env.VAPID_PUBLIC || ''; }

export async function sendToUser(userId, payload) {
  if (!enabled) return 0;
  const subs = db.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?').all(userId);
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload)
      );
      sent++;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(s.id);
      }
    }
  }
  return sent;
}

// Daily study reminder. Checks every 5 minutes.
export function startReminderScheduler() {
  if (!enabled) return;
  setInterval(() => {
    try { runReminders(); } catch (e) { console.error('reminder error:', e.message); }
  }, 5 * 60 * 1000);
}

function setting(userId, key, def) {
  const r = db.prepare('SELECT value FROM settings WHERE user_id = ? AND key = ?').get(userId, key);
  return r ? r.value : def;
}

function runReminders() {
  const now = new Date();
  const utcToday = now.toISOString().slice(0, 10);
  const users = db.prepare('SELECT DISTINCT user_id FROM push_subscriptions').all();
  for (const { user_id } of users) {
    if (setting(user_id, 'remindersEnabled', '1') !== '1') continue;
    const hour = Number(setting(user_id, 'reminderHour', '19'));
    const tzOffset = Number(setting(user_id, 'tzOffsetMin', '0')); // minutes to add to UTC for local time
    const local = new Date(now.getTime() + tzOffset * 60000);
    if (local.getUTCHours() !== hour) continue;
    const localDay = local.toISOString().slice(0, 10);
    if (setting(user_id, 'lastReminded', '') === localDay) continue;
    // mark as reminded for today regardless, to avoid repeats
    db.prepare(`INSERT INTO settings (user_id, key, value) VALUES (?, 'lastReminded', ?)
      ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value`).run(user_id, localDay);
    // skip if already studied today
    const active = db.prepare('SELECT 1 FROM activity WHERE user_id = ? AND day = ? AND (reviews > 0 OR exercises > 0)').get(user_id, utcToday);
    if (active) continue;
    sendToUser(user_id, { title: 'English Trainer', body: 'Пора позаниматься английским — 10 минут сегодня 🇬🇧', url: '/' });
  }
}
