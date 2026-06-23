import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Check } from 'lucide-react';
import { api } from '../api';
import { SpeakButton } from './ui';

// Tap a word inside a [data-lookup] region to translate it (in context) and add to vocab.
function lookupAtPoint(x: number, y: number): { word: string; sentence: string } | null {
  let node: Node | null = null;
  let offset = 0;
  const doc: any = document;
  if (doc.caretRangeFromPoint) {
    const r = doc.caretRangeFromPoint(x, y);
    if (r) { node = r.startContainer; offset = r.startOffset; }
  } else if (doc.caretPositionFromPoint) {
    const pos = doc.caretPositionFromPoint(x, y);
    if (pos) { node = pos.offsetNode; offset = pos.offset; }
  }
  if (!node || node.nodeType !== 3) return null;
  const text = node.textContent || '';
  if (!text) return null;

  // word under finger
  const isWord = (c: string) => /[\p{L}'’-]/u.test(c);
  let ws = Math.min(offset, text.length);
  let we = ws;
  while (ws > 0 && isWord(text[ws - 1])) ws--;
  while (we < text.length && isWord(text[we])) we++;
  const word = text.slice(ws, we).replace(/^['’-]+|['’-]+$/g, '').trim();
  if (!word || !/[\p{L}]/u.test(word) || word.length > 40) return null;

  // Build a SHORT context: just the one sentence around the tapped word (a whole
  // reading text often sits in a single <p>, so we must not use the full block).
  const startEl: Element | null = node.nodeType === 3 ? node.parentElement : (node as Element);
  const block = startEl?.closest('li, p, td, th, blockquote, h1, h2, h3, h4');
  let blockText = text;
  let globalStart = ws;
  if (block) {
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    let acc = ''; let found = -1; let n: Node | null;
    while ((n = walker.nextNode())) {
      if (n === node) found = acc.length + ws;
      acc += n.textContent || '';
    }
    blockText = acc;
    globalStart = found >= 0 ? found : Math.max(0, acc.toLowerCase().indexOf(word.toLowerCase()));
  }
  // expand to sentence boundaries (. ! ? or newline) around the word
  let s = 0; let e = blockText.length;
  for (let i = globalStart; i > 0; i--) { if (/[.!?\n]/.test(blockText[i - 1])) { s = i; break; } }
  for (let i = globalStart; i < blockText.length; i++) { if (/[.!?\n]/.test(blockText[i])) { e = i + 1; break; } }
  let sentence = blockText.slice(s, e).replace(/\s+/g, ' ').trim();
  // if the sentence is still long, keep only ~±4 words around the tapped word
  const parts = sentence.split(' ');
  if (parts.length > 12) {
    const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}]/gu, '');
    let wi = parts.findIndex((w) => norm(w) === word.toLowerCase());
    if (wi < 0) wi = parts.findIndex((w) => norm(w).includes(word.toLowerCase()));
    const c = wi >= 0 ? wi : Math.floor(parts.length / 2);
    sentence = (c > 4 ? '…' : '') + parts.slice(Math.max(0, c - 4), c + 5).join(' ') + (c + 5 < parts.length ? '…' : '');
  }
  return { word, sentence };
}

export function LookupLayer() {
  const [open, setOpen] = useState<{ word: string; sentence: string } | null>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (open) return;
      const target = e.target as Element | null;
      if (!target || !target.closest?.('[data-lookup]')) return;
      if (target.closest('a, button, input, select, textarea')) return;
      const hit = lookupAtPoint(e.clientX, e.clientY);
      if (hit) { e.preventDefault(); setOpen(hit); }
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [open]);

  if (!open) return null;
  return createPortal(<LookupSheet word={open.word} sentence={open.sentence} onClose={() => setOpen(null)} />, document.body);
}

function LookupSheet({ word, sentence, onClose }: { word: string; sentence: string; onClose: () => void }) {
  const [wordRes, setWordRes] = useState<Awaited<ReturnType<typeof api.translate>> | null>(null);
  const [saved, setSaved] = useState(false);

  const hasContext = sentence && sentence.toLowerCase().replace(/[^a-zа-яё]/gi, '') !== word.toLowerCase().replace(/[^a-zа-яё]/gi, '');

  useEffect(() => {
    // pass the sentence as context so the (LLM) translator picks the right meaning
    api.translate(word, undefined, undefined, hasContext ? sentence : undefined)
      .then(setWordRes).catch(() => setWordRes(null));
  }, [word, sentence]); // eslint-disable-line react-hooks/exhaustive-deps

  const enSide = wordRes ? (wordRes.source === 'en' ? word : wordRes.translation) : word;
  const ruSide = wordRes ? (wordRes.source === 'en' ? wordRes.translation : word) : '';

  async function add() {
    try { await api.addCustomWord({ word: enSide, ru: ruSide, exampleEn: hasContext ? sentence : undefined, addToSrs: true }); setSaved(true); } catch { /* ignore */ }
  }

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-x-0 top-0 mx-auto flex max-w-md flex-col justify-end" style={{ height: 'var(--app-h, 100dvh)' }}>
      <div className="card animate-slideup relative !rounded-b-none" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}>
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="display break-words text-lg font-bold">{word}</div>
            <SpeakButton text={enSide} />
          </div>
          <button onClick={onClose} aria-label="Закрыть" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--color-surface2)]"><X size={16} /></button>
        </div>

        {!wordRes ? (
          <p className="py-3 text-sm text-[var(--color-muted)]">Перевожу…</p>
        ) : (
          <>
            <div className="display break-words text-xl font-bold text-[var(--color-mint)]">{wordRes.translation || '—'}</div>
            {wordRes.note && <p className="mt-1 break-words text-sm text-[var(--color-muted)]">{wordRes.note}</p>}
            {wordRes.alternatives?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">{wordRes.alternatives.slice(0, 5).map((a, i) => <span key={i} className="chip">{a}</span>)}</div>
            )}

            {hasContext && (
              <div className="mt-3 rounded-2xl bg-[var(--color-bg2)] p-3">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">пример</div>
                <div className="text-sm text-[var(--color-text)]">{sentence}</div>
              </div>
            )}

            {saved ? (
              <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-[color-mix(in_srgb,var(--color-success)_16%,transparent)] p-3 font-semibold text-[var(--color-success)]"><Check size={18} /> В словаре</div>
            ) : (
              <button onClick={add} className="btn btn-primary mt-3 w-full"><Plus size={18} /> В словарь и на повторение</button>
            )}
          </>
        )}
      </div>
      </div>
    </div>
  );
}
