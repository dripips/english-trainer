import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookText, CheckCircle2 } from 'lucide-react';
import { api } from '../api';
import { useApi } from '../lib/useApi';
import { Header } from '../components/Header';
import { ListSkeleton, LevelBadge } from '../components/ui';
import type { LessonMeta } from '../types';

const LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;

function StoryCard({ l }: { l: LessonMeta & { attempted?: number } }) {
  const [coverOk, setCoverOk] = useState(true);
  const done = l.exerciseCount > 0 && (l.attempted || 0) >= l.exerciseCount;
  return (
    <Link to={`/lessons/${l.id}`} className="card block overflow-hidden !p-0 active:scale-[0.98]">
      {coverOk && (
        <div className="relative">
          <img src={`/reading/${l.id}.webp`} alt="" loading="lazy" onError={() => setCoverOk(false)}
            className="aspect-[16/9] w-full object-cover" />
          {done && (
            <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-[var(--color-surface)]/90">
              <CheckCircle2 size={18} className="text-[var(--color-success)]" />
            </span>
          )}
        </div>
      )}
      <div className="flex items-start gap-3 p-3.5">
        {!coverOk && <BookText size={20} className="mt-0.5 shrink-0 text-[var(--color-sky)]" />}
        <div className="min-w-0 flex-1">
          <h3 className="display text-base font-bold leading-snug">{l.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted)]">{l.summary}</p>
          {l.exerciseCount > 0 && <p className="mt-1 text-xs text-[var(--color-muted)]">{l.exerciseCount} вопросов на понимание</p>}
        </div>
        {!coverOk && done && <CheckCircle2 className="shrink-0 text-[var(--color-success)]" size={20} />}
      </div>
    </Link>
  );
}

export function Reading() {
  const { data, loading } = useApi(() => api.lessons(), []);
  const [filter, setFilter] = useState<string>('A1');

  const byLevel = useMemo(() => {
    const g: Record<string, (LessonMeta & { attempted?: number })[]> = {};
    (data || []).filter((l) => l.kind === 'reading').forEach((l) => { (g[l.level] ||= []).push(l as any); });
    return g;
  }, [data]);

  if (loading || !data) return <div><Header back title="Чтение" subtitle="короткие тексты и сказки с переводом" /><ListSkeleton rows={4} image /></div>;

  const hasAny = Object.keys(byLevel).length > 0;
  const visibleLevels = filter === 'all' ? LEVELS.filter((lv) => byLevel[lv]?.length) : [filter];

  return (
    <div>
      <Header back title="Чтение" subtitle="короткие тексты с переводом и вопросами" />

      {!hasAny ? (
        <p className="py-10 text-center text-[var(--color-muted)]">Тексты скоро появятся.</p>
      ) : (
        <>
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
              (byLevel[lv]?.length ? (
                <div key={lv}>
                  <div className="mb-2.5 flex items-center gap-2 px-0.5">
                    <LevelBadge level={lv} />
                    <span className="ml-auto text-xs text-[var(--color-muted)]">{byLevel[lv].length} текстов</span>
                  </div>
                  <div className="space-y-3">
                    {byLevel[lv].map((l) => <StoryCard key={l.id} l={l} />)}
                  </div>
                </div>
              ) : null)
            ))}
          </div>
        </>
      )}
    </div>
  );
}
