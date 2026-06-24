# Content Authoring

No build step for content — drop a file in `content/` and restart the server. (Only image or code changes need `npm run build:web`.)

## Grammar lesson / reading text / listening drill
A Markdown file in `content/lessons/`. Front-matter (YAML) + theory below `---`:

```yaml
---
id: present-simple          # unique slug (used in the URL)
order: 1                    # sort order
title: "Present Simple"
level: A1                   # A1 | A2 | B1 | B2
phase: 0                    # 0..3 (curriculum phase)
tags: [tenses]
# kind: reading             # ← add this to make it a Reading text
reading:                    # optional reading block
  textEn: |
    ...
  textRu: |
    ...
  gloss: [ { en: "leave", ru: "уходить", note: "не «листья»" } ]
exercises:
  - { id: a1, type: fill, prompt: "She ___ (work) here.", answer: "works", hint: "he/she/it → +s", rule: "..." }
  - { id: a2, type: choose, prompt: "...", options: ["a","b","c"], answer: "a", rule: "..." }
---
## Theory in Markdown…
```

Exercise types: `fill`, `choose`, `translate` (answer is an array of accepted variants), `fix`, `order` (tokens), `match` (pairs), `listen` (audioText), `freeform`. For a **listening** lesson, use all `listen` exercises and tag it `listening`.

Validate it parses: `node -e "require('gray-matter')(require('fs').readFileSync('PATH','utf8'))"`.

## Vocabulary set
A JSON file in `content/vocab/`:
```json
{ "category":"a1-verbs", "title":"A1 — глаголы", "level":"A1", "pos":"verb",
  "words":[ { "id":"work", "word":"work", "ru":"работать", "ipa":"/wɜːk/",
              "exampleEn":"I work here.", "exampleRu":"Я здесь работаю.",
              "forms":{ "past":"worked", "ing":"working", "third":"works" } } ] }
```
`id` = the word slug, so the same word across sets merges automatically.

## Illustrated picture book (with auto-generated art)
A JSON file in `content/books/` plus page art in `web/public/books/<id>/<n>.webp`.

The fastest path: hand the prompt in **[`content/books/AGENT_PROMPT.md`](https://github.com/dripips/english-trainer/blob/main/content/books/AGENT_PROMPT.md)** to an agent. Fill in TITLE / LEVEL / PAGES / IDEA and it will:
1. write the story JSON in the right schema (a fixed `character` description keeps the hero consistent across pages),
2. **generate every page illustration** via Gemini ("Nano Banana"),
3. convert PNG→WebP with `cwebp`,
4. build & deploy.

Image-gen note: `429 RESOURCE_EXHAUSTED` is a **per-minute** rate limit, not a daily cap — pace requests (~3s apart) with backoff; don't abort. If a known character (e.g. "Snow White") returns no image (content filter), rephrase neutrally ("a kind girl", "little gnomes").
