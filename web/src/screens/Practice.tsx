import { useState } from 'react';
import { Zap, Target, TrendingUp, AlertCircle, RotateCcw, ChevronRight, Flame } from 'lucide-react';
import { api } from '../api';
import type { PracticeItem, PracticeStats } from '../types';
import { useApi } from '../lib/useApi';
import { Header } from '../components/Header';
import { Spinner, LevelBadge } from '../components/ui';
import { ExercisePlayer } from '../components/ExercisePlayer';

const LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;

export function Practice() {
  const [level, setLevel] = useState<string | null>(null);
  const [session, setSession] = useState<PracticeItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionScore, setSessionScore] = useState<{ correct: number; total: number } | null>(null);
  const { data: stats, refetch } = useApi(() => api.practiceStats(), []);

  async function startSession() {
    setLoading(true);
    setSessionScore(null);
    try {
      const res = await api.practiceQueue(20, level ?? undefined);
      setSession(res.items);
    } finally {
      setLoading(false);
    }
  }

  function handleFinish(score: { correct: number; total: number }) {
    setSessionScore(score);
    setSession(null);
    refetch?.();
  }

  if (session) {
    return (
      <div>
        <Header back title="Тренировка" onBack={() => setSession(null)} />
        <ExercisePlayer
          exercises={session.map((i) => i.exercise)}
          labels={session.map((i) => `${i.level} · ${i.lessonTitle}`)}
          onAttempt={(exId, correct, answer) => {
            const item = session.find((i) => i.exercise.id === exId);
            if (item) api.attempt(item.lessonId, exId, correct, answer).catch(() => {});
          }}
          onFinish={handleFinish}
        />
      </div>
    );
  }

  if (sessionScore) {
    const pct = Math.round((sessionScore.correct / sessionScore.total) * 100);
    return (
      <div>
        <Header title="Тренировка" />
        <div className="card flex flex-col items-center gap-3 py-8 text-center">
          <div className="text-5xl">{pct >= 90 ? '🏆' : pct >= 70 ? '🎉' : pct >= 50 ? '💪' : '🌱'}</div>
          <div className="display text-3xl font-bold">{sessionScore.correct} / {sessionScore.total}</div>
          <div className="text-[var(--color-muted)]">
            {pct >= 90 ? 'Великолепно!' : pct >= 70 ? 'Хорошо!' : pct >= 50 ? 'Неплохо, повтори ещё.' : 'Продолжай — это разминка мозга.'}
          </div>
          <button className="btn btn-primary mt-2 w-full" onClick={startSession}>
            <RotateCcw size={18} /> Ещё 20 упражнений
          </button>
          <button className="btn btn-soft w-full" onClick={() => setSessionScore(null)}>
            На главную практики
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Header title="Практика" subtitle="Тренируй грамматику каждый день" />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<Target size={20} className="text-[var(--color-primary)]" />}
            label="Всего заданий"
            value={stats.total}
          />
          <StatCard
            icon={<TrendingUp size={20} className="text-[var(--color-mint)]" />}
            label="Верно"
            value={stats.total ? `${Math.round(100 * stats.correct / stats.total)}%` : '—'}
          />
          <StatCard
            icon={<Flame size={20} className="text-[var(--color-amber)]" />}
            label="Сегодня"
            value={stats.todayCount}
          />
          <StatCard
            icon={<Zap size={20} className="text-[var(--color-sky)]" />}
            label="Верно сегодня"
            value={stats.todayCount ? `${Math.round(100 * stats.todayCorrect / stats.todayCount)}%` : '—'}
          />
        </div>
      )}

      {/* Level filter */}
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Уровень</div>
        <div className="flex gap-2">
          <button
            onClick={() => setLevel(null)}
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${!level ? 'bg-[var(--color-primary)] text-[#14102e]' : 'bg-[var(--color-surface2)] text-[var(--color-muted)]'}`}
          >
            Все
          </button>
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => setLevel(level === l ? null : l)}
              className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${level === l ? 'bg-[var(--color-primary)] text-[#14102e]' : 'bg-[var(--color-surface2)] text-[var(--color-muted)]'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={startSession}
        disabled={loading}
        className="btn btn-primary w-full !h-14 !text-base"
      >
        {loading ? <Spinner /> : <><Zap size={20} /> Начать тренировку (20 заданий)</>}
      </button>

      {/* Weak spots */}
      {stats?.weakSpots && stats.weakSpots.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            <AlertCircle size={13} /> Слабые места
          </div>
          <div className="space-y-2">
            {stats.weakSpots.map((w) => (
              <div key={w.lessonId} className="card flex items-center gap-3 !py-3">
                <div className="h-9 w-9 shrink-0 rounded-xl bg-[color-mix(in_srgb,var(--color-danger)_15%,transparent)] grid place-items-center">
                  <span className="text-sm font-bold text-[var(--color-danger)]">{w.correctRate}%</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{w.title}</div>
                  <div className="text-xs text-[var(--color-muted)]">Нужно повторить</div>
                </div>
                <button
                  onClick={() => { setLevel(null); startSession(); }}
                  className="shrink-0 text-[var(--color-muted)]"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="card !bg-[color-mix(in_srgb,var(--color-sky)_10%,var(--color-surface))]">
        <div className="display mb-1 text-sm font-bold text-[var(--color-sky)]">Как работает практика</div>
        <ul className="space-y-1 text-xs text-[var(--color-muted)]">
          <li>• Упражнения из всех уроков — {'>'}340 заданий</li>
          <li>• Темы с ошибками появляются чаще</li>
          <li>• Хорошо освоенные темы — реже</li>
          <li>• Занимайся 10–15 минут в день</li>
        </ul>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="card flex items-center gap-3 !py-3">
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-lg font-bold leading-tight">{value}</div>
        <div className="truncate text-xs text-[var(--color-muted)]">{label}</div>
      </div>
    </div>
  );
}
