import { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { useAuth } from '../auth';

export function Login() {
  const { login } = useAuth();
  const [username, setU] = useState('');
  const [password, setP] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      await login(username.trim().toLowerCase(), password);
    } catch {
      setErr('Неверный логин или пароль');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="grid h-20 w-20 place-items-center rounded-[1.75rem] bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary2)] text-[#160f33]" style={{ boxShadow: '0 14px 40px -12px var(--color-primary2)' }}>
          <GraduationCap size={40} strokeWidth={2.2} />
        </div>
        <h1 className="display mt-4 text-3xl font-bold">English Trainer</h1>
        <p className="mt-1 text-[var(--color-muted)]">Учим английский вместе</p>
      </div>
      <form onSubmit={submit} className="card animate-slideup space-y-3">
        <input className="input" placeholder="Логин" value={username} onChange={(e) => setU(e.target.value)} autoCapitalize="none" autoCorrect="off" />
        <input className="input" type="password" placeholder="Пароль" value={password} onChange={(e) => setP(e.target.value)} />
        {err && <p className="text-sm text-[var(--color-danger)]">{err}</p>}
        <button className="btn btn-primary w-full" disabled={busy || !username || !password}>
          {busy ? 'Входим…' : 'Войти'}
        </button>
      </form>
    </div>
  );
}
