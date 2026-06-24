# Features

## The four skills

### 📖 Grammar
- 45+ structured lessons A1→B2, each with theory (Markdown), warm-up prompts, curated YouTube videos, and **auto-checked exercises** (fill / choose / translate / fix / order / match / freeform), most with **hints**.
- Wrong answer? One tap logs it to your **error journal** or you can override ("I was right").
- **Reference section** ("Правила"): an all-12-tenses cheat-sheet plus grammar cards grouped by theme; **Exceptions** (irregular verbs, plurals, comparatives); **Everyday words** (days, months, numbers, colours); **Body parts** diagram.

### 📚 Reading
- 50+ graded stories & classic fairy tales (A1–B1), each a **full** retelling (not a stub), **illustrated** with original art.
- **Tap any word** → context-aware translation + save to your SRS deck.
- **Audio narration** of the whole text, **show-translation** toggle, **glossary** you can add to the deck, and **comprehension questions**.
- **Picture books** — a dedicated page-by-page reader you swipe through, with per-page audio and tap-to-translate.

### 🎧 Listening
- Dictation drills A1–B1: press play, hear a phrase (ElevenLabs), type what you heard. Answers are forgiving (punctuation/contractions).

### ✍️ Writing & 🗣️ Speaking
- Answer free prompts or IELTS tasks (Writing Task 1/2, Speaking Part 1/2/3) by **typing or speaking** (Web Speech API where supported).
- **AI feedback** calibrated to the learner's level: 3–6 most-important fixes explained in Russian, a corrected version, strengths, and an approximate band — automating the "handwrite → screenshot → tutor grades" loop.

### 🔊 Pronunciation
- Minimal-pair training (ship/sheep, think/sink, light/right…) — browse & compare, then an ear-training quiz.

## The engine

- **🗓️ Daily session** — one tap composes warm-up → due words → next lesson → listening/reading from your live data.
- **🧠 Spaced repetition (SM-2)** — 3000+ words across 49 themed sets, plus any word you save from a text or the translator.
- **🗺️ Study plan** A1→IELTS — phase roadmap, % done, weekly pacing ("on track / behind"), 🔥 streak, words-in-deck.
- **Gamification** — XP, 10 levels, streaks (current + record), 10 badges.
- **Translator** — context-aware (LLM) with fallback to LibreTranslate / MyMemory.
- **Push reminders** — daily nudge that escalates to a "you've been away N days" re-engagement message.
- **Admin panel** — manage learners, reset passwords, and see per-user stats (lessons done, streak, accuracy, XP).

## Crafted details
- **ElevenLabs TTS** — natural, measured pace; server-side disk cache so each unique phrase is generated (and billed) only once; concurrent requests coalesced.
- **WebP** artwork, lazy-loaded; **skeleton** loaders and page fade-ins (no layout jank); tap-to-pause audio with a radial progress ring.
- Installable **PWA**, offline-friendly, **eternal login** that survives deploys.
