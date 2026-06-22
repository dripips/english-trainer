import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { Home, BookOpen, Layers, Zap, User, type LucideIcon } from 'lucide-react';
import { LookupLayer } from './LookupLayer';

const TABS: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/', label: 'Дом', icon: Home, end: true },
  { to: '/lessons', label: 'Уроки', icon: BookOpen },
  { to: '/practice', label: 'Практика', icon: Zap },
  { to: '/review', label: 'Слова', icon: Layers },
  { to: '/me', label: 'Я', icon: User },
];

export function Layout() {
  const loc = useLocation();
  const scrollRef = useRef<HTMLElement>(null);

  // reset scroll to top on route change
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [loc.pathname]);

  return (
    <div className="app-shell mx-auto flex max-w-md flex-col overflow-hidden">
      <main ref={scrollRef} className="app-main pt-safe no-scrollbar flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-6">
        <Outlet key={loc.pathname} />
      </main>

      <LookupLayer />


      <nav className="bottom-nav shrink-0 px-3 pt-2">
        <div className="bottom-nav-panel flex items-center justify-around rounded-[1.6rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5"
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
