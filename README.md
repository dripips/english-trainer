<div align="center">

<img src="docs/screenshots/icon.png" width="96" alt="logo" />

# English Trainer

**Свой бесплатный тренажёр английского — PWA для телефона.**
Уроки, слова с интервальным повторением, грамматика, разминки, журнал ошибок и встроенный переводчик. Без подписок и рекламы.

[Возможности](#возможности) · [Скриншоты](#скриншоты) · [Быстрый старт](#быстрый-старт-локально) · [Деплой](#деплой-на-свой-сервер) · [Как добавить урок](#как-добавлять-контент)

</div>

---

## Возможности

- 📘 **Уроки** — теория на русском + упражнения с авто-проверкой (8 типов: вставь слово, выбор, перевод, исправь ошибку, собери предложение, сопоставь, диктант на слух, свободное письмо).
- 🎴 **Слова (SRS)** — интервальное повторение по алгоритму SM-2 (как Anki). База **1200+ слов** по уровням (A1–B2), частям речи и темам + неправильные и фразовые глаголы + академическая лексика IELTS.
- 📐 **Грамматика** — 27 справочных карточек с примерами и «частыми ошибками».
- 🧠 **Разминка** — приложение само собирает мини-сессию из твоих прошлых ошибок и слов к повторению.
- 🐞 **Журнал ошибок** — как баг-трекер: ошибки из упражнений и переводчика попадают сюда автоматически и питают разминку.
- 📈 **Прогресс** — трекер владения темами (🌱 изучаю / 🔧 закрепляю / ✅ уверенно) с графиком возврата.
- 🌐 **Переводчик** — EN↔RU, словарь с транскрипцией и произношением; незнакомое слово в один тап добавляется в свою колоду.
- 🔊 **Произношение** — озвучка слов и предложений (Web Speech API), офлайн.
- 👤 **Несколько аккаунтов** — у каждого свой прогресс, колода и журнал ошибок.
- 📲 **PWA** — ставится на телефон как приложение, работает офлайн, тёмная тема. Закрыто от индексации (`noindex`).

## Скриншоты

| Главная | Урок | Слова | Карточки | Грамматика |
|---|---|---|---|---|
| ![](docs/screenshots/home.png) | ![](docs/screenshots/exercise.png) | ![](docs/screenshots/vocab.png) | ![](docs/screenshots/review.png) | ![](docs/screenshots/grammar.png) |

## Технологии

- **Фронтенд:** Vite + React + TypeScript + Tailwind v4, PWA (`vite-plugin-pwa`). Шрифты Inter + Fredoka вшиты (офлайн).
- **Бэкенд:** Node.js (Fastify) + встроенный `node:sqlite` — **без нативных зависимостей**.
- **Контент:** обычные файлы в `content/` (Markdown-уроки, JSON-словари, Markdown-грамматика) — добавлять материал можно без правки кода.
- **Переводчик:** бесплатный MyMemory из коробки или свой приватный LibreTranslate (опционально).
- **Деплой:** Docker Compose + Caddy (авто-HTTPS).

## Быстрый старт (локально)

Нужен Node.js 22+ (рекомендуется 24).

```bash
git clone https://github.com/<you>/english-trainer.git
cd english-trainer
npm run install:all          # ставит зависимости server/ и web/
npm run dev                  # API :3000  +  веб :5173
```

Открой **http://localhost:5173**. Тестовые аккаунты по умолчанию: `vadim / vadim` и `alena / alena` (поменяй через `SEED_USERS`, см. ниже).

Проверить контент: `npm run validate`.

## Деплой на свой сервер

DNS поддомена (например `lern.example.com`) должен указывать на сервер; порты 80 и 443 открыты. Нужен Docker + Docker Compose.

```bash
git clone https://github.com/<you>/english-trainer.git
cd english-trainer
cp .env.example .env
nano .env                    # задай AUTH_SECRET, COOKIE_SECRET, SEED_USERS, DOMAIN, ACME_EMAIL
docker compose up -d --build
```

Caddy сам получит TLS-сертификат. Готово — открывай `https://<DOMAIN>` на телефоне и «Добавить на экран Домой».

Секреты генерируй так: `openssl rand -hex 32`.

**Приватный переводчик (опционально).** MyMemory работает сразу. Если хочешь полностью приватный перевод — подними LibreTranslate:
```bash
docker compose --profile selfhost-translate up -d
# затем в .env: LIBRETRANSLATE_URL=http://libretranslate:5000  и  docker compose restart app
```
(Учти: LibreTranslate скачивает языковые модели и заметно ест RAM.)

### Вариант без Docker — за существующим nginx

Если на сервере уже стоит nginx с другими сайтами, не нужен ни Docker, ни Caddy: запусти приложение нативно на внутреннем порту и добавь **новый** vhost. Нужен Node ≥ 22 (для `node:sqlite`).

```bash
git clone https://github.com/dripips/english-trainer.git /opt/english-trainer
cd /opt/english-trainer && npm run install:all && npm run build:web
cp .env.example .env && nano .env          # секреты, SEED_USERS, PORT=3100, HOST=127.0.0.1
sudo cp deploy/english-trainer.service.example /etc/systemd/system/english-trainer.service
sudo systemctl daemon-reload && sudo systemctl enable --now english-trainer
sudo cp deploy/nginx-lern.conf.example /etc/nginx/sites-available/lern.example.com
# отредактируй server_name; затем:
sudo ln -s /etc/nginx/sites-available/lern.example.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d lern.example.com    # TLS
```

## Как добавлять контент

Подробный формат — в [`content/AUTHORING.md`](content/AUTHORING.md). Кратко:

- **Урок:** новый файл `content/lessons/NN-slug.md` (frontmatter с метаданными и упражнениями + тело-теория на markdown).
- **Слова:** `content/vocab/<category>.json`.
- **Грамматика:** `content/grammar/<id>.md`.

После добавления файла:
- локально (dev) — подхватится автоматически;
- в Docker — `docker compose restart app` (папка `content/` примонтирована).

## Структура

```
content/        учебный материал (уроки, слова, грамматика)
server/         Fastify API + node:sqlite (auth, прогресс, SRS, ошибки, переводчик)
web/            React PWA
deploy/         Caddyfile
scripts/        dev-раннер и валидатор контента
```

## Приватность

Приложение для личного использования: `robots.txt` запрещает индексацию, везде стоит заголовок `X-Robots-Tag: noindex`, доступ — только по логину. Данные пользователей (прогресс, колоды, ошибки) лежат в локальной SQLite-базе на твоём сервере и никуда не уходят. Секреты — только в `.env` (в git не коммитятся).

## Лицензия

[MIT](LICENSE) — бери, разворачивай, меняй под себя. 💛
