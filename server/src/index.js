import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import fstatic from '@fastify/static';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { seedUsers } from './db.js';
import { loadContent, CONTENT_DIR } from './content.js';
import { registerRoutes } from './routes.js';
import { initPush, startReminderScheduler } from './push.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const WEB_DIST = process.env.WEB_DIST || path.resolve(__dirname, '../../web/dist');

const app = Fastify({ logger: { level: process.env.LOG_LEVEL || 'info' }, bodyLimit: 1_000_000 });

await app.register(cookie, { secret: process.env.COOKIE_SECRET || process.env.AUTH_SECRET || 'dev-cookie-secret' });

// No indexing — ever.
app.addHook('onSend', async (req, reply, payload) => {
  reply.header('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return payload;
});

seedUsers();
loadContent();
initPush();
startReminderScheduler();

// Hot reload content in dev
if (process.env.NODE_ENV !== 'production') {
  try {
    let t;
    fs.watch(CONTENT_DIR, { recursive: true }, () => {
      clearTimeout(t);
      t = setTimeout(() => { try { loadContent(); } catch (e) { app.log.error(e); } }, 300);
    });
  } catch { /* recursive watch may be unsupported; ignore */ }
}

await registerRoutes(app);

// Serve built frontend (production) with SPA fallback
if (fs.existsSync(WEB_DIST)) {
  await app.register(fstatic, { root: WEB_DIST, wildcard: false });
  app.setNotFoundHandler((req, reply) => {
    if (req.raw.url?.startsWith('/api/')) return reply.code(404).send({ error: 'not found' });
    return reply.sendFile('index.html');
  });
} else {
  app.log.warn(`web build not found at ${WEB_DIST} (ok in dev — run the Vite server separately)`);
}

try {
  await app.listen({ port: PORT, host: HOST });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
