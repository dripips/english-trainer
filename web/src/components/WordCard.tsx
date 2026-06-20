import { useState } from 'react';
import { Plus, Check } from 'lucide-react';
import type { Word } from '../types';
import { api } from '../api';
import { SpeakButton, LevelBadge } from './ui';

export function WordCard({ word, onChange }: { word: Word; onChange?: (inDeck: boolean) => void }) {
  const [inDeck, setInDeck] = useState(!!word.inDeck);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      if (inDeck) { await api.srsRemove(word.id); setInDeck(false); onChange?.(false); }
      else { await api.srsAdd([word.id]); setInDeck(true); onChange?.(true); }
    } finally { setBusy(false); }
  }

  return (
    <div className="card overflow-hidden !p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="display text-lg font-bold">{word.word}</span>
            {word.ipa && <span className="text-sm text-[var(--color-muted)]">{word.ipa}</span>}
            <span className="chip">{word.pos}</span>
          </div>
          <div className="mt-0.5 break-words text-[var(--color-text)]">{word.ru}</div>
          {word.exampleEn && (
            <div className="mt-1.5 break-words text-sm text-[var(--color-muted)]">
              <span className="text-[var(--color-text)]">{word.exampleEn}</span>
              {word.exampleRu && <span> — {word.exampleRu}</span>}
            </div>
          )}
          {word.forms && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {Object.entries(word.forms).map(([k, v]) => (
                <span key={k} className="chip !text-[11px]"><b className="text-[var(--color-mint)]">{v}</b>&nbsp;{k}</span>
              ))}
            </div>
          )}
          {word.level && word.level !== 'custom' && <div className="mt-2"><LevelBadge level={word.level} /></div>}
        </div>
        <div className="flex shrink-0 flex-col items-center gap-2">
          <SpeakButton text={word.word} />
          <button onClick={toggle} disabled={busy}
            className={`grid h-9 w-9 place-items-center rounded-full active:scale-90 ${inDeck ? 'bg-[var(--color-mint)] text-[#0d1320]' : 'bg-[var(--color-surface2)] text-[var(--color-mint)]'}`}
            aria-label={inDeck ? 'Убрать из колоды' : 'Добавить в колоду'}>
            {inDeck ? <Check size={18} /> : <Plus size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
