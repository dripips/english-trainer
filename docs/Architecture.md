# Architecture

## Stack
- **Frontend:** Vite + React 19 + TypeScript + Tailwind v4. PWA via `vite-plugin-pwa` (injectManifest, custom service worker for push). Single bundle served by the API.
- **Backend:** Fastify 5 on **Node 24**, using the built-in **`node:sqlite`** — no external database, no ORM.
- **Auth:** signed JWT in an httpOnly cookie; 10-year sessions (survive deploys). Role read **live from the DB** on every request, so promotions/demotions apply without re-login.

## Content pipeline
All learning material is **plain files** under `content/`, parsed at server startup (and hot-reloaded on change):
- `lessons/*.md` — gray-matter front-matter (`id, order, level, phase, exercises, reading, …`) + Markdown theory. A lesson with `kind: reading` is a reading text (excluded from the grammar list, plan, and practice queue); a `listening` tag marks dictation drills.
- `grammar/*.md` — reference cards.
- `vocab/*.json` — themed word sets. Word `id` = slug, so the same word across sets de-duplicates on load.
- `books/*.json` — picture books: `{ id, title, level, character, style, pages:[{en, ru, scene}] }`. Page art lives in `web/public/books/<id>/<n>.webp`.

Adding content needs **no code and no frontend rebuild** — just drop a file and restart the server (image/code changes do need `npm run build:web`).

## Data model (SQLite)
- `users` (role, xp, longest_streak) · `settings` (per-user key/value)
- `lesson_attempts` (per exercise, upserted) · `activity` (daily reviews/exercises → streaks)
- `srs_cards` (SM-2: ease, interval, reps, due, state) · `custom_words` (saved from texts)
- `error_log` · `progress` (topic mastery) · `push_subscriptions` · `translations_cache`

## Spaced repetition
Classic **SM-2** (`server/src/srs.js`): `again/hard/good/easy` ratings adjust ease & interval; new-cards-per-day cap is configurable per user.

## AI & media (all optional, server-proxied)
- **Translation & writing/speaking feedback:** any OpenAI-compatible chat API (`LLM_TRANSLATE_*`). Feedback is forced to structured JSON and calibrated to the learner's level.
- **TTS:** `POST /api/tts` proxies **ElevenLabs**, caches mp3 to `server/data/tts-cache/` keyed by `model|voice|speed|text`; concurrent identical requests are coalesced. Client falls back to the browser `speechSynthesis` voice.
- **Story art:** generated out-of-band with Gemini ("Nano Banana") — see [Content Authoring](Content-Authoring).

## Notable engineering
- Back/forward navigation **restores scroll position** (custom in `Layout`), forward nav resets to top.
- `useApi` auto-retries transient failures (e.g. a deploy restart) so the UI self-heals.
- Empty-body POSTs never send a JSON content-type (Fastify would 400) — fixed in the fetch wrapper.
