# Как добавлять контент

Для контента нет шага сборки — положи файл в `content/` и перезапусти сервер. (Только изменения картинок или кода требуют `npm run build:web`.)

## Урок грамматики / текст для чтения / диктант
Markdown-файл в `content/lessons/`. Фронтматтер (YAML) + теория под `---`:

```yaml
---
id: present-simple          # уникальный slug (используется в URL)
order: 1                    # порядок сортировки
title: "Present Simple"
level: A1                   # A1 | A2 | B1 | B2
phase: 0                    # 0..3 (фаза программы)
tags: [tenses]
# kind: reading             # ← добавь это, чтобы сделать текстом для чтения
reading:                    # необязательный блок чтения
  textEn: |
    ...
  textRu: |
    ...
  gloss: [ { en: "leave", ru: "уходить", note: "не «листья»" } ]
exercises:
  - { id: a1, type: fill, prompt: "She ___ (work) here.", answer: "works", hint: "he/she/it → +s", rule: "..." }
  - { id: a2, type: choose, prompt: "...", options: ["a","b","c"], answer: "a", rule: "..." }
---
## Теория в Markdown…
```

Типы упражнений: `fill`, `choose`, `translate` (ответ — массив допустимых вариантов), `fix`, `order` (токены), `match` (пары), `listen` (audioText), `freeform`. Для урока **аудирования** используй упражнения `listen` и поставь тег `listening`.

Проверь, что парсится: `node -e "require('gray-matter')(require('fs').readFileSync('PATH','utf8'))"`.

## Набор слов
JSON-файл в `content/vocab/`:
```json
{ "category":"a1-verbs", "title":"A1 — глаголы", "level":"A1", "pos":"verb",
  "words":[ { "id":"work", "word":"work", "ru":"работать", "ipa":"/wɜːk/",
              "exampleEn":"I work here.", "exampleRu":"Я здесь работаю.",
              "forms":{ "past":"worked", "ing":"working", "third":"works" } } ] }
```
`id` = slug слова, поэтому одно и то же слово в разных наборах объединяется автоматически.

## Книга-картинка (с авто-генерацией иллюстраций)
JSON-файл в `content/books/` плюс картинки страниц в `web/public/books/<id>/<n>.webp`.

Самый быстрый путь: отдай промпт из **[`content/books/AGENT_PROMPT.md`](https://github.com/dripips/english-trainer/blob/main/content/books/AGENT_PROMPT.md)** агенту. Заполни TITLE / LEVEL / PAGES / IDEA, и он:
1. напишет JSON истории по нужной схеме (фиксированное описание `character` держит героя одинаковым на всех страницах),
2. **сгенерирует иллюстрацию каждой страницы** через Gemini («Nano Banana»),
3. сконвертирует PNG→WebP через `cwebp`,
4. соберёт и задеплоит.

Заметка про генерацию картинок: `429 RESOURCE_EXHAUSTED` — это лимит **в минуту**, а не дневная квота: разноси запросы (~3 c друг от друга) с backoff, не прерывай. Если известный персонаж (например, «Snow White») возвращает «no image» (контент-фильтр), переформулируй нейтрально («a kind girl», «little gnomes»).
