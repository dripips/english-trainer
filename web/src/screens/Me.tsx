import { Link } from 'react-router-dom';
import { Ruler, Library, Bug, TrendingUp, BookMarked, BookOpen, Zap, PenLine, Mic, AlertTriangle, CalendarDays, Map as MapIcon, Shield, Settings as SettingsIcon, LogOut, ChevronRight, Heart, type LucideIcon } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../auth';
import { useApi } from '../lib/useApi';
import { Header } from '../components/Header';
import { IconBadge, ProgressBar } from '../components/ui';

const LINKS: { to: string; icon: LucideIcon; label: string; hint: string; color: string }[] = [
  { to: '/plan', icon: MapIcon, label: 'План обучения', hint: 'путь A1 → IELTS и статистика', color: 'var(--color-primary)' },
  { to: '/practice', icon: Zap, label: 'Практика', hint: 'адаптивные упражнения', color: 'var(--color-primary)' },
  { to: '/library', icon: BookOpen, label: 'Библиотека', hint: 'читать книги на английском', color: 'var(--color-mint)' },
  { to: '/writing', icon: PenLine, label: 'Письмо + AI-проверка', hint: 'напиши текст — AI исправит ошибки', color: 'var(--color-sky)' },
  { to: '/speaking', icon: Mic, label: 'IELTS Speaking', hint: 'карточки Part 1 / 2 / 3 с таймером', color: 'var(--color-mint)' },
  { to: '/grammar', icon: Ruler, label: 'Правила', hint: 'все времена и грамматика', color: 'var(--color-sky)' },
  { to: '/exceptions', icon: AlertTriangle, label: 'Исключения', hint: 'неправильные глаголы, множ. число', color: 'var(--color-amber)' },
  { to: '/everyday', icon: CalendarDays, label: 'Каждый день', hint: 'дни, месяцы, числа, цвета', color: 'var(--color-mint)' },
  { to: '/vocab', icon: Library, label: 'Словарь', hint: 'наборы слов', color: 'var(--color-amber)' },
  { to: '/errors', icon: Bug, label: 'Журнал ошибок', hint: 'что дотренировать', color: 'var(--color-danger)' },
  { to: '/progress', icon: TrendingUp, label: 'Прогресс', hint: 'владение темами', color: 'var(--color-sky)' },
  { to: '/textbook', icon: BookMarked, label: 'Учебник Murphy', hint: 'читать книгу', color: 'var(--color-pink)' },
  { to: '/settings', icon: SettingsIcon, label: 'Настройки', hint: 'напоминания, пароль', color: 'var(--color-muted)' },
];

export function Me() {
  const { user, logout } = useAuth();
  const { data: stats } = useApi(() => api.srsStats(), []);
  const { data: gamif } = useApi(() => api.gamification(), []);

  return (
    <div>
      <Header title="Профиль" />
      <div className="card mb-4 flex items-center gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[var(--color-primary)] text-2xl font-bold text-[#160f33]">{user?.name?.[0]}</div>
        <div className="min-w-0 flex-1">
          <div className="display truncate text-lg font-bold">{user?.name}</div>
          <div className="truncate text-sm text-[var(--color-muted)]">@{user?.username}</div>
        </div>
        {gamif && (
          <div className="shrink-0 text-right">
            <div className="display text-2xl font-bold leading-none" style={{ color: 'var(--color-primary)' }}>{gamif.level}</div>
            <div className="text-[10px] text-[var(--color-muted)]">уровень</div>
          </div>
        )}
      </div>

      {gamif && (
        <div className="card mb-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">Уровень {gamif.level}</span>
            <span className="text-[var(--color-muted)]">{gamif.xp}{gamif.nextLevelXp ? ` / ${gamif.nextLevelXp}` : ''} XP</span>
          </div>
          <ProgressBar
            value={gamif.xp - gamif.levelXp}
            max={(gamif.nextLevelXp ?? gamif.xp + 1) - gamif.levelXp}
            color="var(--color-primary)"
          />
          <div className="flex gap-4 pt-1 text-xs text-[var(--color-muted)]">
            <span>🔥 {gamif.streak} дн. подряд</span>
            <span>🏆 рекорд {gamif.longestStreak} дн.</span>
          </div>
        </div>
      )}

      {stats && (
        <div className="mb-4 grid grid-cols-4 gap-2">
          {([['всего', stats.total, 'var(--color-mint)'], ['новые', stats.new, 'var(--color-sky)'], ['учу', stats.learning, 'var(--color-amber)'], ['повтор', stats.review, 'var(--color-pink)']] as [string, number, string][]).map(([l, n, c]) => (
            <div key={l} className="card !p-2.5 text-center">
              <div className="display text-lg font-bold" style={{ color: c }}>{n}</div>
              <div className="text-[10px] text-[var(--color-muted)]">{l}</div>
            </div>
          ))}
        </div>
      )}

      {gamif && (
        <div className="mb-4">
          <h2 className="mb-2.5 px-0.5 text-sm font-semibold text-[var(--color-muted)]">Достижения</h2>
          <div className="grid grid-cols-5 gap-x-2 gap-y-3">
            {gamif.badges.map((b) => (
              <div key={b.id} title={`${b.name} — ${b.desc}`} className="flex flex-col items-center gap-1.5">
                <div className={`grid h-13 w-13 place-items-center rounded-2xl text-2xl transition-all
                  ${b.earned
                    ? 'bg-[var(--color-surface2)]'
                    : 'bg-[var(--color-surface2)] opacity-25 grayscale'
                  }`}
                  style={{ width: 52, height: 52 }}
                >
                  {b.emoji}
                </div>
                <span className={`w-full text-center text-[9px] leading-tight
                  ${b.earned ? 'text-[var(--color-text)]' : 'text-[var(--color-muted)]'}`}>
                  {b.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        {LINKS.map((l) => (
          <Link key={l.to} to={l.to} className="card flex items-center gap-3 overflow-hidden !py-3 active:scale-[0.98]">
            <IconBadge icon={l.icon} color={l.color} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{l.label}</div>
              <div className="truncate text-xs text-[var(--color-muted)]">{l.hint}</div>
            </div>
            <ChevronRight size={18} className="shrink-0 text-[var(--color-muted)]" />
          </Link>
        ))}
        {user?.role === 'admin' && (
          <Link to="/admin" className="card flex items-center gap-3 overflow-hidden !py-3 active:scale-[0.98]">
            <IconBadge icon={Shield} color="var(--color-amber)" size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">Админка</div>
              <div className="truncate text-xs text-[var(--color-muted)]">пользователи и пароли</div>
            </div>
            <ChevronRight size={18} className="shrink-0 text-[var(--color-muted)]" />
          </Link>
        )}
      </div>

      <button onClick={logout} className="btn btn-ghost mt-5 w-full !text-[var(--color-danger)]"><LogOut size={18} /> Выйти</button>
      <p className="mt-4 flex items-center justify-center gap-1 text-center text-xs text-[var(--color-muted)]">English Trainer · учим вместе <Heart size={12} className="fill-[var(--color-pink)] text-[var(--color-pink)]" /></p>
    </div>
  );
}
