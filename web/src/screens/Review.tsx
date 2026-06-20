import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PartyPopper, Trophy, Library, MousePointerClick } from 'lucide-react';
import { api } from '../api';
import { useApi } from '../lib/useApi';
import { Header } from '../components/Header';
import { Spinner, EmptyState, SpeakButton } from '../components/ui';
import { speak } from '../lib/speech';
import type { Rating, QueueItem } from '../types';

const RATINGS: { key: Rating; label: string; color: string }[] = [
  { key: 'again', label: 'Снова', color: 'var(--color-danger)' },
  { key: 'hard', label: 'Трудно', color: 'var(--color-amber)' },
  { key: 'good', label: 'Хорошо', color: 'var(--color-mint)' },
  { key: 'easy', label: 'Легко', color: 'var(--color-sky)' },
];

export function Review() {
  const { data, loading, refetch } = useApi(() => api.srsQueue(), []);
  const [idx, setIdx] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [done, setDone] = useState(0);

  if (loading || !data) return <Spinner />;
  const queue: QueueItem[] = data.cards;

  if (!queue.length) {
    return (
      <div>
        <Header back title="Карточки" />
        <EmptyState icon={PartyPopper} title="Всё повторено!" hint="На сегодня карточек нет. Добавь новые слова из словаря или загляни позже."
          action={<Link to="/vocab" className="btn btn-primary">К словарю</Link>} />
      </div>
    );
  }

  if (idx >= queue.length) {
    return (
      <div>
        <Header back title="Карточки" />
        <div className="card animate-pop flex flex-col items-center text-center">
          <Trophy size={56} className="text-[var(--color-amber)]" />
          <div className="display mt-2 text-2xl font-bold">{done} {done === 1 ? 'карточка' : 'карточек'} готово</div>
          <p className="mt-1 text-[var(--color-muted)]">Отличная работа!</p>
          <button className="btn btn-primary mt-4 w-full" onClick={() => { setIdx(0); setShowBack(false); setDone(0); refetch(); }}>Проверить ещё</button>
        </div>
      </div>
    );
  }

  const item = queue[idx];
  const w = item.word;

  async function rate(r: Rating) {
    try { await api.srsReview(w.id, r); } catch { /* offline */ }
    setDone((d) => d + 1);
    setShowBack(false);
    setIdx((x) => x + 1);
  }

  function flip() {
    if (!showBack) { setShowBack(true); speak(w.word); }
  }

  return (
    <div>
      <Header back title="Карточки" subtitle={`${idx + 1} из ${queue.length}`} />
      <div className="mb-4 h-2.5 overflow-hidden rounded-full bg-[var(--color-surface2)]">
        <div className="h-full rounded-full bg-[var(--color-primary)] transition-all" style={{ width: `${(idx / queue.length) * 100}%` }} />
      </div>

      <div onClick={flip} className="card animate-pop min-h-[16rem] cursor-pointer select-none overflow-hidden">
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
          <div className="flex items-center gap-2">
            <span className="display text-3xl font-bold">{w.word}</span>
            <SpeakButton text={w.word} />
          </div>
          {w.ipa && <div className="text-[var(--color-muted)]">{w.ipa}</div>}
          <span className="chip mt-1">{w.pos}{item.card.state === 'new' ? ' · новое' : ''}</span>

          {showBack ? (
            <div className="animate-slideup mt-4 w-full border-t border-[var(--color-border)] pt-4">
              <div className="display break-words text-2xl font-bold text-[var(--color-mint)]">{w.ru}</div>
              {w.exampleEn && (
                <p className="mt-3 break-words text-sm text-[var(--color-muted)]">
                  <span className="text-[var(--color-text)]">{w.exampleEn}</span>
                  {w.exampleRu && <><br />{w.exampleRu}</>}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-6 flex items-center gap-1.5 text-sm text-[var(--color-muted)]"><MousePointerClick size={15} /> нажми, чтобы увидеть перевод</p>
          )}
        </div>
      </div>

      <div className="mt-4">
        {showBack ? (
          <div className="grid grid-cols-4 gap-2">
            {RATINGS.map((r) => (
              <button key={r.key} onClick={() => rate(r.key)} className="btn !py-3 !text-sm" style={{ background: `color-mix(in srgb, ${r.color} 20%, var(--color-surface))`, color: r.color }}>
                {r.label}
              </button>
            ))}
          </div>
        ) : (
          <button onClick={flip} className="btn btn-primary w-full">Показать ответ</button>
        )}
      </div>
    </div>
  );
}
