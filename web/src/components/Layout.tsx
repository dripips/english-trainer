import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { Home, BookOpen, Layers, Languages, User, type LucideIcon } from 'lucide-react';
import { LookupLayer } from './LookupLayer';

const TABS: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/', label: 'Дом', icon: Home, end: true },
  { to: '/lessons', label: 'Уроки', icon: BookOpen },
  { to: '/review', label: 'Слова', icon: Layers },
  { to: '/translator', label: 'Перевод', icon: Languages },
  { to: '/me', label: 'Я', icon: User },
];

export function Layout() {
  const loc = useLocation();
  const scrollRef = useRef<HTMLElement>(null);

  // reset scroll to top on route change
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [loc.pathname]);

  return (
    <div className="mx-auto flex h-full max-w-md flex-col overflow-hidden">
      <main ref={scrollRef} className="pt-safe no-scrollbar flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-6">
        <Outlet key={loc.pathname} />
      </main>

      <LookupLayer />


      <nav className="shrink-0 px-3 pt-1" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.6rem)' }}>
        <div className="flex items-center justify-around rounded-[1.6rem] border border-[var(--color-border)] bg-[var(--color-bg2)]/95 p-1.5 backdrop-blur"
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
