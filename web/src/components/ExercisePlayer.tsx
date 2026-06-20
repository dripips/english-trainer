import { useMemo, useState } from 'react';
import { Trophy, PartyPopper, Dumbbell, Sprout, RotateCcw, Lightbulb, Volume2, CheckCircle2, XCircle, Info, Check, Plus, Smile, Meh } from 'lucide-react';
import type { Exercise } from '../types';
import { answerMatches, firstAnswer, normalizeAnswer } from '../lib/check';
import { speak } from '../lib/speech';
import { api } from '../api';
import { SpeakButton } from './ui';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Props {
  exercises: Exercise[];
  onAttempt?: (exerciseId: string, correct: boolean, answer: string) => void;
  onFinish?: (score: { correct: number; total: number }) => void;
}

export function ExercisePlayer({ exercises, onAttempt, onFinish }: Props) {
  const [i, setI] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  const [done, setDone] = useState(false);

  const ex = exercises[i];

  function handleResult(correct: boolean, answer: string) {
    onAttempt?.(ex.id, correct, answer);
    setResults((r) => { const next = [...r]; next[i] = correct; return next; });
  }

  function next() {
    if (i + 1 >= exercises.length) {
      setDone(true);
      onFinish?.({ correct: results.filter(Boolean).length, total: exercises.length });
    } else setI(i + 1);
  }

  if (!exercises.length) return null;

  if (done) {
    const correct = results.filter(Boolean).length;
    const pct = Math.round((correct / exercises.length) * 100);
    const Icon = pct >= 90 ? Trophy : pct >= 70 ? PartyPopper : pct >= 50 ? Dumbbell : Sprout;
    const color = pct >= 90 ? 'var(--color-amber)' : pct >= 70 ? 'var(--color-mint)' : pct >= 50 ? 'var(--color-sky)' : 'var(--color-muted)';
    return (
      <div className="animate-pop card flex flex-col items-center text-center">
        <Icon size={56} style={{ color }} />
        <div className="display mt-2 text-2xl font-bold">{correct} / {exercises.length}</div>
        <p className="mt-1 text-[var(--color-muted)]">
          {pct >= 90 ? 'Великолепно!' : pct >= 70 ? 'Хорошо!' : pct >= 50 ? 'Неплохо, повтори ещё.' : 'Это разминка мозга — попробуй снова.'}
        </p>
        <button className="btn btn-soft mt-4 w-full" onClick={() => { setI(0); setResults([]); setDone(false); }}>
          <RotateCcw size={18} /> Ещё раз
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface2)]">
          <div className="h-full rounded-full bg-[var(--color-primary)] transition-all" style={{ width: `${(i / exercises.length) * 100}%` }} />
        </div>
        <span className="shrink-0 text-xs font-semibold text-[var(--color-muted)]">{i + 1}/{exercises.length}</span>
      </div>
      <ExerciseCard key={ex.id} ex={ex} onResult={handleResult} onNext={next} />
    </div>
  );
}

function ExerciseCard({ ex, onResult, onNext }: { ex: Exercise; onResult: (c: boolean, a: string) => void; onNext: () => void }) {
  const [given, setGiven] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [built, setBuilt] = useState<string[]>([]);
  const [matchSel, setMatchSel] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [logged, setLogged] = useState(false);

  const shuffledTokens = useMemo(() => shuffle(ex.tokens || []), [ex.id]);
  const shuffledRights = useMemo(() => shuffle((ex.pairs || []).map((p) => p.right)), [ex.id]);
  const correctText = firstAnswer(ex.answer);

  function evaluate() {
    let ok = false; let ans = '';
    switch (ex.type) {
      case 'fill': case 'fix': case 'translate': case 'listen':
        ans = given; ok = answerMatches(given, ex.answer!); break;
      case 'choose':
        ans = selected || ''; ok = !!selected && answerMatches(selected, ex.answer!); break;
      case 'order':
        ans = built.join(' '); ok = answerMatches(ans, ex.answer!); break;
      case 'match':
        ans = JSON.stringify(matchSel);
        ok = (ex.pairs || []).every((p) => normalizeAnswer(matchSel[p.left] || '') === normalizeAnswer(p.right));
        break;
      case 'freeform':
        ans = given; ok = true; break;
    }
    setCorrect(ok); setChecked(true);
    if (ex.type === 'freeform') return;
    onResult(ok, ans);
    if (ex.type === 'listen' && ex.audioText) speak(ex.audioText);
  }

  function selfGrade(ok: boolean) { setCorrect(ok); onResult(ok, given); }
  function selfGradeOverride() { setCorrect(true); onResult(true, given || selected || built.join(' ')); }

  async function logError() {
    try {
      await api.addError({
        wrong: ex.type === 'choose' ? (selected || '') : (given || built.join(' ')),
        correct: correctText, rule: ex.rule || undefined, source: 'exercise',
      });
      setLogged(true);
    } catch { /* ignore */ }
  }

  const canCheck = (() => {
    switch (ex.type) {
      case 'choose': return !!selected;
      case 'order': return built.length > 0;
      case 'match': return Object.keys(matchSel).length === (ex.pairs?.length || 0);
      default: return given.trim().length > 0;
    }
  })();

  const promptIsEnglish = ex.type === 'fill' || ex.type === 'fix' || ex.type === 'choose';

  return (
    <div className="animate-slideup card overflow-hidden">
      {ex.type === 'listen' ? (
        <div className="flex flex-col items-center gap-3 py-2">
          <button onClick={() => speak(ex.audioText || '')} aria-label="Прослушать" className="grid h-20 w-20 place-items-center rounded-full bg-[var(--color-surface2)] text-[var(--color-sky)] active:scale-90"><Volume2 size={34} /></button>
          <p className="text-sm text-[var(--color-muted)]">Послушай и запиши предложение</p>
        </div>
      ) : ex.prompt ? (
        <div className="flex items-start gap-2">
          <p className="display min-w-0 flex-1 break-words text-lg font-semibold leading-snug">{ex.prompt}</p>
          {promptIsEnglish && <SpeakButton text={ex.prompt.replace(/_+/g, ' ').replace(/\([^)]*\)/g, '')} />}
        </div>
      ) : null}

      {ex.hint && !checked && <p className="mt-1 flex items-center gap-1 text-xs text-[var(--color-muted)]"><Lightbulb size={13} /> {ex.hint}</p>}

      <div className="mt-4">
        {(ex.type === 'fill' || ex.type === 'fix' || ex.type === 'translate' || ex.type === 'listen') && (
          <input
            className="input text-lg" value={given} onChange={(e) => setGiven(e.target.value)} disabled={checked}
            placeholder={ex.type === 'translate' ? 'Напиши по-английски…' : ex.type === 'fix' ? 'Исправленное предложение…' : 'Твой ответ…'}
            autoCapitalize="none" autoCorrect="off" spellCheck={false}
            onKeyDown={(e) => { if (e.key === 'Enter' && canCheck && !checked) evaluate(); }}
          />
        )}

        {ex.type === 'choose' && (
          <div className="grid gap-2">
            {ex.options?.map((opt) => {
              const isSel = selected === opt;
              const isAnswer = answerMatches(opt, ex.answer!);
              let cls = 'btn-ghost';
              if (checked) {
                if (isAnswer) cls = '!bg-[color-mix(in_srgb,var(--color-success)_22%,transparent)] !border-[var(--color-success)]';
                else if (isSel) cls = '!bg-[color-mix(in_srgb,var(--color-danger)_22%,transparent)] !border-[var(--color-danger)]';
              } else if (isSel) cls = '!border-[var(--color-primary)] !bg-[var(--color-surface2)]';
              return (
                <button key={opt} disabled={checked} onClick={() => setSelected(opt)} className={`btn ${cls} justify-between !font-semibold`}>
                  <span className="min-w-0 break-words text-left">{opt}</span>
                  {checked && isAnswer && <CheckCircle2 size={18} className="shrink-0 text-[var(--color-success)]" />}
                  {checked && isSel && !isAnswer && <XCircle size={18} className="shrink-0 text-[var(--color-danger)]" />}
                </button>
              );
            })}
          </div>
        )}

        {ex.type === 'order' && (
          <div>
            <div className="mb-3 min-h-[3rem] rounded-2xl border border-dashed border-[var(--color-border)] p-2">
              <div className="flex flex-wrap gap-2">
                {built.map((t, idx) => (
                  <button key={idx} disabled={checked} onClick={() => setBuilt(built.filter((_, k) => k !== idx))} className="chip !bg-[var(--color-primary)] !text-[#14102e]">{t}</button>
                ))}
                {!built.length && <span className="p-1 text-sm text-[var(--color-muted)]">Нажимай слова по порядку…</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {shuffledTokens.map((t, idx) => (
                <button key={idx} disabled={checked || (built.includes(t) && built.filter((x) => x === t).length >= shuffledTokens.filter((x) => x === t).length)}
                  onClick={() => setBuilt([...built, t])} className="btn btn-soft !px-3 !py-2">{t}</button>
              ))}
            </div>
          </div>
        )}

        {ex.type === 'match' && (
          <div className="grid gap-2">
            {ex.pairs?.map((p) => {
              const ok = checked && normalizeAnswer(matchSel[p.left] || '') === normalizeAnswer(p.right);
              return (
                <div key={p.left} className="flex items-center gap-2">
                  <span className="display w-20 shrink-0 break-words font-semibold">{p.left}</span>
                  <select className="input flex-1" value={matchSel[p.left] || ''} disabled={checked}
                    onChange={(e) => setMatchSel({ ...matchSel, [p.left]: e.target.value })}
                    style={checked ? { borderColor: ok ? 'var(--color-success)' : 'var(--color-danger)' } : undefined}>
                    <option value="">—</option>
                    {shuffledRights.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        )}

        {ex.type === 'freeform' && (
          <textarea className="input min-h-[6rem]" value={given} onChange={(e) => setGiven(e.target.value)} disabled={checked} placeholder="Напиши свой ответ…" />
        )}
      </div>

      {checked && ex.type !== 'freeform' && (
        <div className={`animate-pop mt-4 rounded-2xl p-3 ${correct ? 'bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)]' : 'bg-[color-mix(in_srgb,var(--color-danger)_14%,transparent)]'}`}>
          <div className="flex items-center gap-1.5 font-semibold">
            {correct ? <span className="flex items-center gap-1.5 text-[var(--color-success)]"><CheckCircle2 size={18} /> Верно!</span> : <span className="flex items-center gap-1.5 text-[var(--color-danger)]"><XCircle size={18} /> Не совсем</span>}
          </div>
          {!correct && (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-[var(--color-muted)]">Правильно:</span>
              <b className="break-words text-[var(--color-text)]">{correctText}</b>
              <SpeakButton text={correctText} className="!h-7 !w-7" />
            </div>
          )}
          {ex.rule && <p className="mt-1 flex items-start gap-1 break-words text-sm text-[var(--color-muted)]"><Info size={14} className="mt-0.5 shrink-0" /> {ex.rule}</p>}
          {!correct && (
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={selfGradeOverride} className="chip"><Check size={13} /> Я был прав</button>
              <button onClick={logError} disabled={logged} className="chip">{logged ? <><Check size={13} /> В журнале</> : <><Plus size={13} /> В журнал ошибок</>}</button>
            </div>
          )}
        </div>
      )}

      {checked && ex.type === 'freeform' && (
        <div className="animate-pop mt-4 rounded-2xl bg-[var(--color-surface2)] p-3">
          {ex.sample && <p className="break-words text-sm"><span className="text-[var(--color-muted)]">Образец: </span><b>{ex.sample}</b></p>}
          <p className="mt-2 text-sm text-[var(--color-muted)]">Как ты справился?</p>
          <div className="mt-2 flex gap-2">
            <button onClick={() => selfGrade(true)} className="btn btn-soft flex-1"><Smile size={18} /> Хорошо</button>
            <button onClick={() => selfGrade(false)} className="btn btn-soft flex-1"><Meh size={18} /> Ошибся</button>
          </div>
        </div>
      )}

      <div className="mt-4">
        {!checked ? (
          <button onClick={evaluate} disabled={!canCheck} className="btn btn-primary w-full">Проверить</button>
        ) : (
          <button onClick={onNext} className="btn btn-primary w-full">Дальше →</button>
        )}
      </div>
    </div>
  );
}
