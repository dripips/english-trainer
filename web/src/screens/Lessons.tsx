import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { api } from '../api';
import { useApi } from '../lib/useApi';
import { Header } from '../components/Header';
import { ListSkeleton, LevelBadge, ProgressBar } from '../components/ui';
import type { LessonMeta } from '../types';

const LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;
const LEVEL_TITLE: Record<string, string> = {
  A1: 'Начальный — основа',
  A2: 'Элементарный',
  B1: 'Средний',
  B2: 'Выше среднего',
};

function LessonCard({ l }: { l: LessonMeta & { attempted?: number } }) {
  const pct = l.exerciseCount ? Math.round(((l.attempted || 0) / l.exerciseCount) * 100) : 0;
  return (
    <Link to={`/lessons/${l.id}`} className="card block overflow-hidden active:scale-[0.98]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <LevelBadge level={l.level} />
            <span className="chip">Фаза {l.phase}</span>
          </div>
          <h3 className="display text-base font-bold leading-snug">{l.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted)]">{l.summary}</p>
        </div>
        {pct === 100 && <CheckCircle2 className="shrink-0 text-[var(--color-success)]" size={22} />}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <ProgressBar value={l.attempted || 0} max={l.exerciseCount} color="var(--color-amber)" />
        <span className="shrink-0 text-xs text-[var(--color-muted)]">{l.attempted || 0}/{l.exerciseCount}</span>
      </div>
    </Link>
  );
}

export function Lessons() {
  const { data, loading } = useApi(() => api.lessons(), []);
  const [filter, setFilter] = useState<string>('A1');

  const byLevel = useMemo(() => {
    const g: Record<string, (LessonMeta & { attempted?: number })[]> = {};
    (data || []).filter((l) => l.kind !== 'reading').forEach((l) => { (g[l.level] ||= []).push(l as any); });
    // server already sorts by order; keep stable
    return g;
  }, [data]);

  if (loading || !data) return <div><Header title="Уроки" subtitle="теория + упражнения с проверкой" /><ListSkeleton rows={5} /></div>;

  const visibleLevels = filter === 'all' ? LEVELS.filter((lv) => byLevel[lv]?.length) : [filter];

  return (
    <div>
      <Header title="Уроки" subtitle="теория + упражнения с проверкой" />

      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        {(['all', ...LEVELS] as const).map((lv) => {
          const allCount = Object.values(byLevel).reduce((s, a) => s + a.length, 0);
          const count = lv === 'all' ? allCount : (byLevel[lv]?.length || 0);
          if (lv !== 'all' && !count) return null;
          const active = filter === lv;
          return (
            <button key={lv} onClick={() => setFilter(lv)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition
                ${active ? 'bg-[var(--color-primary)] text-[#160f33]' : 'bg-[var(--color-surface2)] text-[var(--color-muted)]'}`}>
              {lv === 'all' ? `Все · ${count}` : `${lv} · ${count}`}
            </button>
          );
        })}
      </div>

      <div className="space-y-6">
        {visibleLevels.map((lv) => (
          <div key={lv}>
            <div className="mb-2.5 flex items-center gap-2 px-0.5">
              <LevelBadge level={lv} />
              <span className="text-sm font-semibold text-[var(--color-muted)]">{LEVEL_TITLE[lv]}</span>
              <span className="ml-auto text-xs text-[var(--color-muted)]">{byLevel[lv]?.length || 0} уроков</span>
            </div>
            <div className="space-y-3">
              {(byLevel[lv] || []).map((l) => <LessonCard key={l.id} l={l} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
