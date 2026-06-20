import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { useApi } from '../lib/useApi';
import { Header } from '../components/Header';

const LINKS = [
  { to: '/grammar', emoji: '📐', label: 'Грамматика', hint: 'справочник правил' },
  { to: '/vocab', emoji: '📚', label: 'Словарь', hint: 'наборы слов' },
  { to: '/errors', emoji: '🐞', label: 'Журнал ошибок', hint: 'что дотренировать' },
  { to: '/progress', emoji: '📈', label: 'Прогресс', hint: 'владение темами' },
  { to: '/settings', emoji: '⚙️', label: 'Настройки', hint: 'новые слова в день' },
];

export function Me() {
  const { user, logout } = useAuth();
  const { data: stats } = useApi(() => api.srsStats(), []);

  return (
    <div>
      <Header title="Профиль ⭐" />
      <div className="card mb-4 flex items-center gap-3">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-[var(--color-primary)] text-2xl font-bold text-[#160f33]">{user?.name?.[0]}</div>
        <div>
          <div className="display text-lg font-bold">{user?.name}</div>
          <div className="text-sm text-[var(--color-muted)]">@{user?.username}</div>
        </div>
      </div>

      {stats && (
        <div className="mb-4 grid grid-cols-4 gap-2">
          {[['всего', stats.total, 'var(--color-mint)'], ['новые', stats.new, 'var(--color-sky)'], ['учу', stats.learning, 'var(--color-amber)'], ['повтор', stats.review, 'var(--color-pink)']].map(([l, n, c]) => (
            <div key={l as string} className="card !p-2.5 text-center">
              <div className="display text-lg font-bold" style={{ color: c as string }}>{n as number}</div>
              <div className="text-[10px] text-[var(--color-muted)]">{l as string}</div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2.5">
        {LINKS.map((l) => (
          <Link key={l.to} to={l.to} className="card flex items-center gap-3 !py-3 active:scale-[0.98]">
            <span className="text-2xl">{l.emoji}</span>
            <div className="flex-1">
              <div className="font-semibold">{l.label}</div>
              <div className="text-xs text-[var(--color-muted)]">{l.hint}</div>
            </div>
            <span className="text-[var(--color-muted)]">›</span>
          </Link>
        ))}
      </div>

      <button onClick={logout} className="btn btn-ghost mt-5 w-full !text-[var(--color-danger)]">Выйти</button>
      <p className="mt-4 text-center text-xs text-[var(--color-muted)]">English Trainer · учим вместе 💛</p>
    </div>
  );
}
