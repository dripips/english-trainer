import type { ReactNode } from 'react';
import { speak, ttsSupported } from '../lib/speech';

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-[var(--color-muted)]">
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[var(--color-surface2)] border-t-[var(--color-primary)]" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function EmptyState({ emoji, title, hint, action }: { emoji: string; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <div className="text-5xl">{emoji}</div>
      <div className="display text-lg font-semibold">{title}</div>
      {hint && <p className="max-w-xs text-sm text-[var(--color-muted)]">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
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
    <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ color: c, background: 'color-mix(in srgb, currentColor 16%, transparent)' }}>
      {level}
    </span>
  );
}

export function SpeakButton({ text, lang = 'en-US', className = '' }: { text: string; lang?: string; className?: string }) {
  if (!ttsSupported) return null;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); speak(text, lang); }}
      className={`grid h-9 w-9 place-items-center rounded-full bg-[var(--color-surface2)] text-[var(--color-sky)] active:scale-90 ${className}`}
      aria-label="Произнести"
    >
      🔊
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
