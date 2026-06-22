import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookOpen, PencilLine, Flame, Ruler, ArrowRight, Youtube, Play, BookText, Languages, BookPlus, Check, Volume2 } from 'lucide-react';
import type { Lesson } from '../types';
import { api } from '../api';
import { useApi } from '../lib/useApi';
import { Header } from '../components/Header';
import { Spinner, LevelBadge } from '../components/ui';
import { Markdown } from '../components/Markdown';
import { ExercisePlayer } from '../components/ExercisePlayer';
import { speak } from '../lib/speech';

export function LessonScreen() {
  const { id } = useParams();
  const { data: lesson, loading } = useApi(() => api.lesson(id!), [id]);
  const [tab, setTab] = useState<'theory' | 'practice'>('theory');
  const [glossAdded, setGlossAdded] = useState(false);
  const [glossLoading, setGlossLoading] = useState(false);

  if (loading || !lesson) return <Spinner />;

  const glossCount = lesson.reading?.gloss?.length ?? 0;

  async function handleAddGloss() {
    setGlossLoading(true);
    try {
      await api.addGlossToSrs(lesson!.id);
      setGlossAdded(true);
    } catch {
      alert('Не удалось добавить слова. Попробуй ещё раз.');
    } finally {
      setGlossLoading(false);
    }
  }

  const glossButton = glossCount > 0 ? (
    glossAdded ? (
      <div className="mt-2 flex w-full items-center justify-center gap-2 text-sm text-[var(--color-mint)]">
        <Check size={16} /> {glossCount} слов добавлено в карточки
      </div>
    ) : (
      <button
        className="btn btn-soft mt-2 w-full"
        onClick={handleAddGloss}
        disabled={glossLoading}
      >
        <BookPlus size={18} />
        {glossLoading ? 'Добавляем…' : `Добавить ${glossCount} слов в карточки`}
      </button>
    )
  ) : null;

  return (
    <div>
      <Header back title={lesson.title} subtitle={lesson.murphy || undefined} right={<LevelBadge level={lesson.level} />} />

      <div className="mb-4 flex rounded-2xl bg-[var(--color-bg2)] p-1">
        {(['theory', 'practice'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition ${tab === t ? 'bg-[var(--color-surface2)] text-[var(--color-text)]' : 'text-[var(--color-muted)]'}`}>
            {t === 'theory' ? <><BookOpen size={16} /> Теория</> : <><PencilLine size={16} /> Упражнения ({lesson.exercises.length})</>}
          </button>
        ))}
      </div>

      {tab === 'theory' ? (
        <div className="space-y-4">
          {lesson.warmup?.length > 0 && (
            <div className="card !bg-[color-mix(in_srgb,var(--color-amber)_10%,var(--color-surface))]">
              <div className="display mb-1 flex items-center gap-1.5 font-bold"><Flame size={18} className="text-[var(--color-amber)]" /> Разминка</div>
              <ul className="ml-4 list-disc text-sm text-[var(--color-text)]">
                {lesson.warmup.map((w, i) => <li key={i} className="my-0.5">{w}</li>)}
              </ul>
            </div>
          )}
          {lesson.videos && lesson.videos.length > 0 && (
            <div className="card">
              <div className="display mb-2 flex items-center gap-1.5 font-bold"><Youtube size={18} className="text-[var(--color-primary)]" /> Смотри</div>
              <div className="space-y-2">
                {lesson.videos.map((v, i) => (
                  <a key={i} href={v.url} target="_blank" rel="noreferrer" className="btn btn-soft w-full !justify-start gap-2">
                    <Play size={16} className="shrink-0" /> <span className="truncate">{v.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
          <div className="card overflow-hidden"><Markdown>{lesson.theory}</Markdown></div>
          {lesson.reading && <ReadingCard reading={lesson.reading} />}

          {lesson.grammarRefs?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {lesson.grammarRefs.map((g) => (
                <Link key={g} to={`/grammar/${g}`} className="chip !bg-[var(--color-surface2)] !text-[var(--color-sky)]"><Ruler size={13} /> {g}</Link>
              ))}
            </div>
          )}
          <button className="btn btn-primary w-full" onClick={() => setTab('practice')}>К упражнениям <ArrowRight size={18} /></button>
        </div>
      ) : (
        <ExercisePlayer
          exercises={lesson.exercises}
          onAttempt={(exId, correct, answer, override) => { api.attempt(lesson.id, exId, correct, answer, override).catch(() => {}); }}
          doneExtra={glossButton}
        />
      )}
    </div>
  );
}

function ReadingCard({ reading }: { reading: NonNullable<Lesson['reading']> }) {
  const [showRu, setShowRu] = useState(false);
  return (
    <div className="card">
      <div className="mb-2 flex items-center gap-1.5">
        <div className="display flex items-center gap-1.5 font-bold"><BookText size={18} className="text-[var(--color-sky)]" /> Читай</div>
        <button onClick={() => speak(reading.textEn)} aria-label="Прослушать текст" className="ml-auto grid h-8 w-8 place-items-center rounded-full bg-[var(--color-surface2)] text-[var(--color-sky)] active:scale-90"><Volume2 size={16} /></button>
      </div>
      <p data-lookup className="whitespace-pre-line leading-relaxed">{reading.textEn}</p>
      <button onClick={() => setShowRu((v) => !v)} className="btn btn-soft mt-3 gap-2"><Languages size={16} /> {showRu ? 'Скрыть перевод' : 'Показать перевод'}</button>
      {showRu && <p className="mt-2 whitespace-pre-line leading-relaxed text-[var(--color-muted)]">{reading.textRu}</p>}
      {reading.gloss && reading.gloss.length > 0 && (
        <div className="mt-3 border-t border-[var(--color-bg2)] pt-3">
          <div className="mb-1 text-xs uppercase tracking-wide text-[var(--color-muted)]">Слова в контексте</div>
          <ul className="space-y-1 text-sm">
            {reading.gloss.map((g, i) => (
              <li key={i}><span className="font-semibold">{g.en}</span> — {g.ru}{g.note ? <span className="text-[var(--color-muted)]"> ({g.note})</span> : null}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
