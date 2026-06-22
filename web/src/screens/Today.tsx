import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, Layers, BookOpen, BookText, Headphones, Zap, CheckCircle2, ChevronRight, Flame, ArrowRight, type LucideIcon } from 'lucide-react';
import { api } from '../api';
import { useApi } from '../lib/useApi';
import { Header } from '../components/Header';
import { Spinner, ProgressBar } from '../components/ui';
import type { LessonMeta } from '../types';

type Step = {
  key: string;
  icon: LucideIcon;
  label: string;
  sub: string;
  to: string;
  color: string;
  done?: boolean;
};

export function Today() {
  const nav = useNavigate();
  const { data: dash, loading: l1 } = useApi(() => api.dashboard(), []);
  const { data: lessons, loading: l2 } = useApi(() => api.lessons(), []);

  const steps = useMemo<Step[]>(() => {
    if (!dash || !lessons) return [];
    const incomplete = (l: LessonMeta & { attempted?: number }) => l.exerciseCount > 0 && (l.attempted || 0) < l.exerciseCount;
    const core = lessons.filter((l) => l.kind !== 'reading');
    const nextLesson = core.find(incomplete);
    const nextListening = core.find((l) => l.tags?.includes('listening') && incomplete(l));
    const nextReading = lessons.filter((l) => l.kind === 'reading').find(incomplete);
    const due = dash.srs.due + dash.srs.new;

    const out: Step[] = [];
    out.push({ key: 'warmup', icon: Brain, label: 'Разминка', sub: 'повтори слабые места — 2 мин', to: '/warmup', color: 'var(--color-primary)' });
    out.push({
      key: 'review', icon: Layers, label: 'Карточки слов',
      sub: due > 0 ? `${dash.srs.due} к повтору · ${dash.srs.new} новых` : 'на сегодня всё повторено',
      to: '/review', color: 'var(--color-pink)', done: due === 0,
    });
    if (nextLesson) {
      out.push({ key: 'lesson', icon: BookOpen, label: 'Урок дня', sub: nextLesson.title, to: `/lessons/${nextLesson.id}`, color: 'var(--color-amber)' });
    } else {
      out.push({ key: 'practice', icon: Zap, label: 'Практика', sub: 'все уроки пройдены — закрепляй', to: '/practice', color: 'var(--color-amber)', done: false });
    }
    if (nextListening) {
      out.push({ key: 'listen', icon: Headphones, label: 'Аудирование', sub: nextListening.title, to: `/lessons/${nextListening.id}`, color: 'var(--color-sky)' });
    }
    if (nextReading) {
      out.push({ key: 'read', icon: BookText, label: 'Чтение', sub: nextReading.title, to: `/lessons/${nextReading.id}`, color: 'var(--color-mint)' });
    }
    return out;
  }, [dash, lessons]);

  if (l1 || l2 || !dash) return <Spinner />;

  const firstUndone = steps.find((s) => !s.done) || steps[0];

  return (
    <div>
      <Header back title="Сегодня" subtitle="твоё занятие на сегодня" />

      {/* streak + goal */}
      <div className="card mb-4 flex items-center gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--color-amber)_18%,transparent)]">
          <Flame size={24} className="text-[var(--color-amber)]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="display text-lg font-bold leading-tight">{dash.streak} {plural(dash.streak, 'день', 'дня', 'дней')} подряд</div>
          <div className="text-xs text-[var(--color-muted)]">Цель на сегодня: 15–20 минут. Делай по порядку ↓</div>
        </div>
      </div>

      {/* start button */}
      {firstUndone && (
        <button onClick={() => nav(firstUndone.to)}
          className="card mb-4 block w-full overflow-hidden bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary2)] !border-transparent text-left active:scale-[0.98]">
          <div className="flex items-center gap-3 text-[#160f33]">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/25"><ArrowRight size={24} /></div>
            <div className="min-w-0 flex-1">
              <div className="display font-bold leading-tight">Начать занятие</div>
              <div className="truncate text-sm opacity-80">{firstUndone.label}: {firstUndone.sub}</div>
            </div>
          </div>
        </button>
      )}

      {/* steps */}
      <div className="space-y-2.5">
        {steps.map((s, i) => (
          <Link key={s.key} to={s.to} className="card flex items-center gap-3 overflow-hidden !py-3 active:scale-[0.98]">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold"
              style={{ background: `color-mix(in srgb, ${s.color} 16%, transparent)`, color: s.color }}>
              {s.done ? <CheckCircle2 size={18} /> : i + 1}
            </div>
            <s.icon size={18} className="shrink-0" style={{ color: s.color }} />
            <div className="min-w-0 flex-1">
              <div className={`truncate font-semibold ${s.done ? 'text-[var(--color-muted)]' : ''}`}>{s.label}</div>
              <div className="truncate text-xs text-[var(--color-muted)]">{s.sub}</div>
            </div>
            <ChevronRight size={18} className="shrink-0 text-[var(--color-muted)]" />
          </Link>
        ))}
      </div>

      <p className="mt-5 text-center text-xs text-[var(--color-muted)]">Прошёл всё? Возвращайся завтра — стрик растёт каждый день 🔥</p>
    </div>
  );
}

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}
