import { useEffect, useState } from 'react';
import { Sprout, Wrench, CheckCircle2, RotateCcw, type LucideIcon } from 'lucide-react';
import { api } from '../api';
import { Header } from '../components/Header';
import { Spinner, LevelBadge } from '../components/ui';
import type { GrammarMeta, ProgressEntry } from '../types';

const STATUSES: { key: string; icon: LucideIcon; label: string; color: string }[] = [
  { key: 'learning', icon: Sprout, label: 'Изучаю', color: 'var(--color-mint)' },
  { key: 'consolidating', icon: Wrench, label: 'Закрепляю', color: 'var(--color-amber)' },
  { key: 'confident', icon: CheckCircle2, label: 'Уверенно', color: 'var(--color-success)' },
];

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
      <Header back title="Прогресс" subtitle="владение темами — закрываем без ошибок" />

      <div className="mb-4 grid grid-cols-3 gap-2">
        {counts.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.key} className="card flex flex-col items-center gap-1 !p-3 text-center">
              <Icon size={22} style={{ color: c.color }} />
              <div className="display text-xl font-bold">{c.n}</div>
              <div className="text-[11px] text-[var(--color-muted)]">{c.label}</div>
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        {grammar.map((g) => {
          const cur = prog[g.id]?.status;
          const due = prog[g.id]?.review_due;
          return (
            <div key={g.id} className="card overflow-hidden !p-3.5">
              <div className="mb-2 flex items-center gap-2">
                <LevelBadge level={g.level} />
                <span className="display min-w-0 flex-1 truncate font-semibold">{g.title}</span>
                {due && new Date(due) <= new Date() && <RotateCcw size={16} className="shrink-0 text-[var(--color-amber)]" />}
              </div>
              <div className="flex gap-1.5">
                {STATUSES.map((s) => {
                  const Icon = s.icon;
                  const active = cur === s.key;
                  return (
                    <button key={s.key} onClick={() => setStatus(g.id, s.key)}
                      className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-xs font-semibold transition ${active ? 'bg-[var(--color-surface2)] text-[var(--color-text)] ring-1 ring-[var(--color-primary)]' : 'bg-[var(--color-bg2)] text-[var(--color-muted)]'}`}
                      style={active ? { color: s.color } : undefined}>
                      <Icon size={15} /> <span className="truncate">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
