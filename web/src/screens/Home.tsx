import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { useApi } from '../lib/useApi';
import { Spinner, ProgressBar } from '../components/ui';

function StatCard({ to, emoji, value, label, color }: { to: string; emoji: string; value: number | string; label: string; color: string }) {
  return (
    <Link to={to} className="card flex items-center gap-3 !p-3.5 active:scale-[0.98]">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl" style={{ background: `color-mix(in srgb, ${color} 18%, transparent)` }}>{emoji}</div>
      <div className="min-w-0">
        <div className="display text-xl font-bold leading-none" style={{ color }}>{value}</div>
        <div className="truncate text-xs text-[var(--color-muted)]">{label}</div>
      </div>
    </Link>
  );
}

export function Home() {
  const { user } = useAuth();
  const { data, loading } = useApi(() => api.dashboard(), []);

  const hour = new Date().getHours();
  const greet = hour < 6 ? 'Доброй ночи' : hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';

  if (loading || !data) return <Spinner label="Загружаю…" />;

  return (
    <div className="space-y-4">
      <header className="safe-top">
        <p className="text-sm text-[var(--color-muted)]">{greet},</p>
        <h1 className="display text-2xl font-bold">{user?.name} 👋</h1>
      </header>

      {/* streak */}
      <div className="card flex items-center justify-between !py-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🔥</span>
          <div>
            <div className="display text-xl font-bold">{data.streak} {plural(data.streak, 'день', 'дня', 'дней')}</div>
            <div className="text-xs text-[var(--color-muted)]">подряд в учёбе</div>
          </div>
        </div>
        <div className="flex gap-1">
          {data.activeDays.slice(0, 7).reverse().map((d) => (
            <span key={d} className="h-2.5 w-2.5 rounded-full bg-[var(--color-mint)]" title={d} />
          ))}
        </div>
      </div>

      {/* primary CTAs */}
      <Link to="/warmup" className="card block bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary2)] !border-transparent active:scale-[0.98]">
        <div className="flex items-center justify-between text-[#160f33]">
          <div>
            <div className="display text-lg font-bold">🧠 Разминка</div>
            <div className="text-sm opacity-80">повтори слабые места перед уроком</div>
          </div>
          <span className="text-2xl">→</span>
        </div>
      </Link>

      <Link to="/review" className="card flex items-center justify-between active:scale-[0.98]">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎴</span>
          <div>
            <div className="display text-lg font-bold">Карточки слов</div>
            <div className="text-sm text-[var(--color-muted)]">
              {data.srs.due + data.srs.new > 0 ? `${data.srs.due} к повтору · ${data.srs.new} новых` : 'на сегодня всё повторено ✅'}
            </div>
          </div>
        </div>
        {data.srs.due + data.srs.new > 0 && (
          <span className="display grid h-9 min-w-9 place-items-center rounded-full bg-[var(--color-pink)] px-2 font-bold text-[#160f33]">{data.srs.due + data.srs.new}</span>
        )}
      </Link>

      {/* lessons progress */}
      <Link to="/lessons" className="card block active:scale-[0.98]">
        <div className="mb-2 flex items-center justify-between">
          <div className="display font-bold">📘 Уроки</div>
          <span className="text-sm text-[var(--color-muted)]">{data.lessonsDone}/{data.lessonsTotal}</span>
        </div>
        <ProgressBar value={data.lessonsDone} max={data.lessonsTotal} color="var(--color-amber)" />
      </Link>

      <div className="grid grid-cols-2 gap-3">
        <StatCard to="/vocab" emoji="📚" value={data.srs.total} label="слов в колоде" color="var(--color-mint)" />
        <StatCard to="/errors" emoji="🐞" value={data.openErrors} label="ошибок в журнале" color="var(--color-danger)" />
        <StatCard to="/grammar" emoji="📐" value="Грамматика" label="справочник правил" color="var(--color-sky)" />
        <StatCard to="/progress" emoji="📈" value="Прогресс" label="владение темами" color="var(--color-primary)" />
      </div>
    </div>
  );
}

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}
