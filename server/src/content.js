import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR =
  process.env.CONTENT_DIR || path.resolve(__dirname, '../../content');

const EX_TYPES = new Set([
  'fill', 'choose', 'translate', 'fix', 'order', 'match', 'listen', 'freeform',
]);

let store = {
  lessons: [],
  lessonById: new Map(),
  grammar: [],
  grammarById: new Map(),
  vocabCategories: [],
  words: [],
  wordById: new Map(),
  warnings: [],
};

function readDir(sub, ext) {
  const dir = path.join(CONTENT_DIR, sub);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(ext) && !f.startsWith('_'))
    .map((f) => path.join(dir, f));
}

function validateExercise(lessonId, ex, warnings) {
  if (!ex.id) warnings.push(`${lessonId}: exercise missing id`);
  if (!EX_TYPES.has(ex.type)) warnings.push(`${lessonId}/${ex.id}: bad type "${ex.type}"`);
  const need = (k) => {
    if (ex[k] === undefined || ex[k] === null) warnings.push(`${lessonId}/${ex.id}: missing "${k}"`);
  };
  switch (ex.type) {
    case 'fill': case 'fix': case 'translate': need('prompt'); need('answer'); break;
    case 'choose': need('prompt'); need('options'); need('answer'); break;
    case 'order': need('tokens'); need('answer'); break;
    case 'match': need('pairs'); break;
    case 'listen': need('audioText'); need('answer'); break;
    case 'freeform': need('prompt'); break;
  }
}

function loadLessons(warnings) {
  const lessons = [];
  for (const file of readDir('lessons', '.md')) {
    try {
      const raw = fs.readFileSync(file, 'utf8');
      const { data, content } = matter(raw);
      if (!data.id || !data.title) {
        warnings.push(`lesson ${path.basename(file)}: missing id/title`);
        continue;
      }
      const exercises = Array.isArray(data.exercises) ? data.exercises : [];
      exercises.forEach((ex) => validateExercise(data.id, ex, warnings));
      lessons.push({
        id: data.id,
        order: data.order ?? 999,
        title: data.title,
        level: data.level || 'A1',
        phase: data.phase ?? 0,
        murphy: data.murphy || null,
        summary: data.summary || '',
        tags: data.tags || [],
        grammarRefs: data.grammarRefs || [],
        vocabTopics: data.vocabTopics || [],
        warmup: data.warmup || [],
        videos: Array.isArray(data.videos) ? data.videos : [],
        reading: data.reading || null,
        exercises,
        theory: content.trim(),
      });
    } catch (e) {
      warnings.push(`lesson ${path.basename(file)}: ${e.message}`);
    }
  }
  lessons.sort((a, b) => a.order - b.order);
  return lessons;
}

function loadGrammar(warnings) {
  const cards = [];
  for (const file of readDir('grammar', '.md')) {
    try {
      const raw = fs.readFileSync(file, 'utf8');
      const { data, content } = matter(raw);
      if (!data.id || !data.title) {
        warnings.push(`grammar ${path.basename(file)}: missing id/title`);
        continue;
      }
      cards.push({
        id: data.id,
        order: data.order ?? 999,
        title: data.title,
        level: data.level || 'A1',
        tags: data.tags || [],
        summary: data.summary || '',
        relatedLessons: data.relatedLessons || [],
        commonMistakes: data.commonMistakes || [],
        body: content.trim(),
      });
    } catch (e) {
      warnings.push(`grammar ${path.basename(file)}: ${e.message}`);
    }
  }
  cards.sort((a, b) => a.order - b.order);
  return cards;
}

function loadVocab(warnings) {
  const categories = [];
  const words = [];
  const wordById = new Map();
  for (const file of readDir('vocab', '.json')) {
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      warnings.push(`vocab ${path.basename(file)}: invalid JSON (${e.message})`);
      continue;
    }
    const list = Array.isArray(parsed.words) ? parsed.words : [];
    let count = 0;
    for (const w of list) {
      if (!w.id || !w.word) {
        warnings.push(`vocab ${path.basename(file)}: word missing id/word`);
        continue;
      }
      const word = {
        id: w.id,
        word: w.word,
        pos: w.pos || parsed.pos || 'mixed',
        ru: w.ru || '',
        ipa: w.ipa || '',
        exampleEn: w.exampleEn || '',
        exampleRu: w.exampleRu || '',
        level: w.level || parsed.level || 'A1',
        topic: w.topic || parsed.topic || 'core',
        tags: w.tags || [],
        forms: w.forms || null,
        category: parsed.category || path.basename(file, '.json'),
      };
      // Keep all entries for per-category browsing; for global lookups keep the
      // richest version (prefer one that has verb forms / an example).
      const existing = wordById.get(word.id);
      if (!existing || (!existing.forms && word.forms) || (!existing.exampleEn && word.exampleEn)) {
        wordById.set(word.id, word);
      }
      words.push(word);
      count++;
    }
    categories.push({
      category: parsed.category || path.basename(file, '.json'),
      title: parsed.title || parsed.category || path.basename(file, '.json'),
      level: parsed.level || 'A1',
      pos: parsed.pos || 'mixed',
      topic: parsed.topic || 'core',
      count,
    });
  }
  categories.sort((a, b) => (a.level + a.title).localeCompare(b.level + b.title));
  return { categories, words, wordById };
}

export function loadContent() {
  const warnings = [];
  const lessons = loadLessons(warnings);
  const grammar = loadGrammar(warnings);
  const { categories, words, wordById } = loadVocab(warnings);
  store = {
    lessons,
    lessonById: new Map(lessons.map((l) => [l.id, l])),
    grammar,
    grammarById: new Map(grammar.map((g) => [g.id, g])),
    vocabCategories: categories,
    words,
    wordById,
    warnings,
  };
  console.log(
    `Content loaded: ${lessons.length} lessons, ${grammar.length} grammar cards, ` +
      `${words.length} words in ${categories.length} categories.`
  );
  if (warnings.length) console.warn(`Content warnings (${warnings.length}):\n - ` + warnings.slice(0, 30).join('\n - '));
  return store;
}

export function getStore() {
  return store;
}

// Lightweight lesson meta (no theory/exercises) for list views
export function lessonMeta(l) {
  return {
    id: l.id, order: l.order, title: l.title, level: l.level, phase: l.phase,
    murphy: l.murphy, summary: l.summary, tags: l.tags,
    exerciseCount: l.exercises.length,
  };
}

export { CONTENT_DIR };
