// Validates all content files. Run: node scripts/validate-content.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const C = path.join(ROOT, 'content');
let errors = 0;
let warns = 0;
const err = (m) => { console.error('  ✖ ' + m); errors++; };
const warn = (m) => { console.warn('  ⚠ ' + m); warns++; };

const EX_TYPES = new Set(['fill', 'choose', 'translate', 'fix', 'order', 'match', 'listen', 'freeform']);

// --- very small frontmatter reader (id/exercises detection only) ---
function frontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : '';
}

console.log('\nLessons:');
const seenLessonIds = new Set();
for (const f of fs.readdirSync(path.join(C, 'lessons')).filter((f) => f.endsWith('.md') && !f.startsWith('_'))) {
  const raw = fs.readFileSync(path.join(C, 'lessons', f), 'utf8');
  const fm = frontmatter(raw);
  if (!fm) { err(`${f}: no frontmatter`); continue; }
  const id = (fm.match(/^id:\s*(.+)$/m) || [])[1]?.trim();
  if (!id) err(`${f}: missing id`);
  else if (seenLessonIds.has(id)) err(`${f}: duplicate id ${id}`);
  else seenLessonIds.add(id);
  if (!/^title:/m.test(fm)) err(`${f}: missing title`);
  if (!/exercises:/m.test(fm)) warn(`${f}: no exercises`);
  console.log(`  ✓ ${f} (${id})`);
}

console.log('\nGrammar:');
const seenGrammarIds = new Set();
for (const f of fs.readdirSync(path.join(C, 'grammar')).filter((f) => f.endsWith('.md') && !f.startsWith('_'))) {
  const raw = fs.readFileSync(path.join(C, 'grammar', f), 'utf8');
  const fm = frontmatter(raw);
  if (!fm) { err(`${f}: no frontmatter`); continue; }
  const id = (fm.match(/^id:\s*(.+)$/m) || [])[1]?.trim();
  if (!id) err(`${f}: missing id`);
  else if (seenGrammarIds.has(id)) err(`${f}: duplicate id ${id}`);
  else seenGrammarIds.add(id);
}
console.log(`  ${seenGrammarIds.size} grammar cards`);

console.log('\nVocab:');
const seenWordIds = new Map();
let totalWords = 0;
for (const f of fs.readdirSync(path.join(C, 'vocab')).filter((f) => f.endsWith('.json') && !f.startsWith('_'))) {
  let data;
  try { data = JSON.parse(fs.readFileSync(path.join(C, 'vocab', f), 'utf8')); }
  catch (e) { err(`${f}: invalid JSON — ${e.message}`); continue; }
  if (!Array.isArray(data.words)) { err(`${f}: no words[]`); continue; }
  let dups = 0;
  for (const w of data.words) {
    if (!w.id || !w.word) { err(`${f}: word missing id/word`); continue; }
    if (!w.ru) warn(`${f}: ${w.id} missing ru`);
    if (seenWordIds.has(w.id)) { dups++; }
    else seenWordIds.set(w.id, f);
    totalWords++;
  }
  if (dups) warn(`${f}: ${dups} duplicate ids (deduped at load)`);
  console.log(`  ✓ ${f}: ${data.words.length} words`);
}

console.log(`\nTotals: ${seenLessonIds.size} lessons, ${seenGrammarIds.size} grammar, ${totalWords} words (${seenWordIds.size} unique).`);
console.log(`Result: ${errors} errors, ${warns} warnings.`);
process.exit(errors ? 1 : 0);
