import { useEffect, useMemo, useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { api } from '../api';
import { Header } from '../components/Header';
import { Spinner, SpeakButton } from '../components/ui';
import type { Word } from '../types';

// All coordinates are in the SVG viewBox (0 0 340 540) so labels, leader lines and
// the figure always stay perfectly aligned regardless of screen size.
type Lbl = { word: string; bx: number; by: number; ly: number; side: 'l' | 'r' };
const LABELS: Lbl[] = [
  // left column
  { word: 'eye', bx: 160, by: 46, ly: 52, side: 'l' },
  { word: 'neck', bx: 170, by: 84, ly: 104, side: 'l' },
  { word: 'chest', bx: 170, by: 135, ly: 158, side: 'l' },
  { word: 'stomach', bx: 168, by: 190, ly: 214, side: 'l' },
  { word: 'hip', bx: 150, by: 242, ly: 270, side: 'l' },
  { word: 'thigh', bx: 158, by: 320, ly: 340, side: 'l' },
  { word: 'ankle', bx: 152, by: 470, ly: 474, side: 'l' },
  // right column
  { word: 'hair', bx: 170, by: 24, ly: 30, side: 'r' },
  { word: 'ear', bx: 197, by: 50, ly: 84, side: 'r' },
  { word: 'shoulder', bx: 203, by: 92, ly: 138, side: 'r' },
  { word: 'arm', bx: 224, by: 150, ly: 192, side: 'r' },
  { word: 'elbow', bx: 232, by: 202, ly: 246, side: 'r' },
  { word: 'hand', bx: 236, by: 252, ly: 300, side: 'r' },
  { word: 'knee', bx: 188, by: 384, ly: 388, side: 'r' },
  { word: 'foot', bx: 188, by: 508, ly: 504, side: 'r' },
];
const L_TEXT = 8, L_INNER = 70, R_TEXT = 332, R_INNER = 270;

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

      {/* Labelled anatomical figure — everything drawn in one SVG for perfect alignment */}
      <div className="card mb-5 !px-1 !py-3">
        <svg viewBox="0 0 340 540" className="w-full" style={{ maxHeight: '70vh' }}>
          <defs>
            <linearGradient id="bodyfill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-surface2)" />
              <stop offset="100%" stopColor="var(--color-bg2)" />
            </linearGradient>
          </defs>

          {/* figure */}
          <g fill="url(#bodyfill)" stroke="var(--color-border)" strokeWidth="1.5" strokeLinejoin="round">
            <circle cx="170" cy="50" r="30" />
            <path d="M160 76 h20 v12 h-20 Z" />
            <path d="M138 86 Q170 78 202 86 L210 140 Q214 166 205 196 L196 250 Q170 260 144 250 L135 196 Q126 166 130 140 Z" />
            <path d="M140 90 Q121 96 115 117 L99 206 Q97 221 108 221 Q119 221 121 208 L134 129 Q139 109 150 103 Z" />
            <path d="M200 90 Q219 96 225 117 L241 206 Q243 221 232 221 Q221 221 219 208 L206 129 Q201 109 190 103 Z" />
            <path d="M150 250 Q150 332 145 416 L141 506 Q141 518 154 518 Q166 518 166 506 L169 382 Q170 332 170 296 Z" />
            <path d="M190 250 Q190 332 195 416 L199 506 Q199 518 186 518 Q174 518 174 506 L171 382 Q170 332 170 296 Z" />
          </g>

          {/* labels with leader lines */}
          {LABELS.map((lb) => {
            const w = byWord.get(lb.word);
            if (!w) return null;
            const isA = active === lb.word;
            const left = lb.side === 'l';
            const innerX = left ? L_INNER : R_INNER;
            const textX = left ? L_TEXT : R_TEXT;
            const accent = isA ? 'var(--color-primary)' : 'var(--color-muted)';
            return (
              <g key={lb.word} onClick={() => { setActive(lb.word); speak(lb.word); }} style={{ cursor: 'pointer' }}>
                <rect x={left ? 0 : 244} y={lb.ly - 15} width={96} height={28} fill="transparent" />
                <polyline
                  points={`${lb.bx},${lb.by} ${innerX},${lb.ly - 5}`}
                  fill="none" stroke={isA ? 'var(--color-primary)' : 'var(--color-border)'} strokeWidth={isA ? 1.8 : 1}
                />
                <circle cx={lb.bx} cy={lb.by} r={isA ? 4 : 3} fill={isA ? 'var(--color-primary)' : 'var(--color-muted)'} />
                <text x={textX} y={lb.ly} textAnchor={left ? 'start' : 'end'} fontSize="14" fontWeight="700"
                  fill={isA ? 'var(--color-primary)' : 'var(--color-text)'}>{w.word}</text>
                <text x={textX} y={lb.ly + 13} textAnchor={left ? 'start' : 'end'} fontSize="10.5" fill={accent}>{w.ru}</text>
              </g>
            );
          })}
        </svg>
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
