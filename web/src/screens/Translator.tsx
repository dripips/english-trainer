import { useState } from 'react';
import { BookText, Plus, CheckCircle2, Volume2 } from 'lucide-react';
import { Header } from '../components/Header';
import { api } from '../api';
import { SpeakButton } from '../components/ui';
import { pronounce } from '../lib/speech';

type Dir = 'auto' | 'en' | 'ru';

export function Translator() {
  const [text, setText] = useState('');
  const [dir, setDir] = useState<Dir>('auto');
  const [res, setRes] = useState<{ translation: string; alternatives: string[]; source: string; target: string } | null>(null);
  const [def, setDef] = useState<Awaited<ReturnType<typeof api.define>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function run() {
    if (!text.trim()) return;
    setBusy(true); setRes(null); setDef(null); setSaved(false); setShowForm(false);
    try {
      const source = dir === 'auto' ? undefined : dir;
      const r = await api.translate(text.trim(), source);
      setRes(r);
      const enWord = r.source === 'en' ? text.trim() : r.translation;
      if (enWord && /^[a-z][a-z'-]*$/i.test(enWord)) {
        api.define(enWord.toLowerCase()).then(setDef).catch(() => {});
      }
    } finally { setBusy(false); }
  }

  const enSide = res ? (res.source === 'en' ? text.trim() : res.translation) : '';
  const ruSide = res ? (res.source === 'en' ? res.translation : text.trim()) : '';

  return (
    <div>
      <Header back title="Переводчик" subtitle="не знаешь слово? переведи и добавь в словарь" />

      <div className="mb-3 flex rounded-2xl bg-[var(--color-bg2)] p-1">
        {([['auto', 'Авто'], ['en', 'EN → RU'], ['ru', 'RU → EN']] as [Dir, string][]).map(([d, l]) => (
          <button key={d} onClick={() => setDir(d)} className={`flex-1 rounded-xl py-2 text-sm font-semibold ${dir === d ? 'bg-[var(--color-surface2)]' : 'text-[var(--color-muted)]'}`}>{l}</button>
        ))}
      </div>

      <textarea className="input min-h-[5rem]" placeholder="Введи слово или фразу…" value={text}
        onChange={(e) => setText(e.target.value)} autoCapitalize="none" />
      <button onClick={run} disabled={busy || !text.trim()} className="btn btn-primary mt-3 w-full">{busy ? 'Перевожу…' : 'Перевести'}</button>

      {res && (
        <div className="animate-slideup mt-4 space-y-3">
          <div className="card overflow-hidden">
            <div className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{res.source} → {res.target}</div>
            <div className="mt-1 flex items-start gap-2">
              <div className="display min-w-0 flex-1 break-words text-xl font-bold">{res.translation || '—'}</div>
              {res.translation && <SpeakButton text={res.translation} lang={res.target === 'en' ? 'en-US' : 'ru-RU'} />}
            </div>
            {def?.phonetic && <div className="mt-1 text-sm text-[var(--color-muted)]">{def.phonetic}</div>}
            {res.alternatives?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {res.alternatives.map((a, i) => <span key={i} className="chip">{a}</span>)}
              </div>
            )}
          </div>

          {def?.found && def.meanings?.length ? (
            <div className="card overflow-hidden">
              <div className="display mb-1 flex items-center gap-1.5 font-bold"><BookText size={18} className="text-[var(--color-sky)]" /> {def.word}</div>
              {def.meanings.map((m, i) => (
                <div key={i} className="mb-2">
                  <span className="chip">{m.pos}</span>
                  <ul className="ml-4 mt-1 list-disc text-sm text-[var(--color-text)]">
                    {m.definitions.map((d, j) => <li key={j} className="break-words">{d}</li>)}
                  </ul>
                  {m.example && <p className="mt-1 break-words text-sm text-[var(--color-muted)]">«{m.example}»</p>}
                </div>
              ))}
            </div>
          ) : null}

          {!saved && !showForm && (
            <button onClick={() => setShowForm(true)} className="btn btn-soft w-full"><Plus size={18} /> Добавить в мой словарь</button>
          )}
          {saved && <div className="flex items-center justify-center gap-2 rounded-2xl bg-[color-mix(in_srgb,var(--color-success)_16%,transparent)] p-3 font-semibold text-[var(--color-success)]"><CheckCircle2 size={18} /> Добавлено в словарь</div>}
          {showForm && <AddForm en={enSide} ru={ruSide} ipa={def?.phonetic || ''} onSaved={() => { setSaved(true); setShowForm(false); }} />}
        </div>
      )}
    </div>
  );
}

function AddForm({ en, ru, ipa, onSaved }: { en: string; ru: string; ipa: string; onSaved: () => void }) {
  const [word, setWord] = useState(en);
  const [tr, setTr] = useState(ru);
  const [ex, setEx] = useState('');
  const [addToSrs, setAddToSrs] = useState(true);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!word.trim()) return;
    setBusy(true);
    try {
      await api.addCustomWord({ word: word.trim(), ru: tr.trim(), ipa, exampleEn: ex.trim() || undefined, addToSrs });
      onSaved();
    } finally { setBusy(false); }
  }

  return (
    <div className="card animate-slideup space-y-2">
      <label className="text-xs text-[var(--color-muted)]">Слово (EN)</label>
      <div className="flex gap-2">
        <input className="input" value={word} onChange={(e) => setWord(e.target.value)} autoCapitalize="none" />
        <button onClick={() => pronounce(word)} className="btn btn-soft !px-3" aria-label="Произнести"><Volume2 size={18} /></button>
      </div>
      <label className="text-xs text-[var(--color-muted)]">Перевод (RU)</label>
      <input className="input" value={tr} onChange={(e) => setTr(e.target.value)} />
      <label className="text-xs text-[var(--color-muted)]">Пример (необязательно)</label>
      <input className="input" value={ex} onChange={(e) => setEx(e.target.value)} placeholder="I use this word every day." autoCapitalize="none" />
      <label className="flex items-center gap-2 py-1 text-sm">
        <input type="checkbox" checked={addToSrs} onChange={(e) => setAddToSrs(e.target.checked)} className="h-5 w-5 accent-[var(--color-primary)]" />
        Добавить в карточки на повторение
      </label>
      <button onClick={save} disabled={busy || !word.trim()} className="btn btn-primary w-full">{busy ? 'Сохраняю…' : 'Сохранить'}</button>
    </div>
  );
}
