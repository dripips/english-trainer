import { Link } from 'react-router-dom';
import { Flame, Brain, Layers, BookOpen, Library, Bug, Ruler, TrendingUp, ChevronRight, type LucideIcon } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../auth';
import { useApi } from '../lib/useApi';
import { Spinner, ProgressBar, IconBadge } from '../components/ui';

function StatTile({ to, icon, value, label, color }: { to: string; icon: LucideIcon; value: number | string; label: string; color: string }) {
  return (
    <Link to={to} className="card flex flex-col gap-2 overflow-hidden !p-3.5 active:scale-[0.98]">
      <IconBadge icon={icon} color={color} size="sm" />
      <div className="min-w-0">
        <div className="display text-2xl font-bold leading-none" style={{ color }}>{value}</div>
        <div className="mt-1 truncate text-xs text-[var(--color-muted)]">{label}</div>
      </div>
    </Link>
  );
}

function NavTile({ to, icon, label, sub, color }: { to: string; icon: LucideIcon; label: string; sub: string; color: string }) {
  return (
    <Link to={to} className="card flex flex-col gap-2 overflow-hidden !p-3.5 active:scale-[0.98]">
      <IconBadge icon={icon} color={color} size="sm" />
      <div className="min-w-0">
        <div className="truncate font-bold">{label}</div>
        <div className="truncate text-xs text-[var(--color-muted)]">{sub}</div>
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
  const dueTotal = data.srs.due + data.srs.new;

  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm text-[var(--color-muted)]">{greet},</p>
        <h1 className="display truncate text-2xl font-bold">{user?.name}</h1>
      </header>

      {/* streak + xp */}
      <div className="card !py-3">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <IconBadge icon={Flame} color="var(--color-amber)" />
            <div className="min-w-0">
              <div className="display text-xl font-bold leading-none">{data.streak} {plural(data.streak, 'день', 'дня', 'дней')}</div>
              <div className="mt-0.5 text-xs text-[var(--color-muted)]">подряд в учёбе</div>
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            {data.activeDays.slice(0, 7).reverse().map((d) => (
              <span key={d} className="h-2.5 w-2.5 rounded-full bg-[var(--color-amber)]" title={d} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
          <span className="font-bold" style={{ color: 'var(--color-primary)' }}>Ур. {data.level}</span>
          <div className="flex-1">
            <ProgressBar
              value={data.xp - data.levelXp}
              max={(data.nextLevelXp ?? data.xp + 1) - data.levelXp}
              color="var(--color-primary)"
            />
          </div>
          <span>{data.xp} XP</span>
        </div>
      </div>

      {/* warm-up CTA */}
      <Link to="/warmup" className="card block overflow-hidden bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary2)] !border-transparent active:scale-[0.98]">
        <div className="flex items-center gap-3 text-[#160f33]">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/25"><Brain size={24} /></div>
          <div className="min-w-0 flex-1">
            <div className="display text-lg font-bold leading-tight">Разминка</div>
            <div className="truncate text-sm opacity-80">повтори слабые места перед уроком</div>
          </div>
          <ChevronRight className="shrink-0" />
        </div>
      </Link>

      {/* review */}
      <Link to="/review" className="card flex items-center gap-3 overflow-hidden active:scale-[0.98]">
        <IconBadge icon={Layers} color="var(--color-pink)" />
        <div className="min-w-0 flex-1">
          <div className="font-bold">Карточки слов</div>
          <div className="truncate text-sm text-[var(--color-muted)]">
            {dueTotal > 0 ? `${data.srs.due} к повтору · ${data.srs.new} новых` : 'на сегодня всё повторено'}
          </div>
        </div>
        {dueTotal > 0 && (
          <span className="display grid h-8 min-w-8 shrink-0 place-items-center rounded-full bg-[var(--color-pink)] px-2 text-sm font-bold text-[#160f33]">{dueTotal}</span>
        )}
      </Link>

      {/* lessons progress */}
      <Link to="/lessons" className="card block overflow-hidden active:scale-[0.98]">
        <div className="mb-2 flex items-center gap-3">
          <IconBadge icon={BookOpen} color="var(--color-amber)" size="sm" />
          <div className="flex-1 font-bold">Уроки</div>
          <span className="text-sm text-[var(--color-muted)]">{data.lessonsDone}/{data.lessonsTotal}</span>
        </div>
        <ProgressBar value={data.lessonsDone} max={data.lessonsTotal} color="var(--color-amber)" />
      </Link>

      <div className="grid grid-cols-2 gap-3">
        <StatTile to="/vocab" icon={Library} value={data.srs.total} label="слов в колоде" color="var(--color-mint)" />
        <StatTile to="/errors" icon={Bug} value={data.openErrors} label="ошибок в журнале" color="var(--color-danger)" />
        <NavTile to="/grammar" icon={Ruler} label="Грамматика" sub="справочник правил" color="var(--color-sky)" />
        <NavTile to="/progress" icon={TrendingUp} label="Прогресс" sub="владение темами" color="var(--color-primary)" />
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
