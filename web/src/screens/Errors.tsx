import { useState } from 'react';
import { Plus, Check, Undo2, Trash2, Target, Trophy } from 'lucide-react';
import { api } from '../api';
import { useApi } from '../lib/useApi';
import { Header } from '../components/Header';
import { Spinner, EmptyState } from '../components/ui';

export function Errors() {
  const [tab, setTab] = useState<'open' | 'fixed'>('open');
  const { data, loading, refetch } = useApi(() => api.errors(tab), [tab]);
  const [adding, setAdding] = useState(false);

  return (
    <div>
      <Header back title="Журнал ошибок" subtitle="как баг-трекер: дотренировать именно это"
        right={<button onClick={() => setAdding((a) => !a)} aria-label="Добавить" className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-primary)] text-[#160f33]"><Plus size={18} /></button>} />

      {adding && <AddError onDone={() => { setAdding(false); refetch(); }} />}

      <div className="mb-4 flex rounded-2xl bg-[var(--color-bg2)] p-1">
        {(['open', 'fixed'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-xl py-2 text-sm font-semibold ${tab === t ? 'bg-[var(--color-surface2)]' : 'text-[var(--color-muted)]'}`}>
            {t === 'open' ? 'Активные' : 'Исправленные'}
          </button>
        ))}
      </div>

      {loading || !data ? <Spinner /> : !data.length ? (
        <EmptyState icon={tab === 'open' ? Target : Trophy} title={tab === 'open' ? 'Чисто!' : 'Пока пусто'}
          hint={tab === 'open' ? 'Ошибки из упражнений и переводчика попадают сюда автоматически.' : 'Исправленные ошибки появятся здесь.'} />
      ) : (
        <div className="space-y-3">
          {data.map((e) => (
            <div key={e.id} className="card overflow-hidden !p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="break-words text-sm">
                    <span className="text-[var(--color-danger)] line-through">{e.wrong}</span>
                    <span className="mx-1 text-[var(--color-muted)]">→</span>
                    <span className="font-semibold text-[var(--color-success)]">{e.correct}</span>
                  </div>
                  {e.rule && <p className="mt-1 break-words text-xs text-[var(--color-muted)]">{e.rule}</p>}
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {e.hits > 1 && <span className="chip !text-[11px]">×{e.hits} раз</span>}
                    {e.source && <span className="chip !text-[11px]">{e.source}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  {tab === 'open' ? (
                    <button onClick={() => api.updateError(e.id, { status: 'fixed' }).then(refetch)} aria-label="Исправлено" className="grid h-8 w-8 place-items-center rounded-full bg-[color-mix(in_srgb,var(--color-success)_20%,transparent)] text-[var(--color-success)]"><Check size={16} /></button>
                  ) : (
                    <button onClick={() => api.updateError(e.id, { status: 'open' }).then(refetch)} aria-label="Вернуть" className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-surface2)]"><Undo2 size={16} /></button>
                  )}
                  <button onClick={() => api.deleteError(e.id).then(refetch)} aria-label="Удалить" className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-surface2)] text-[var(--color-muted)]"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddError({ onDone }: { onDone: () => void }) {
  const [wrong, setWrong] = useState('');
  const [correct, setCorrect] = useState('');
  const [rule, setRule] = useState('');
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!wrong.trim() || !correct.trim()) return;
    setBusy(true);
    try { await api.addError({ wrong: wrong.trim(), correct: correct.trim(), rule: rule.trim() || undefined, source: 'manual' }); onDone(); }
    finally { setBusy(false); }
  }
  return (
    <div className="card animate-slideup mb-4 space-y-2">
      <input className="input" placeholder="Ошибка (как написал)" value={wrong} onChange={(e) => setWrong(e.target.value)} autoCapitalize="none" />
      <input className="input" placeholder="Правильно" value={correct} onChange={(e) => setCorrect(e.target.value)} autoCapitalize="none" />
      <input className="input" placeholder="Правило / почему (необязательно)" value={rule} onChange={(e) => setRule(e.target.value)} />
      <button onClick={save} disabled={busy || !wrong.trim() || !correct.trim()} className="btn btn-primary w-full">Добавить</button>
    </div>
  );
}
