import { NavLink, Outlet, useLocation, useNavigationType } from 'react-router-dom';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { Home, BookOpen, Layers, Zap, User, type LucideIcon } from 'lucide-react';
import { LookupLayer } from './LookupLayer';

const TABS: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/', label: 'Дом', icon: Home, end: true },
  { to: '/lessons', label: 'Уроки', icon: BookOpen },
  { to: '/practice', label: 'Практика', icon: Zap },
  { to: '/review', label: 'Слова', icon: Layers },
  { to: '/me', label: 'Я', icon: User },
];

// Remembered scroll position per history entry (survives remounts within the session).
const scrollPositions = new Map<string, number>();

export function Layout() {
  const loc = useLocation();
  const navType = useNavigationType(); // 'POP' (back/forward) | 'PUSH' | 'REPLACE'
  const scrollRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Continuously remember the scroll position for the current history entry.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => { scrollPositions.set(loc.key, el.scrollTop); };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [loc.key]);

  // On navigation: restore position when going back/forward, reset to top on new pages.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    const content = contentRef.current;
    if (!el) return;

    if (navType !== 'POP') {
      el.scrollTo({ top: 0 });
      return;
    }

    const saved = scrollPositions.get(loc.key) ?? 0;
    el.scrollTo({ top: saved });
    if (saved === 0 || !content) return;

    // Content often loads async (data fetch); re-apply the saved position as the
    // page grows, until it fits or a short window elapses.
    let active = true;
    const reapply = () => {
      if (!active) return;
      if (el.scrollTop !== saved && el.scrollHeight - el.clientHeight >= saved) {
        el.scrollTo({ top: saved });
      }
    };
    const ro = new ResizeObserver(reapply);
    ro.observe(content);
    const stop = setTimeout(() => { active = false; ro.disconnect(); }, 1500);
    return () => { active = false; clearTimeout(stop); ro.disconnect(); };
  }, [loc.key, navType]);

  return (
    <div className="app-shell mx-auto flex max-w-md flex-col overflow-hidden">
      <main ref={scrollRef} className="app-main pt-safe no-scrollbar flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-6">
        <div ref={contentRef} key={loc.pathname} className="animate-fadein">
          <Outlet />
        </div>
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
