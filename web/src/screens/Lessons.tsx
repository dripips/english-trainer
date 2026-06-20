import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { api } from '../api';
import { useApi } from '../lib/useApi';
import { Header } from '../components/Header';
import { Spinner, LevelBadge, ProgressBar } from '../components/ui';

export function Lessons() {
  const { data, loading } = useApi(() => api.lessons(), []);
  if (loading || !data) return <Spinner />;

  return (
    <div>
      <Header title="Уроки" subtitle="теория + упражнения с проверкой" />
      <div className="space-y-3">
        {data.map((l) => {
          const pct = l.exerciseCount ? Math.round(((l.attempted || 0) / l.exerciseCount) * 100) : 0;
          return (
            <Link key={l.id} to={`/lessons/${l.id}`} className="card block overflow-hidden active:scale-[0.98]">
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
        })}
      </div>
    </div>
  );
}
