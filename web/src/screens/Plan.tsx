import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Flame, CalendarCheck, Layers, Target } from 'lucide-react';
import { api } from '../api';
import { useApi } from '../lib/useApi';
import { Header } from '../components/Header';
import { Spinner, LevelBadge, ProgressBar } from '../components/ui';
import type { PlanPhase } from '../types';

const STUDY_DAY_GOAL = 5;   // study days per week
const LESSON_GOAL = 2;      // lessons touched per week

const PHASE_META: Record<number, { level: string; title: string; goal: string; vocab: string; next: string[] }> = {
  0: {
    level: 'A1', title: 'Основа',
    goal: 'Рассказать о себе, говорить о настоящем, задавать простые вопросы.',
    vocab: '~500 слов',
    next: ['Повседневные фразы и приветствия', 'Числа и время в речи', 'Простые диалоги (магазин, кафе)'],
  },
  1: {
    level: 'A2', title: 'Элементарный',
    goal: 'Прошлое и будущее, сравнения, модальные глаголы, предлоги.',
    vocab: '~1000 слов',
    next: ['Темы: еда, путешествия, здоровье', 'Аудирование A2 (короткие диалоги)', 'Чтение коротких текстов'],
  },
  2: {
    level: 'B1', title: 'Средний',
    goal: 'Условные, пассив, косвенная речь, связный рассказ о событиях.',
    vocab: '~2000 слов',
    next: ['Идиомы и устойчивые выражения', 'Чтение адаптированных книг', 'Аудирование B1 (подкасты)'],
  },
  3: {
    level: 'B2', title: 'Выше среднего · IELTS',
    goal: 'Сложные структуры, академический язык, подготовка к экзамену.',
    vocab: '~3500 слов',
    next: ['Полные mock-тесты IELTS', 'Эссе с AI-проверкой (регулярно)', 'Speaking с записью ответов'],
  },
};

function PhaseBlock({ p, open, onToggle }: { p: PlanPhase; open: boolean; onToggle: () => void }) {
  const meta = PHASE_META[p.phase] ?? { level: '—', title: `Фаза ${p.phase}`, goal: '', vocab: '', next: [] };
  const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
  const complete = p.done === p.total && p.total > 0;
  return (
    <div className="card !p-0 overflow-hidden">
      <button onClick={onToggle} className="w-full px-4 py-3 text-left">
        <div className="flex items-center gap-2">
          <LevelBadge level={meta.level} />
          <span className="display font-bold">{meta.title}</span>
          {complete && <CheckCircle2 size={16} className="text-[var(--color-success)]" />}
          <span className="ml-auto text-xs text-[var(--color-muted)]">{p.done}/{p.total}</span>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
        <p className="mt-1.5 text-xs leading-snug text-[var(--color-muted)]">{meta.goal}</p>
        <div className="mt-2"><ProgressBar value={p.done} max={p.total || 1} color={complete ? 'var(--color-success)' : 'var(--color-primary)'} /></div>
      </button>
      {open && (
        <div className="border-t border-[var(--color-bg2)] px-4 py-3 space-y-3">
          <div className="space-y-1.5">
            {p.lessons.map((l) => (
              <Link key={l.id} to={`/lessons/${l.id}`} className="flex items-center gap-2 text-sm active:opacity-70">
                {l.done
                  ? <CheckCircle2 size={16} className="shrink-0 text-[var(--color-success)]" />
                  : <Circle size={16} className="shrink-0 text-[var(--color-muted)]" />}
                <span className={`flex-1 leading-snug ${l.done ? 'text-[var(--color-muted)] line-through decoration-[var(--color-muted)]/40' : ''}`}>{l.title}</span>
                {!l.done && l.attempted > 0 && <span className="shrink-0 text-[10px] text-[var(--color-amber)]">{l.attempted}/{l.exerciseCount}</span>}
              </Link>
            ))}
          </div>
          {meta.next.length > 0 && (
            <div className="rounded-xl bg-[var(--color-bg2)] p-3">
              <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-[var(--color-muted)]"><Target size={12} /> Дальше в плане · цель {meta.vocab}</p>
              <ul className="space-y-0.5">
                {meta.next.map((n) => <li key={n} className="text-xs text-[var(--color-muted)]">• {n}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Plan() {
  const { data, loading } = useApi(() => api.plan(), []);
  const [open, setOpen] = useState<number | null>(null);

  // Auto-open the current phase (first not-complete one) once data arrives.
  const currentPhase = useMemo(() => {
    if (!data) return 0;
    const cur = data.phases.find((p) => p.done < p.total);
    return cur?.phase ?? data.phases[data.phases.length - 1]?.phase ?? 0;
  }, [data]);

  if (loading || !data) return <Spinner />;

  const openPhase = open ?? currentPhase;
  const pct = data.totalLessons ? Math.round((data.totalDone / data.totalLessons) * 100) : 0;

  const onTrack = data.studyDaysThisWeek >= STUDY_DAY_GOAL && data.lessonsThisWeek >= LESSON_GOAL;
  const someActivity = data.studyDaysThisWeek >= 2;
  const status = onTrack
    ? { label: 'Идём по плану 🎯', color: 'var(--color-success)' }
    : someActivity
      ? { label: 'Неплохо, можно чаще', color: 'var(--color-amber)' }
      : { label: 'Отстаём — нужно заниматься', color: 'var(--color-danger)' };

  return (
    <div>
      <Header back title="План обучения" subtitle="путь A1 → IELTS 6.5" />

      {/* Journey overview */}
      <div className="card mb-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="display text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>{pct}%</div>
            <div className="text-xs text-[var(--color-muted)]">пройдено уроков</div>
          </div>
          <div className="text-right text-sm text-[var(--color-muted)]">{data.totalDone} из {data.totalLessons}</div>
        </div>
        <div className="mt-2"><ProgressBar value={data.totalDone} max={data.totalLessons || 1} color="var(--color-primary)" /></div>
        <div className="mt-2 flex justify-between text-[10px] text-[var(--color-muted)]">
          <span>A1</span><span>A2</span><span>B1</span><span>B2 · IELTS</span>
        </div>
      </div>

      {/* Pacing / weekly stats */}
      <div className="card mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Эта неделя</span>
          <span className="rounded-lg px-2 py-1 text-xs font-bold" style={{ color: status.color, background: `color-mix(in srgb, ${status.color} 14%, transparent)` }}>{status.label}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-[var(--color-bg2)] p-2.5">
            <CalendarCheck size={16} className="mx-auto mb-1 text-[var(--color-sky)]" />
            <div className="display text-lg font-bold">{data.studyDaysThisWeek}<span className="text-xs font-normal text-[var(--color-muted)]">/{STUDY_DAY_GOAL}</span></div>
            <div className="text-[10px] text-[var(--color-muted)]">дней занятий</div>
          </div>
          <div className="rounded-xl bg-[var(--color-bg2)] p-2.5">
            <Flame size={16} className="mx-auto mb-1 text-[var(--color-amber)]" />
            <div className="display text-lg font-bold">{data.lessonsThisWeek}</div>
            <div className="text-[10px] text-[var(--color-muted)]">уроков за неделю</div>
          </div>
          <div className="rounded-xl bg-[var(--color-bg2)] p-2.5">
            <Layers size={16} className="mx-auto mb-1 text-[var(--color-mint)]" />
            <div className="display text-lg font-bold">{data.srsTotal}</div>
            <div className="text-[10px] text-[var(--color-muted)]">слов в колоде</div>
          </div>
        </div>
        <p className="text-xs leading-snug text-[var(--color-muted)]">
          Цель: заниматься минимум {STUDY_DAY_GOAL} дней в неделю и проходить {LESSON_GOAL}+ урока. Регулярность важнее объёма.
        </p>
      </div>

      {/* Phases roadmap */}
      <div className="space-y-3">
        {data.phases.map((p) => (
          <PhaseBlock key={p.phase} p={p} open={openPhase === p.phase} onToggle={() => setOpen(openPhase === p.phase ? -1 : p.phase)} />
        ))}
      </div>
    </div>
  );
}
