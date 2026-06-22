import { useRef, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Volume2, Loader2, Pause } from 'lucide-react';
import { speakControlled, ttsSupported, type SpeakHandle } from '../lib/speech';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

// Content-shaped placeholder for list screens while data loads.
export function ListSkeleton({ rows = 5, image = false }: { rows?: number; image?: boolean }) {
  return (
    <div className="animate-fadein space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card overflow-hidden !p-0">
          {image && <Skeleton className="aspect-[16/9] w-full !rounded-none" />}
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-[var(--color-muted)]">
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[var(--color-surface2)] border-t-[var(--color-primary)]" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function IconBadge({ icon: Icon, color = 'var(--color-primary)', size = 'md' }: { icon: LucideIcon; color?: string; size?: 'sm' | 'md' | 'lg' }) {
  const box = size === 'lg' ? 56 : size === 'sm' ? 36 : 46;
  const ic = size === 'lg' ? 26 : size === 'sm' ? 18 : 22;
  return (
    <div className="grid shrink-0 place-items-center rounded-2xl" style={{ width: box, height: box, background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>
      <Icon size={ic} strokeWidth={2.2} />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, hint, action }: { icon: LucideIcon; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <IconBadge icon={Icon} color="var(--color-primary)" size="lg" />
      <div className="display text-lg font-semibold">{title}</div>
      {hint && <p className="max-w-xs text-sm text-[var(--color-muted)]">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

const LEVEL_COLORS: Record<string, string> = {
  A1: 'var(--color-mint)', A2: 'var(--color-sky)', B1: 'var(--color-amber)',
  B2: 'var(--color-pink)', C1: 'var(--color-primary)', custom: 'var(--color-muted)',
};
export function LevelBadge({ level }: { level: string }) {
  const c = LEVEL_COLORS[level] || 'var(--color-muted)';
  return (
    <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ color: c, background: 'color-mix(in srgb, currentColor 16%, transparent)' }}>
      {level}
    </span>
  );
}

export function SpeakButton({ text, lang = 'en-US', className = '', size = 18 }: { text: string; lang?: string; className?: string; size?: number }) {
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const [progress, setProgress] = useState(0);
  const handle = useRef<SpeakHandle | null>(null);
  if (!ttsSupported) return null;

  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (state === 'loading') return;
    if (state === 'playing') { handle.current?.stop(); setState('idle'); setProgress(0); return; }
    setState('loading'); setProgress(0);
    const h = speakControlled(text, lang, { onStart: () => setState('playing'), onProgress: setProgress });
    handle.current = h;
    h.done.then(() => { setState('idle'); setProgress(0); });
  };

  const R = 16, CIRC = 2 * Math.PI * R;
  return (
    <button
      onClick={onClick}
      className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-surface2)] text-[var(--color-sky)] transition active:scale-90 ${state === 'playing' ? '!bg-[color-mix(in_srgb,var(--color-sky)_22%,var(--color-surface2))]' : ''} ${className}`}
      aria-label="Произнести"
    >
      {state === 'playing' && (
        <svg viewBox="0 0 36 36" className="pointer-events-none absolute inset-0 h-full w-full -rotate-90">
          <circle cx="18" cy="18" r={R} fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="2.5" />
          <circle cx="18" cy="18" r={R} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - progress)}
            style={{ transition: 'stroke-dashoffset 0.12s linear' }} />
        </svg>
      )}
      {state === 'loading' ? <Loader2 size={size} className="animate-spin" />
        : state === 'playing' ? <Pause size={size} />
        : <Volume2 size={size} />}
    </button>
  );
}

export function ProgressBar({ value, max, color = 'var(--color-primary)' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-surface2)]">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Pill({ children, color }: { children: ReactNode; color?: string }) {
  return <span className="chip" style={color ? { color, background: `color-mix(in srgb, ${color} 16%, transparent)` } : undefined}>{children}</span>;
}
