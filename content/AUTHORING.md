# Как добавлять контент (уроки, слова, грамматика)

Весь учебный контент — это **файлы в папке `content/`**. Чтобы добавить материал, не нужно трогать код: положил файл → перезапустил сервер (или он подхватит на горячую в dev). Сервер валидирует контент при загрузке и сообщает об ошибках формата.

```
content/
  lessons/   NN-slug.md      ← урок: теория (markdown) + упражнения (frontmatter)
  vocab/     category.json   ← пачка слов одной категории
  grammar/   id.md           ← справочная карточка по грамматике
```

> Файлы, имя которых начинается с `_` (например `_sample.json`), игнорируются загрузчиком — это шаблоны/примеры.

---

## 1. Урок — `content/lessons/NN-slug.md`

Markdown с YAML-frontmatter. **Теория** — это тело markdown (рендерится как есть, поддерживает таблицы, `>` цитаты, **жирный**). **Упражнения** — массив `exercises` во frontmatter (чтобы их можно было автопроверять).

```markdown
---
id: present-simple                 # уникальный стабильный id (kebab-case)
order: 1                           # порядок в списке уроков
title: "Present Simple + предлоги времени in/on/at"
level: A1                          # A1 | A2 | B1 | B2 | C1
phase: 0                           # фаза дорожной карты 0..3
murphy: "Units 5, 25–28, 104–106"  # ссылка на учебник Murphy (необязательно)
summary: "Когда и как использовать Present Simple, ловушка -s, предлоги времени."
tags: [present-simple, prepositions, tenses]
grammarRefs: [present-simple, prep-time-in-on-at]   # id карточек грамматики (необяз.)
vocabTopics: [daily-routine, work]                  # темы слов, привязанные к уроку (необяз.)
warmup:                            # разминка: повтор старых тем (необяз.)
  - "Переведи: Он работает в банке."
  - "Исправь: He don't like coffee."
videos:                            # блок «Смотри» — понятный вход по теме (необяз.)
  - { title: "Gogo Loves English (серии 1–21)", url: "https://www.youtube.com/watch?v=Z45RyKzb66g" }
  - { title: "English Singsing — What did you do yesterday?", url: "https://www.youtube.com/watch?v=ahZ5xyPKnQY" }
reading:                           # отрывок для чтения с переводом по контексту (необяз.)
  textEn: "Yesterday I went to work. I had breakfast and drank coffee."
  textRu: "Вчера я пошёл на работу. Я позавтракал и выпил кофе."
  gloss:                           # разбор слов именно в этом контексте
    - { en: "went", ru: "пошёл", note: "от go" }
    - { en: "had breakfast", ru: "позавтракал", note: "have = принимать пищу, не «иметь»" }
exercises:
  - id: a1
    type: fill                     # см. типы ниже
    prompt: "She (work) ___ in a hospital."
    answer: "works"                # строка ИЛИ список допустимых ответов
    hint: "he/she/it → +s"         # подсказка (необяз.)
    rule: "Только he/she/it получают -s."   # правило, показывается после ответа (необяз.)
  - id: c2
    type: choose
    prompt: "Look! The baby (___)."
    options: ["sleeps", "is sleeping"]
    answer: "is sleeping"
    rule: "Look! = прямо сейчас → Continuous."
  - id: d1
    type: translate
    prompt: "Он работает в банке."
    answer: ["He works in a bank.", "He works at a bank."]
  - id: f1
    type: fix
    prompt: "He don't work here."
    answer: "He doesn't work here."
  - id: o1
    type: order
    tokens: ["She", "doesn't", "like", "coffee"]
    answer: "She doesn't like coffee."
  - id: m1
    type: match
    pairs:
      - { left: "at", right: "7 o'clock" }
      - { left: "on", right: "Monday" }
      - { left: "in", right: "July" }
  - id: l1
    type: listen                   # TTS произносит audioText, ученик пишет услышанное
    audioText: "She gets up at seven in the morning."
    answer: "She gets up at seven in the morning."
  - id: e1
    type: freeform                 # свободное письмо, только самопроверка
    prompt: "Опиши 3 предложениями, что происходит в комнате прямо сейчас."
    sample: "My wife is cooking. I am writing. The TV is working."
---

## Часть 1. Когда использовать
…теория markdown…
```

### Типы упражнений
| type | поля | как проверяется |
|------|------|-----------------|
| `fill` | prompt, answer | автопроверка (нормализованное сравнение) |
| `choose` | prompt, options, answer | выбор варианта |
| `translate` | prompt (RU), answer (список EN) | автопроверка + кнопка «я был прав» |
| `fix` | prompt (с ошибкой), answer | автопроверка |
| `order` | tokens, answer | собрать предложение из слов |
| `match` | pairs[{left,right}] | сопоставление пар |
| `listen` | audioText, answer | диктант на слух (TTS) |
| `freeform` | prompt, sample | только самопроверка (показать образец) |

### Нормализация ответов (важно)
Проверка **игнорирует**: регистр, лишние пробелы, апострофы (`dont` == `don't`), финальную пунктуацию. Это сделано специально — Вадим и Алена знают механику письма, оцениваем только грамматику/смысл. Поэтому для `translate`/`fix` указывай ВСЕ разумные варианты в `answer` (список), а ученик всегда может нажать «всё равно засчитать».

---

## 2. Слова — `content/vocab/<category>.json`

```json
{
  "category": "a1-verbs",
  "title": "A1 — базовые глаголы",
  "level": "A1",
  "pos": "verb",
  "topic": "core",
  "words": [
    {
      "id": "work",
      "word": "work",
      "pos": "verb",
      "ru": "работать",
      "ipa": "/wɜːk/",
      "exampleEn": "I work in IT.",
      "exampleRu": "Я работаю в IT.",
      "level": "A1",
      "topic": "work",
      "tags": ["core", "oxford3000"],
      "forms": { "past": "worked", "pp": "worked", "ing": "working", "third": "works" }
    }
  ]
}
```
- `pos`: `noun | verb | adjective | adverb | preposition | pronoun | conjunction | determiner | phrase | phrasal-verb | number`
- `forms` — необязательно (полезно для глаголов, особенно неправильных; для существительных можно `{ "plural": "..." }`).
- `id` уникален в пределах всей базы слов.

## 3. Грамматика — `content/grammar/<id>.md`

```markdown
---
id: present-simple
title: "Present Simple"
level: A1
order: 5
tags: [tenses]
summary: "Настоящее простое: привычки, факты, расписания."
relatedLessons: [present-simple]
commonMistakes:                    # это автоматически предлагается в журнал ошибок
  - wrong: "He don't work"
    right: "He doesn't work"
    rule: "I/he/she/it → doesn't; после doesn't глагол без -s."
---

## Когда
…
## Форма
…
## Частые ошибки
…
```
