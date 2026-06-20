import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useApi } from '../lib/useApi';
import { Header } from '../components/Header';
import { Spinner, LevelBadge } from '../components/ui';
import { Markdown } from '../components/Markdown';
import { ExercisePlayer } from '../components/ExercisePlayer';

export function LessonScreen() {
  const { id } = useParams();
  const { data: lesson, loading } = useApi(() => api.lesson(id!), [id]);
  const [tab, setTab] = useState<'theory' | 'practice'>('theory');

  if (loading || !lesson) return <Spinner />;

  return (
    <div>
      <Header back title={lesson.title} subtitle={lesson.murphy || undefined} right={<LevelBadge level={lesson.level} />} />

      <div className="mb-4 flex rounded-2xl bg-[var(--color-bg2)] p-1">
        {(['theory', 'practice'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${tab === t ? 'bg-[var(--color-surface2)] text-[var(--color-text)]' : 'text-[var(--color-muted)]'}`}>
            {t === 'theory' ? '📖 Теория' : `✍️ Упражнения (${lesson.exercises.length})`}
          </button>
        ))}
      </div>

      {tab === 'theory' ? (
        <div className="space-y-4">
          {lesson.warmup?.length > 0 && (
            <div className="card !bg-[color-mix(in_srgb,var(--color-amber)_10%,var(--color-surface))]">
              <div className="display mb-1 font-bold">🔥 Разминка</div>
              <ul className="ml-4 list-disc text-sm text-[var(--color-text)]">
                {lesson.warmup.map((w, i) => <li key={i} className="my-0.5">{w}</li>)}
              </ul>
            </div>
          )}
          <div className="card"><Markdown>{lesson.theory}</Markdown></div>

          {lesson.grammarRefs?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {lesson.grammarRefs.map((g) => (
                <Link key={g} to={`/grammar/${g}`} className="chip !bg-[var(--color-surface2)] !text-[var(--color-sky)]">📐 {g}</Link>
              ))}
            </div>
          )}
          <button className="btn btn-primary w-full" onClick={() => setTab('practice')}>Перейти к упражнениям →</button>
        </div>
      ) : (
        <ExercisePlayer
          exercises={lesson.exercises}
          onAttempt={(exId, correct, answer) => { api.attempt(lesson.id, exId, correct, answer).catch(() => {}); }}
        />
      )}
    </div>
  );
}
