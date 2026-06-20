import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useApi } from '../lib/useApi';
import { Header } from '../components/Header';
import { Spinner, LevelBadge } from '../components/ui';
import { Markdown } from '../components/Markdown';

export function GrammarCardScreen() {
  const { id } = useParams();
  const { data, loading } = useApi(() => api.grammarCard(id!), [id]);
  if (loading || !data) return <Spinner />;

  return (
    <div>
      <Header back title={data.title} right={<LevelBadge level={data.level} />} />
      <div className="card mb-4"><Markdown>{data.body}</Markdown></div>

      {data.commonMistakes?.length > 0 && (
        <div className="card mb-4">
          <div className="display mb-2 font-bold">🐞 Частые ошибки</div>
          <div className="space-y-2">
            {data.commonMistakes.map((m, i) => (
              <div key={i} className="rounded-2xl bg-[var(--color-bg2)] p-3 text-sm">
                <div><span className="text-[var(--color-danger)] line-through">{m.wrong}</span> → <span className="font-semibold text-[var(--color-success)]">{m.right}</span></div>
                {m.rule && <div className="mt-1 text-xs text-[var(--color-muted)]">{m.rule}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.relatedLessons?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.relatedLessons.map((l) => (
            <Link key={l} to={`/lessons/${l}`} className="chip !bg-[var(--color-surface2)] !text-[var(--color-amber)]">📘 Урок: {l}</Link>
          ))}
        </div>
      )}
    </div>
  );
}
