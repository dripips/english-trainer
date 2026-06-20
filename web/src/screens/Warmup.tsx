import { Link } from 'react-router-dom';
import { RotateCcw, CloudSun, BookOpen, CheckCircle2 } from 'lucide-react';
import { api } from '../api';
import { useApi } from '../lib/useApi';
import { Header } from '../components/Header';
import { Spinner, EmptyState } from '../components/ui';
import { ExercisePlayer } from '../components/ExercisePlayer';
import type { Exercise } from '../types';

export function Warmup() {
  const { data, loading } = useApi(() => api.warmup(), []);
  if (loading || !data) return <Spinner />;

  const exercises: Exercise[] = [
    ...data.errors.map((e, i): Exercise => ({
      id: `err-${e.id || i}`, type: 'fix', prompt: e.wrong, answer: e.correct, rule: e.rule || 'Твоя прошлая ошибка — закрепляем.',
    })),
    ...data.words.map((w, i): Exercise => ({
      id: `word-${w.id || i}`, type: 'translate', prompt: w.ru, answer: w.word, hint: 'слово из твоей колоды',
    })),
  ];

  const hasContent = exercises.length > 0 || data.topics.length > 0;

  if (!hasContent) {
    return (
      <div>
        <Header back title="Разминка" />
        <EmptyState icon={CloudSun} title="Пока нечего разминать" hint="Сделай пару уроков и добавь слова — и здесь появится персональная разминка из твоих слабых мест."
          action={<Link to="/lessons" className="btn btn-primary">К урокам</Link>} />
      </div>
    );
  }

  return (
    <div>
      <Header back title="Разминка" subtitle="2 минуты на слабые места перед уроком" />

      {data.topics.length > 0 && (
        <div className="card mb-4 !bg-[color-mix(in_srgb,var(--color-amber)_10%,var(--color-surface))]">
          <div className="display mb-2 flex items-center gap-1.5 font-bold"><RotateCcw size={18} className="text-[var(--color-amber)]" /> Пора вернуться к темам</div>
          <div className="flex flex-wrap gap-2">
            {data.topics.map((t) => (
              <Link key={t.id} to={`/grammar/${t.id}`} className="chip !bg-[var(--color-surface2)] !text-[var(--color-amber)]"><BookOpen size={13} /> {t.title}</Link>
            ))}
          </div>
        </div>
      )}

      {exercises.length > 0 ? (
        <ExercisePlayer exercises={exercises} />
      ) : (
        <EmptyState icon={CheckCircle2} title="Темы повторены" hint="Загляни в темы выше и переходи к новому уроку." />
      )}
    </div>
  );
}
