import crypto from 'node:crypto';

// ---------- Password hashing (scrypt, no native deps) ----------
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(password, salt, 64);
  const ref = Buffer.from(hash, 'hex');
  return ref.length === test.length && crypto.timingSafeEqual(ref, test);
}

// ---------- Tiny JWT (HS256) ----------
function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}
function b64urlJSON(obj) {
  return b64url(JSON.stringify(obj));
}

export function signToken(payload, secret, ttlSeconds = 60 * 60 * 24 * 30) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + ttlSeconds };
  const data = `${b64urlJSON(header)}.${b64urlJSON(body)}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyToken(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts;
  const expected = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
  return payload;
}

// ---------- Answer normalization ----------
// Grade grammar/meaning only: ignore case, apostrophes, surrounding punctuation,
// curly quotes and extra whitespace. (Vadim & Alena know writing mechanics.)
export function normalizeAnswer(s) {
  if (s == null) return '';
  return String(s)
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/['"]/g, '')
    .replace(/[.,!?;:…]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function answerMatches(given, accepted) {
  const g = normalizeAnswer(given);
  if (!g) return false;
  const list = Array.isArray(accepted) ? accepted : [accepted];
  return list.some((a) => normalizeAnswer(a) === g);
}

// ---------- Misc ----------
export function todayStr(d = new Date()) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

export function slugify(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
