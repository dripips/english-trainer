import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Headphones, CheckCircle2 } from 'lucide-react';
import { api } from '../api';
import { useApi } from '../lib/useApi';
import { Header } from '../components/Header';
import { ListSkeleton, LevelBadge } from '../components/ui';
import type { LessonMeta } from '../types';

const LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;

export function Listening() {
  const { data, loading } = useApi(() => api.lessons(), []);

  const byLevel = useMemo(() => {
    const g: Record<string, (LessonMeta & { attempted?: number })[]> = {};
    (data || []).filter((l) => l.kind !== 'reading' && l.tags?.includes('listening'))
      .forEach((l) => { (g[l.level] ||= []).push(l as any); });
    return g;
  }, [data]);

  if (loading || !data) return <div><Header back title="Аудирование" subtitle="слушай и записывай — тренировка на слух" /><ListSkeleton rows={5} /></div>;

  const levels = LEVELS.filter((lv) => byLevel[lv]?.length);

  return (
    <div>
      <Header back title="Аудирование" subtitle="слушай и записывай — тренировка на слух" />

      <div className="card mb-4 flex items-start gap-3 !bg-[color-mix(in_srgb,var(--color-sky)_10%,var(--color-surface))]">
        <Headphones size={22} className="mt-0.5 shrink-0 text-[var(--color-sky)]" />
        <p className="text-sm text-[var(--color-muted)]">Нажми 🔊, послушай фразу и запиши, что услышал. Озвучка — настоящим голосом (ElevenLabs).</p>
      </div>

      {!levels.length ? (
        <p className="py-10 text-center text-[var(--color-muted)]">Скоро появится.</p>
      ) : (
        <div className="space-y-6">
          {levels.map((lv) => (
            <div key={lv}>
              <div className="mb-2.5 flex items-center gap-2 px-0.5">
                <LevelBadge level={lv} />
                <span className="ml-auto text-xs text-[var(--color-muted)]">{byLevel[lv].length} уроков</span>
              </div>
              <div className="space-y-3">
                {byLevel[lv].map((l) => {
                  const done = l.exerciseCount > 0 && (l.attempted || 0) >= l.exerciseCount;
                  return (
                    <Link key={l.id} to={`/lessons/${l.id}`} className="card flex items-start gap-3 overflow-hidden active:scale-[0.98]">
                      <Headphones size={20} className="mt-0.5 shrink-0 text-[var(--color-sky)]" />
                      <div className="min-w-0 flex-1">
                        <h3 className="display text-base font-bold leading-snug">{l.title.replace(/^Аудирование:\s*/, '')}</h3>
                        <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted)]">{l.summary}</p>
                        <p className="mt-1 text-xs text-[var(--color-muted)]">{l.exerciseCount} фраз на слух</p>
                      </div>
                      {done && <CheckCircle2 className="shrink-0 text-[var(--color-success)]" size={20} />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
