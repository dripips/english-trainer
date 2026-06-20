import { Link } from 'react-router-dom';
import { Ruler, Library, Bug, TrendingUp, Settings as SettingsIcon, LogOut, ChevronRight, Heart, type LucideIcon } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../auth';
import { useApi } from '../lib/useApi';
import { Header } from '../components/Header';
import { IconBadge } from '../components/ui';

const LINKS: { to: string; icon: LucideIcon; label: string; hint: string; color: string }[] = [
  { to: '/grammar', icon: Ruler, label: 'Грамматика', hint: 'справочник правил', color: 'var(--color-sky)' },
  { to: '/vocab', icon: Library, label: 'Словарь', hint: 'наборы слов', color: 'var(--color-mint)' },
  { to: '/errors', icon: Bug, label: 'Журнал ошибок', hint: 'что дотренировать', color: 'var(--color-danger)' },
  { to: '/progress', icon: TrendingUp, label: 'Прогресс', hint: 'владение темами', color: 'var(--color-primary)' },
  { to: '/settings', icon: SettingsIcon, label: 'Настройки', hint: 'новые слова в день', color: 'var(--color-amber)' },
];

export function Me() {
  const { user, logout } = useAuth();
  const { data: stats } = useApi(() => api.srsStats(), []);

  return (
    <div>
      <Header title="Профиль" />
      <div className="card mb-4 flex items-center gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[var(--color-primary)] text-2xl font-bold text-[#160f33]">{user?.name?.[0]}</div>
        <div className="min-w-0">
          <div className="display truncate text-lg font-bold">{user?.name}</div>
          <div className="truncate text-sm text-[var(--color-muted)]">@{user?.username}</div>
        </div>
      </div>

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
      </div>

      <button onClick={logout} className="btn btn-ghost mt-5 w-full !text-[var(--color-danger)]"><LogOut size={18} /> Выйти</button>
      <p className="mt-4 flex items-center justify-center gap-1 text-center text-xs text-[var(--color-muted)]">English Trainer · учим вместе <Heart size={12} className="fill-[var(--color-pink)] text-[var(--color-pink)]" /></p>
    </div>
  );
}
