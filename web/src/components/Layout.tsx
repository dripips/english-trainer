import { NavLink, Outlet, useLocation } from 'react-router-dom';

const TABS = [
  { to: '/', label: 'Дом', icon: '🏠', end: true },
  { to: '/lessons', label: 'Уроки', icon: '📘' },
  { to: '/review', label: 'Слова', icon: '🎴' },
  { to: '/translator', label: 'Перевод', icon: '🌐' },
  { to: '/me', label: 'Я', icon: '⭐' },
];

export function Layout() {
  const loc = useLocation();
  // hide tab bar inside an active review/lesson session for focus? keep it simple: always show.
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <main className="safe-top flex-1 px-4 pb-28 pt-4">
        <Outlet key={loc.pathname} />
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md">
        <div className="mx-3 mb-3 flex items-center justify-around rounded-[1.6rem] border border-[var(--color-border)] bg-[var(--color-bg2)]/95 p-1.5 backdrop-blur"
             style={{ boxShadow: '0 -8px 30px -16px rgba(0,0,0,.8)' }}>
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 rounded-[1.2rem] py-2 text-[11px] font-semibold transition ${
                  isActive ? 'bg-[var(--color-surface2)] text-[var(--color-primary)]' : 'text-[var(--color-muted)]'
                }`
              }
            >
              <span className="text-xl leading-none">{t.icon}</span>
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
