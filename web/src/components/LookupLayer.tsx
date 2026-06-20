import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Check } from 'lucide-react';
import { api } from '../api';
import { SpeakButton } from './ui';

// Tap a word inside a [data-lookup] region to translate it and add to vocab.
// We detect the word under the finger (no native text selection → no iOS callout).
function wordAtPoint(x: number, y: number): string | null {
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
  const isWord = (c: string) => /[\p{L}'’-]/u.test(c);
  let start = Math.min(offset, text.length);
  let end = start;
  while (start > 0 && isWord(text[start - 1])) start--;
  while (end < text.length && isWord(text[end])) end++;
  const word = text.slice(start, end).replace(/^['’-]+|['’-]+$/g, '').trim();
  if (!word || !/[\p{L}]/u.test(word) || word.length > 40) return null;
  return word;
}

export function LookupLayer() {
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (open) return;
      const target = e.target as Element | null;
      if (!target || !target.closest?.('[data-lookup]')) return;
      if (target.closest('a, button, input, select, textarea')) return;
      const word = wordAtPoint(e.clientX, e.clientY);
      if (word) { e.preventDefault(); setOpen(word); }
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [open]);

  if (!open) return null;
  return createPortal(<LookupSheet text={open} onClose={() => setOpen(null)} />, document.body);
}

function LookupSheet({ text, onClose }: { text: string; onClose: () => void }) {
  const [res, setRes] = useState<Awaited<ReturnType<typeof api.translate>> | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.translate(text).then(setRes).catch(() => setRes({ translation: '—', alternatives: [], provider: 'none', source: '', target: '' } as any));
  }, [text]);

  const enSide = res ? (res.source === 'en' ? text : res.translation) : text;
  const ruSide = res ? (res.source === 'en' ? res.translation : text) : '';

  async function add() {
    try { await api.addCustomWord({ word: enSide, ru: ruSide, addToSrs: true }); setSaved(true); } catch { /* ignore */ }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="card animate-slideup relative mx-auto w-full max-w-md !rounded-b-none">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="display min-w-0 break-words text-lg font-bold">{text}</div>
          <button onClick={onClose} aria-label="Закрыть" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--color-surface2)]"><X size={16} /></button>
        </div>
        {!res ? (
          <p className="py-3 text-sm text-[var(--color-muted)]">Перевожу…</p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="display min-w-0 flex-1 break-words text-xl font-bold text-[var(--color-mint)]">{res.translation || '—'}</div>
              <SpeakButton text={enSide} />
            </div>
            {res.alternatives?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">{res.alternatives.map((a, i) => <span key={i} className="chip">{a}</span>)}</div>
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
  );
}
