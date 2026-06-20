import { useEffect, useState } from 'react';
import { api } from '../api';
import { Header } from '../components/Header';
import { Spinner, LevelBadge } from '../components/ui';
import type { GrammarMeta, ProgressEntry } from '../types';

const STATUSES = [
  { key: 'learning', emoji: '🌱', label: 'Изучаю' },
  { key: 'consolidating', emoji: '🔧', label: 'Закрепляю' },
  { key: 'confident', emoji: '✅', label: 'Уверенно' },
] as const;

export function ProgressScreen() {
  const [grammar, setGrammar] = useState<GrammarMeta[] | null>(null);
  const [prog, setProg] = useState<Record<string, ProgressEntry>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.grammar(), api.progress()]).then(([g, p]) => {
      setGrammar(g);
      setProg(Object.fromEntries(p.map((e) => [e.topic_id, e])));
    }).finally(() => setLoading(false));
  }, []);

  async function setStatus(id: string, status: string) {
    setProg((p) => ({ ...p, [id]: { ...(p[id] || { topic_id: id }), status } as ProgressEntry }));
    await api.setProgress(id, { status, scheduleReview: status === 'confident' });
  }

  if (loading || !grammar) return <Spinner />;

  const counts = STATUSES.map((s) => ({ ...s, n: Object.values(prog).filter((p) => p.status === s.key).length }));

  return (
    <div>
      <Header back title="Прогресс 📈" subtitle="владение темами — закрываем без ошибок" />

      <div className="mb-4 grid grid-cols-3 gap-2">
        {counts.map((c) => (
          <div key={c.key} className="card !p-3 text-center">
            <div className="text-2xl">{c.emoji}</div>
            <div className="display text-xl font-bold">{c.n}</div>
            <div className="text-[11px] text-[var(--color-muted)]">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {grammar.map((g) => {
          const cur = prog[g.id]?.status;
          const due = prog[g.id]?.review_due;
          return (
            <div key={g.id} className="card !p-3.5">
              <div className="mb-2 flex items-center gap-2">
                <LevelBadge level={g.level} />
                <span className="display flex-1 font-semibold">{g.title}</span>
                {due && new Date(due) <= new Date() && <span className="chip !bg-[color-mix(in_srgb,var(--color-amber)_20%,transparent)] !text-[var(--color-amber)]">🔁 повтор</span>}
              </div>
              <div className="flex gap-1.5">
                {STATUSES.map((s) => (
                  <button key={s.key} onClick={() => setStatus(g.id, s.key)}
                    className={`flex-1 rounded-xl py-2 text-xs font-semibold transition ${cur === s.key ? 'bg-[var(--color-surface2)] text-[var(--color-text)] ring-1 ring-[var(--color-primary)]' : 'bg-[var(--color-bg2)] text-[var(--color-muted)]'}`}>
                    {s.emoji} {s.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
