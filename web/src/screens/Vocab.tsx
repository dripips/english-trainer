import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useApi } from '../lib/useApi';
import { Header } from '../components/Header';
import { Spinner, LevelBadge, EmptyState } from '../components/ui';
import { WordCard } from '../components/WordCard';
import type { Word } from '../types';

export function Vocab() {
  const { data: cats, loading } = useApi(() => api.vocabCategories(), []);
  const [cat, setCat] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [words, setWords] = useState<Word[]>([]);
  const [wLoading, setWLoading] = useState(false);
  const [addedMsg, setAddedMsg] = useState('');

  const searching = search.trim().length >= 2;

  useEffect(() => {
    if (!cat && !searching) { setWords([]); return; }
    setWLoading(true);
    const q = searching ? { search: search.trim(), limit: 100 } : { category: cat!, limit: 500 };
    api.vocabWords(q).then((r) => setWords(r.words)).finally(() => setWLoading(false));
  }, [cat, search, searching]);

  const grouped = useMemo(() => {
    const g: Record<string, typeof cats> = {};
    (cats || []).forEach((c) => { (g[c.level] ||= [] as any).push(c); });
    return g;
  }, [cats]);

  async function addWholeSet() {
    if (!cat) return;
    const r = await api.srsAddSet({ category: cat });
    setAddedMsg(`Добавлено ${r.added} слов в колоду ✅`);
    setWords((ws) => ws.map((w) => ({ ...w, inDeck: true })));
    setTimeout(() => setAddedMsg(''), 2500);
  }

  if (loading || !cats) return <Spinner />;

  // detail view
  if (cat || searching) {
    const title = searching ? `Поиск: «${search}»` : (cats.find((c) => c.category === cat)?.title || cat!);
    return (
      <div>
        <Header back title={title} right={!searching ? <button onClick={addWholeSet} className="chip !bg-[var(--color-mint)] !text-[#0d1320] !font-bold">+ всё</button> : undefined} />
        {addedMsg && <div className="mb-3 rounded-2xl bg-[color-mix(in_srgb,var(--color-success)_16%,transparent)] p-3 text-center text-sm font-semibold text-[var(--color-success)]">{addedMsg}</div>}
        {wLoading ? <Spinner /> : (
          <div className="space-y-3">
            {words.map((w) => <WordCard key={w.id} word={w} />)}
            {!words.length && <EmptyState emoji="🔍" title="Пусто" hint="Слова не найдены" />}
          </div>
        )}
      </div>
    );
  }

  // categories view
  return (
    <div>
      <Header back title="Словарь 📚" subtitle="выбери набор и добавь слова в колоду" />
      <input className="input mb-4" placeholder="Искать слово (EN или RU)…" value={search} onChange={(e) => setSearch(e.target.value)} autoCapitalize="none" />
      {Object.keys(grouped).sort().map((level) => (
        <div key={level} className="mb-5">
          <div className="mb-2 flex items-center gap-2"><LevelBadge level={level} /><span className="text-sm text-[var(--color-muted)]">уровень</span></div>
          <div className="grid grid-cols-2 gap-3">
            {grouped[level]!.map((c) => (
              <button key={c.category} onClick={() => setCat(c.category)} className="card text-left active:scale-[0.97] !p-3.5">
                <div className="display font-bold leading-snug">{c.title.replace(/^[A-C][12]\s*[—-]\s*/, '')}</div>
                <div className="mt-1 text-xs text-[var(--color-muted)]">{c.count} слов · {c.pos}</div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
