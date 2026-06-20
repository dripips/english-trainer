import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Languages, Plus, X, Check } from 'lucide-react';
import { api } from '../api';
import { SpeakButton } from './ui';

// Listens for text selection inside [data-lookup] regions (lesson theory,
// exercises) and offers an instant translate + add-to-vocab action.
export function LookupLayer() {
  const [sel, setSel] = useState<{ text: string; x: number; y: number } | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    function onSel() {
      if (open) return;
      const s = window.getSelection();
      if (!s || s.isCollapsed) { setSel(null); return; }
      const text = s.toString().trim();
      if (!text || text.length > 60 || text.split(/\s+/).length > 6) { setSel(null); return; }
      const node = s.anchorNode;
      const el = node && node.nodeType === 3 ? node.parentElement : (node as Element | null);
      if (!el || !el.closest('[data-lookup]')) { setSel(null); return; }
      try {
        const rect = s.getRangeAt(0).getBoundingClientRect();
        setSel({ text, x: rect.left + rect.width / 2, y: rect.top });
      } catch { setSel(null); }
    }
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, [open]);

  return (
    <>
      {sel && !open && createPortal(
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { setOpen(sel.text); setSel(null); }}
          style={{
            position: 'fixed',
            left: Math.min(Math.max(sel.x, 80), window.innerWidth - 80),
            top: Math.max(sel.y - 48, 10),
            transform: 'translateX(-50%)',
            zIndex: 60,
          }}
          className="btn btn-primary !px-3 !py-2 text-sm shadow-xl"
        >
          <Languages size={16} /> Перевести
        </button>,
        document.body
      )}
      {open && createPortal(<LookupSheet text={open} onClose={() => setOpen(null)} />, document.body)}
    </>
  );
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
      <div className="card animate-slideup relative w-full max-w-md mx-auto !rounded-b-none">
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
