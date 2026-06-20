import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useApi } from '../lib/useApi';
import { Header } from '../components/Header';
import { Spinner, LevelBadge } from '../components/ui';

export function Grammar() {
  const { data, loading } = useApi(() => api.grammar(), []);
  const [q, setQ] = useState('');
  if (loading || !data) return <Spinner />;

  const list = data.filter((g) => g.title.toLowerCase().includes(q.toLowerCase()) || (g.summary || '').toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <Header back title="Грамматика 📐" subtitle="правила с примерами" />
      <input className="input mb-4" placeholder="Поиск правила…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="space-y-3">
        {list.map((g) => (
          <Link key={g.id} to={`/grammar/${g.id}`} className="card block active:scale-[0.98]">
            <div className="mb-1 flex items-center gap-2">
              <LevelBadge level={g.level} />
              {g.tags?.slice(0, 2).map((t) => <span key={t} className="chip">{t}</span>)}
            </div>
            <h3 className="display font-bold">{g.title}</h3>
            <p className="mt-1 text-sm text-[var(--color-muted)]">{g.summary}</p>
          </Link>
        ))}
        {!list.length && <p className="py-8 text-center text-[var(--color-muted)]">Ничего не найдено</p>}
      </div>
    </div>
  );
}
