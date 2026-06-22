import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function Header({ title, subtitle, back, right, onBack }: { title: string; subtitle?: string; back?: boolean; right?: ReactNode; onBack?: () => void }) {
  const nav = useNavigate();
  return (
    <header className="mb-4 flex items-center gap-3">
      {(back || onBack) && (
        <button onClick={() => (onBack ? onBack() : nav(-1))} aria-label="Назад" className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[var(--color-surface)] text-[var(--color-text)] active:scale-90">
          <ArrowLeft size={20} />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-bold leading-tight">{title}</h1>
        {subtitle && <p className="truncate text-sm text-[var(--color-muted)]">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  );
}
