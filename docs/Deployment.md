# Развёртывание

Подойдёт любой хост с **Node 24+** (Node 24 нужен для встроенного `node:sqlite`).

## Локально / первый запуск
```bash
git clone https://github.com/dripips/english-trainer.git
cd english-trainer
npm install
cp .env.example server/.env      # заполни, затем: chmod 600 server/.env
npm run build:web                # сборка PWA
npm start                        # Fastify отдаёт API + собранную PWA
```

## Конфигурация
Всё через переменные окружения в `server/.env` — см. [`.env.example`](https://github.com/dripips/english-trainer/blob/main/.env.example).

Минимум для старта: `AUTH_SECRET`, `COOKIE_SECRET`, `SEED_USERS`. Остальное опционально и деградирует мягко:

| Переменная(ые) | Включает | Откат, если не задано |
|---|---|---|
| `LLM_TRANSLATE_URL/KEY/MODEL` | контекстный перевод + AI-разбор письма/речи | LibreTranslate / бесплатный MyMemory; разбор отключён |
| `ELEVENLABS_API_KEY` (+ `MODEL/VOICE/SPEED`) | естественная озвучка TTS | голос браузера `speechSynthesis` |
| `VAPID_PUBLIC/PRIVATE/SUBJECT` | push-напоминания | напоминания отключены |
| `TEXTBOOK_PDF`, `LIBRARY_DIR` | приватный PDF-ридер / библиотека адаптированных книг | разделы скрыты |
| `ADMIN_USERNAMES` | авто-повышение в админы при старте | роли только из seed |

**Секреты** живут только в `server/.env` (`chmod 600`) — никогда не коммить их.

## Эталонный прод
`git pull` → `PATH=/opt/node/bin:$PATH npm run build:web` → `systemctl restart english-trainer`, за обратным прокси, который терминирует HTTPS и проксирует на `127.0.0.1:$PORT`.

- systemd-юнит запускает `node server/src/index.js` с env-файлом.
- Изменения **только контента** (новый урок/слова `.md`/`.json`): просто `git pull && systemctl restart` — без пересборки.
- Изменения **кода/картинок**: пересобери PWA (`npm run build:web`) перед рестартом.

## Данные и бэкапы
Всё состояние — под **`server/data/`**:
- `app.db` — SQLite (пользователи, прогресс, SRS, настройки…)
- `tts-cache/` — сгенерированная озвучка (можно удалять; пересоздаётся по запросу)

Бэкапь `app.db`. Он переживает деплои; держи `AUTH_SECRET` неизменным, чтобы существующие логины продолжали работать.
