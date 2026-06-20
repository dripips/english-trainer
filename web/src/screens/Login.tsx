import { useState } from 'react';
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
      <div className="mb-8 text-center">
        <div className="text-6xl">📚✨</div>
        <h1 className="display mt-3 text-3xl font-bold">English Trainer</h1>
        <p className="mt-1 text-[var(--color-muted)]">Учим английский вместе 💛</p>
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
