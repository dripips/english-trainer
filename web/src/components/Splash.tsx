import { GraduationCap } from 'lucide-react';

export function Splash() {
  const hour = new Date().getHours();
  const greet = hour < 6 ? 'Доброй ночи' : hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';
  return (
    <div className="grid place-items-center" style={{ height: 'var(--app-h, 100dvh)' }}>
      <div className="flex animate-pop flex-col items-center gap-5">
        <div className="grid h-20 w-20 place-items-center rounded-[1.75rem] bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary2)] text-[#160f33]"
             style={{ boxShadow: '0 14px 40px -12px var(--color-primary2)' }}>
          <GraduationCap size={40} strokeWidth={2.2} />
        </div>
        <div className="text-center">
          <div className="text-sm text-[var(--color-muted)]">{greet} 👋</div>
          <div className="display text-2xl font-bold">English Trainer</div>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--color-primary)]" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
