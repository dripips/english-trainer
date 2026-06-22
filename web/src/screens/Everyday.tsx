import { useEffect, useMemo, useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { api } from '../api';
import { Header } from '../components/Header';
import { Spinner, SpeakButton } from '../components/ui';
import type { Word } from '../types';

const GROUPS: { topic: string; title: string; emoji: string; cols: number }[] = [
  { topic: 'days', title: 'Дни недели', emoji: '📅', cols: 1 },
  { topic: 'months', title: 'Месяцы', emoji: '🗓️', cols: 2 },
  { topic: 'numbers', title: 'Числа', emoji: '🔢', cols: 2 },
  { topic: 'ordinals', title: 'Порядковые (1-й, 2-й…)', emoji: '🥇', cols: 2 },
  { topic: 'colors', title: 'Цвета', emoji: '🎨', cols: 2 },
  { topic: 'seasons', title: 'Времена года', emoji: '🌦️', cols: 2 },
];

export function Everyday() {
  const [words, setWords] = useState<Word[] | null>(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    api.vocabWords({ category: 'everyday-core', limit: 200 }).then((r) => setWords(r.words));
  }, []);

  const byTopic = useMemo(() => {
    const g: Record<string, Word[]> = {};
    (words || []).forEach((w) => { (g[w.topic] ||= []).push(w); });
    return g;
  }, [words]);

  async function addAll() {
    await api.srsAddSet({ category: 'everyday-core' });
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  if (!words) return <Spinner />;

  return (
    <div>
      <Header back title="Каждый день"
        right={
          <button onClick={addAll} className="chip !bg-[var(--color-mint)] !text-[#0d1320] !font-bold">
            {added ? <><Check size={14} /> готово</> : <><Plus size={14} /> в колоду</>}
          </button>
        } />
      <p className="mb-4 px-0.5 text-sm text-[var(--color-muted)]">Базовые слова на каждый день. Нажми на слово, чтобы услышать произношение.</p>

      <div className="space-y-6">
        {GROUPS.map((grp) => {
          const list = byTopic[grp.topic];
          if (!list?.length) return null;
          return (
            <div key={grp.topic}>
              <h2 className="mb-2.5 px-0.5 text-sm font-semibold text-[var(--color-muted)]">{grp.emoji} {grp.title}</h2>
              <div className={`grid gap-2 ${grp.cols === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
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
