import { useEffect, useMemo, useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { api } from '../api';
import { Header } from '../components/Header';
import { Spinner, SpeakButton } from '../components/ui';
import type { Word } from '../types';

// Labelled points on the figure. x/y are percentages of the figure box; side = which edge the pill hugs.
const LABELS: { word: string; x: number; y: number; side: 'l' | 'r' }[] = [
  { word: 'hair', x: 50, y: 3, side: 'r' },
  { word: 'eye', x: 46, y: 11, side: 'l' },
  { word: 'ear', x: 56, y: 12, side: 'r' },
  { word: 'neck', x: 50, y: 20, side: 'l' },
  { word: 'shoulder', x: 62, y: 25, side: 'r' },
  { word: 'chest', x: 50, y: 30, side: 'l' },
  { word: 'arm', x: 67, y: 38, side: 'r' },
  { word: 'stomach', x: 50, y: 42, side: 'l' },
  { word: 'elbow', x: 69, y: 46, side: 'r' },
  { word: 'hip', x: 42, y: 49, side: 'l' },
  { word: 'hand', x: 73, y: 58, side: 'r' },
  { word: 'thigh', x: 44, y: 60, side: 'l' },
  { word: 'knee', x: 56, y: 72, side: 'r' },
  { word: 'ankle', x: 45, y: 88, side: 'l' },
  { word: 'foot', x: 56, y: 93, side: 'r' },
];

const GROUPS: { tag: string; title: string }[] = [
  { tag: 'face', title: 'Голова и лицо' },
  { tag: 'upper', title: 'Туловище и руки' },
  { tag: 'lower', title: 'Низ и ноги' },
  { tag: 'inside', title: 'Скелет и внутри' },
];

function speak(text: string) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    window.speechSynthesis?.cancel();
    window.speechSynthesis?.speak(u);
  } catch { /* TTS unavailable */ }
}

export function Body() {
  const [words, setWords] = useState<Word[] | null>(null);
  const [added, setAdded] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    api.vocabWords({ category: 'topic-body-parts', limit: 200 }).then((r) => setWords(r.words));
  }, []);

  const byWord = useMemo(() => {
    const m = new Map<string, Word>();
    (words || []).forEach((w) => m.set(w.word, w));
    return m;
  }, [words]);

  const byGroup = useMemo(() => {
    const g: Record<string, Word[]> = {};
    (words || []).forEach((w) => {
      const tag = (w.tags || []).find((t) => GROUPS.some((gr) => gr.tag === t)) || 'inside';
      (g[tag] ||= []).push(w);
    });
    return g;
  }, [words]);

  async function addAll() {
    await api.srsAddSet({ category: 'topic-body-parts' });
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  if (!words) return <Spinner />;

  return (
    <div>
      <Header back title="Тело человека"
        right={
          <button onClick={addAll} className="chip !bg-[var(--color-mint)] !text-[#0d1320] !font-bold">
            {added ? <><Check size={14} /> готово</> : <><Plus size={14} /> в колоду</>}
          </button>
        } />
      <p className="mb-3 px-0.5 text-sm text-[var(--color-muted)]">Нажми на подпись, чтобы услышать слово.</p>

      {/* Labelled figure */}
      <div className="card mb-5 !p-2">
        <div className="relative mx-auto w-full" style={{ aspectRatio: '1 / 2', maxWidth: 360 }}>
          <svg viewBox="0 0 100 200" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet">
            <g fill="var(--color-surface2)" stroke="var(--color-border)" strokeWidth="0.8">
              <circle cx="50" cy="20" r="11" />
              <rect x="46" y="30" width="8" height="8" />
              <path d="M36 38 Q50 34 64 38 L70 92 Q70 96 66 96 L58 96 L55 100 L45 100 L42 96 L34 96 Q30 96 30 92 Z" />
              <path d="M37 40 L24 46 L20 64 L17 84 Q16 88 20 89 Q24 90 25 86 L29 66 L39 52 Z" />
              <path d="M63 40 L76 46 L80 64 L83 84 Q84 88 80 89 Q76 90 75 86 L71 66 L61 52 Z" />
              <path d="M45 99 L43 140 L41 182 Q41 187 46 187 L49 187 Q50 150 50 120 Z" />
              <path d="M55 99 L57 140 L59 182 Q59 187 54 187 L51 187 Q50 150 50 120 Z" />
            </g>
          </svg>
          {LABELS.map((lb) => {
            const w = byWord.get(lb.word);
            if (!w) return null;
            const isActive = active === lb.word;
            return (
              <button
                key={lb.word}
                onClick={() => { setActive(lb.word); speak(lb.word); }}
                className="absolute -translate-y-1/2 rounded-lg px-1.5 py-0.5 text-left leading-tight shadow-sm transition"
                style={{
                  top: `${lb.y}%`,
                  ...(lb.side === 'l' ? { left: 0 } : { right: 0 }),
                  background: isActive ? 'var(--color-primary)' : 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: isActive ? '#160f33' : 'var(--color-text)',
                }}
              >
                <span className="block text-[11px] font-bold">{w.word}</span>
                <span className="block text-[9px] opacity-70">{w.ru}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Full grouped list */}
      <div className="space-y-6">
        {GROUPS.map((grp) => {
          const list = byGroup[grp.tag];
          if (!list?.length) return null;
          return (
            <div key={grp.tag}>
              <h2 className="mb-2.5 px-0.5 text-sm font-semibold text-[var(--color-muted)]">{grp.title}</h2>
              <div className="grid grid-cols-2 gap-2">
                {list.map((w) => (
                  <div key={w.id} className="card flex items-center gap-2 overflow-hidden !p-3">
                    <div className="min-w-0 flex-1">
                      <div className="display truncate font-bold leading-tight">{w.word}</div>
                      <div className="truncate text-xs text-[var(--color-muted)]">{w.ru}</div>
                    </div>
                    <SpeakButton text={w.word} className="!h-7 !w-7 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
