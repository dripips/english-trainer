import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

export function Header({ title, subtitle, back, right }: { title: string; subtitle?: string; back?: boolean; right?: ReactNode }) {
  const nav = useNavigate();
  return (
    <header className="mb-4 flex items-center gap-3">
      {back && (
        <button onClick={() => nav(-1)} className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[var(--color-surface)] text-lg active:scale-90">←</button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-bold leading-tight">{title}</h1>
        {subtitle && <p className="truncate text-sm text-[var(--color-muted)]">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}
