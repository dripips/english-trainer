import { useState } from 'react';
import { Sparkles, CheckCircle2, AlertCircle, Lightbulb, Loader2, RotateCcw } from 'lucide-react';
import { api } from '../api';
import type { WritingFeedback } from '../types';

interface Props {
  mode?: 'free' | 'task1' | 'task2' | 'speaking';
  task?: string;
  placeholder?: string;
}

const TYPE_LABELS: Record<string, string> = {
  grammar: 'грамматика',
  vocab: 'лексика',
  spelling: 'орфография',
  'word order': 'порядок слов',
  article: 'артикль',
  preposition: 'предлог',
  tense: 'время',
  punctuation: 'пунктуация',
};

export function WritingChecker({ mode = 'free', task, placeholder }: Props) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fb, setFb] = useState<WritingFeedback | null>(null);

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const canCheck = text.trim().length >= 10 && !loading;

  async function check() {
    setLoading(true);
    setError('');
    setFb(null);
    try {
      const res = await api.checkWriting({ text: text.trim(), task, mode });
      setFb(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Не удалось проверить';
      setError(
        msg.includes('not configured') ? 'AI-проверка пока не настроена на сервере.'
        : msg.includes('too short') ? 'Напиши хотя бы пару предложений.'
        : 'Сервис проверки временно недоступен. Попробуй ещё раз.',
      );
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFb(null);
    setError('');
  }

  return (
    <div className="space-y-3">
      <div className="card !p-0 overflow-hidden">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder ?? 'Напиши свой текст на английском, и AI проверит его как преподаватель…'}
          rows={6}
          className="w-full resize-y bg-transparent px-4 py-3 text-sm leading-relaxed outline-none placeholder:text-[var(--color-muted)]"
        />
        <div className="flex items-center justify-between border-t border-[var(--color-bg2)] px-4 py-2">
          <span className="text-xs text-[var(--color-muted)]">{words} слов</span>
          <button
            onClick={check}
            disabled={!canCheck}
            className="btn btn-primary !py-2 !px-4 text-sm disabled:opacity-40"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? 'Проверяю…' : 'Проверить'}
          </button>
        </div>
      </div>

      {error && (
        <div className="card flex items-start gap-2 !bg-[color-mix(in_srgb,var(--color-danger)_10%,var(--color-surface))] text-sm">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-[var(--color-danger)]" />
          <span>{error}</span>
        </div>
      )}

      {fb && (
        <div className="space-y-3">
          {/* Summary + level/band */}
          <div className="card space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {fb.level && (
                <span className="rounded-lg bg-[var(--color-surface2)] px-2.5 py-1 text-xs font-bold text-[var(--color-primary)]">
                  Уровень {fb.level}
                </span>
              )}
              {fb.band && (
                <span className="rounded-lg bg-[var(--color-surface2)] px-2.5 py-1 text-xs font-bold text-[var(--color-sky)]">
                  IELTS ≈ {fb.band}
                </span>
              )}
              <button onClick={reset} className="ml-auto flex items-center gap-1 text-xs text-[var(--color-muted)]">
                <RotateCcw size={13} /> заново
              </button>
            </div>
            {fb.summary && <p className="text-sm leading-relaxed">{fb.summary}</p>}
          </div>

          {/* Strengths */}
          {fb.strengths.length > 0 && (
            <div className="card !bg-[color-mix(in_srgb,var(--color-mint)_10%,var(--color-surface))] space-y-1.5">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-mint)]">
                <CheckCircle2 size={16} /> Что хорошо
              </p>
              <ul className="space-y-1">
                {fb.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-[var(--color-text)]">• {s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Errors */}
          {fb.errors.length > 0 && (
            <div className="space-y-2">
              <p className="px-0.5 text-sm font-semibold text-[var(--color-muted)]">
                Главные ошибки ({fb.errors.length})
              </p>
              {fb.errors.map((e, i) => (
                <div key={i} className="card space-y-1.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span className="text-[var(--color-danger)] line-through decoration-[var(--color-danger)]/50">{e.original}</span>
                    <span className="text-[var(--color-muted)]">→</span>
                    <span className="font-semibold text-[var(--color-mint)]">{e.fixed}</span>
                    <span className="ml-auto rounded-md bg-[var(--color-bg2)] px-1.5 py-0.5 text-[10px] text-[var(--color-muted)]">
                      {TYPE_LABELS[e.type] ?? e.type}
                    </span>
                  </div>
                  {e.explanation && <p className="text-xs leading-relaxed text-[var(--color-muted)]">{e.explanation}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Corrected version */}
          {fb.corrected && (
            <div className="card space-y-1.5">
              <p className="text-sm font-semibold text-[var(--color-muted)]">Исправленный вариант</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{fb.corrected}</p>
            </div>
          )}

          {/* Tip */}
          {fb.tip && (
            <div className="card flex items-start gap-2 !bg-[color-mix(in_srgb,var(--color-amber)_10%,var(--color-surface))]">
              <Lightbulb size={18} className="mt-0.5 shrink-0 text-[var(--color-amber)]" />
              <p className="text-sm leading-relaxed">{fb.tip}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
