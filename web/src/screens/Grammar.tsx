import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Clock } from 'lucide-react';
import { api } from '../api';
import { useApi } from '../lib/useApi';
import { Header } from '../components/Header';
import { ListSkeleton, LevelBadge } from '../components/ui';
import type { GrammarMeta } from '../types';

// Group grammar cards into themed sections for a proper reference.
const CATEGORIES: { title: string; ids: string[] }[] = [
  { title: 'Времена', ids: ['present-simple', 'present-continuous', 'past-simple', 'past-continuous', 'present-perfect', 'future-will', 'future-going-to'] },
  { title: 'Основы', ids: ['to-be', 'there-is-there-are', 'this-that-these-those', 'question-words', 'possessives', 'plurals'] },
  { title: 'Модальные глаголы', ids: ['can-could', 'modals-should-must'] },
  { title: 'Артикли и существительные', ids: ['articles-a-an', 'articles-the', 'countable-uncountable'] },
  { title: 'Предлоги', ids: ['prep-place-in-on-at', 'prep-time-in-on-at'] },
  { title: 'Прилагательные и наречия', ids: ['comparatives-superlatives', 'adverbs-frequency'] },
  { title: 'Условные предложения', ids: ['conditionals-0-1', 'conditionals-2'] },
  { title: 'Структура предложения', ids: ['passive-voice', 'relative-clauses', 'word-order'] },
];

function GrammarLink({ g }: { g: GrammarMeta }) {
  return (
    <Link to={`/grammar/${g.id}`} className="card block overflow-hidden active:scale-[0.98]">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <LevelBadge level={g.level} />
        {g.tags?.slice(0, 2).map((t) => <span key={t} className="chip">{t}</span>)}
      </div>
      <h3 className="display font-bold">{g.title}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted)]">{g.summary}</p>
    </Link>
  );
}

export function Grammar() {
  const { data, loading } = useApi(() => api.grammar(), []);
  const [q, setQ] = useState('');

  const byId = useMemo(() => {
    const m = new Map<string, GrammarMeta>();
    (data || []).forEach((g) => m.set(g.id, g));
    return m;
  }, [data]);

  if (loading || !data) return <div><Header back title="Правила" subtitle="справочник грамматики" /><ListSkeleton rows={6} /></div>;

  const query = q.trim().toLowerCase();
  const allTenses = byId.get('all-tenses');

  // Search mode: flat filtered list across everything.
  if (query) {
    const list = data.filter((g) => g.title.toLowerCase().includes(query) || (g.summary || '').toLowerCase().includes(query));
    return (
      <div>
        <Header back title="Правила" subtitle="справочник грамматики" />
        <div className="relative mb-4">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
          <input className="input pl-10" placeholder="Поиск правила…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="space-y-3">
          {list.map((g) => <GrammarLink key={g.id} g={g} />)}
          {!list.length && <p className="py-8 text-center text-[var(--color-muted)]">Ничего не найдено</p>}
        </div>
      </div>
    );
  }

  // Cards not covered by any category bucket go into a final "Прочее" section.
  const categorisedIds = new Set(CATEGORIES.flatMap((c) => c.ids).concat('all-tenses'));
  const leftover = data.filter((g) => !categorisedIds.has(g.id));

  return (
    <div>
      <Header back title="Правила" subtitle="справочник грамматики" />
      <div className="relative mb-4">
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
        <input className="input pl-10" placeholder="Поиск правила…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {/* Featured: all tenses cheat sheet */}
      {allTenses && (
        <Link to={`/grammar/${allTenses.id}`}
          className="card mb-5 block overflow-hidden bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary2)] !border-transparent active:scale-[0.98]">
          <div className="flex items-center gap-3 text-[#160f33]">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/25"><Clock size={24} /></div>
            <div className="min-w-0 flex-1">
              <div className="display font-bold leading-tight">Все времена — шпаргалка</div>
              <div className="truncate text-sm opacity-80">12 времён в одной таблице: формула + когда + пример</div>
            </div>
          </div>
        </Link>
      )}

      <div className="space-y-6">
        {CATEGORIES.map((cat) => {
          const cards = cat.ids.map((id) => byId.get(id)).filter(Boolean) as GrammarMeta[];
          if (!cards.length) return null;
          return (
            <div key={cat.title}>
              <h2 className="mb-2.5 px-0.5 text-sm font-semibold text-[var(--color-muted)]">{cat.title}</h2>
              <div className="space-y-3">{cards.map((g) => <GrammarLink key={g.id} g={g} />)}</div>
            </div>
          );
        })}
        {leftover.length > 0 && (
          <div>
            <h2 className="mb-2.5 px-0.5 text-sm font-semibold text-[var(--color-muted)]">Прочее</h2>
            <div className="space-y-3">{leftover.map((g) => <GrammarLink key={g.id} g={g} />)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
