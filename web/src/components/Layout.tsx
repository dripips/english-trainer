import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Home, BookOpen, Layers, Languages, User, type LucideIcon } from 'lucide-react';

const TABS: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/', label: 'Дом', icon: Home, end: true },
  { to: '/lessons', label: 'Уроки', icon: BookOpen },
  { to: '/review', label: 'Слова', icon: Layers },
  { to: '/translator', label: 'Перевод', icon: Languages },
  { to: '/me', label: 'Я', icon: User },
];

export function Layout() {
  const loc = useLocation();
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col overflow-x-hidden">
      <main className="safe-top flex-1 px-4 pb-28 pt-4">
        <Outlet key={loc.pathname} />
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md">
        <div className="mx-3 mb-3 flex items-center justify-around rounded-[1.6rem] border border-[var(--color-border)] bg-[var(--color-bg2)]/95 p-1.5 backdrop-blur"
             style={{ boxShadow: '0 -8px 30px -16px rgba(0,0,0,.8)' }}>
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `flex flex-1 flex-col items-center gap-1 rounded-[1.2rem] py-2 text-[11px] font-semibold transition ${
                    isActive ? 'bg-[var(--color-surface2)] text-[var(--color-primary)]' : 'text-[var(--color-muted)]'
                  }`
                }
              >
                <Icon size={21} strokeWidth={2.2} />
                {t.label}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
