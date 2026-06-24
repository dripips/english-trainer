# Deployment

Any host with **Node 24+** works (Node 24 is required for the built-in `node:sqlite`).

## Local / first run
```bash
git clone https://github.com/dripips/english-trainer.git
cd english-trainer
npm install
cp .env.example server/.env      # fill in, then: chmod 600 server/.env
npm run build:web                # build the PWA
npm start                        # Fastify serves the API + the built PWA
```

## Configuration
All via environment variables in `server/.env` — see [`.env.example`](https://github.com/dripips/english-trainer/blob/main/.env.example).

Minimum to boot: `AUTH_SECRET`, `COOKIE_SECRET`, `SEED_USERS`. Everything else is optional and degrades gracefully:

| Variable(s) | Enables | Fallback if unset |
|---|---|---|
| `LLM_TRANSLATE_URL/KEY/MODEL` | context-aware translation + AI writing/speaking feedback | LibreTranslate / free MyMemory; feedback disabled |
| `ELEVENLABS_API_KEY` (+ `MODEL/VOICE/SPEED`) | natural TTS narration | browser `speechSynthesis` voice |
| `VAPID_PUBLIC/PRIVATE/SUBJECT` | push reminders | reminders disabled |
| `TEXTBOOK_PDF`, `LIBRARY_DIR` | private PDF reader / graded-reader library | sections hidden |
| `ADMIN_USERNAMES` | auto-promote admins on boot | seed roles only |

**Secrets** live only in `server/.env` (`chmod 600`) — never commit them.

## Reference production setup
`git pull` → `PATH=/opt/node/bin:$PATH npm run build:web` → `systemctl restart english-trainer`, behind a reverse proxy that terminates HTTPS and forwards to `127.0.0.1:$PORT`.

- A systemd unit runs `node server/src/index.js` with the env file.
- **Content-only** changes (new lesson/vocab `.md`/`.json`): just `git pull && systemctl restart` — no rebuild.
- **Code/image** changes: rebuild the PWA (`npm run build:web`) before restart.

## Data & backups
Everything stateful is under **`server/data/`**:
- `app.db` — SQLite (users, progress, SRS, settings…)
- `tts-cache/` — generated speech (safe to delete; regenerates on demand)

Back up `app.db`. It survives deploys; keep `AUTH_SECRET` stable so existing logins keep working.
