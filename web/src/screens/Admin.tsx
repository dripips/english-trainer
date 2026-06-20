import { useState } from 'react';
import { UserPlus, KeyRound, Trash2, Shield, ShieldOff } from 'lucide-react';
import { api } from '../api';
import { useApi } from '../lib/useApi';
import { useAuth } from '../auth';
import { Header } from '../components/Header';
import { Spinner, EmptyState } from '../components/ui';
import type { AdminUser } from '../types';

export function Admin() {
  const { user } = useAuth();
  const { data, loading, refetch } = useApi(() => api.adminUsers(), []);
  const [adding, setAdding] = useState(false);

  if (user?.role !== 'admin') return <EmptyState icon={ShieldOff} title="Нет доступа" hint="Этот раздел только для администратора." />;
  if (loading || !data) return <Spinner />;

  async function resetPw(u: AdminUser) {
    const pw = window.prompt(`Новый пароль для @${u.username}:`);
    if (!pw) return;
    await api.adminSetPassword(u.id, pw);
    alert('Пароль обновлён');
  }
  async function toggleRole(u: AdminUser) {
    await api.adminUpdateUser(u.id, { role: u.role === 'admin' ? 'user' : 'admin' });
    refetch();
  }
  async function removeUser(u: AdminUser) {
    if (!window.confirm(`Удалить @${u.username} и все его данные?`)) return;
    try { await api.adminDeleteUser(u.id); refetch(); } catch (e: any) { alert(e?.message || 'Ошибка'); }
  }

  return (
    <div>
      <Header back title="Админка" subtitle="пользователи и пароли"
        right={<button onClick={() => setAdding((a) => !a)} aria-label="Добавить" className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-primary)] text-[#160f33]"><UserPlus size={18} /></button>} />

      {adding && <AddUser onDone={() => { setAdding(false); refetch(); }} />}

      <div className="space-y-3">
        {data.map((u) => (
          <div key={u.id} className="card !p-3.5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--color-surface2)] text-lg font-bold">{u.display_name?.[0]}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="display truncate font-bold">{u.display_name}</span>
                  {u.role === 'admin' && <span className="chip !text-[10px] !text-[var(--color-amber)]">admin</span>}
                </div>
                <div className="truncate text-xs text-[var(--color-muted)]">@{u.username} · {u.words} слов · {u.attempts} упр.</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => resetPw(u)} className="chip"><KeyRound size={13} /> Пароль</button>
              <button onClick={() => toggleRole(u)} className="chip">{u.role === 'admin' ? <><ShieldOff size={13} /> Снять админа</> : <><Shield size={13} /> Сделать админом</>}</button>
              {u.id !== user.id && <button onClick={() => removeUser(u)} className="chip !text-[var(--color-danger)]"><Trash2 size={13} /> Удалить</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddUser({ onDone }: { onDone: () => void }) {
  const [username, setU] = useState('');
  const [name, setN] = useState('');
  const [password, setP] = useState('');
  const [admin, setAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    setErr('');
    if (!username.trim() || !password.trim()) { setErr('Заполни логин и пароль'); return; }
    setBusy(true);
    try {
      await api.adminAddUser({ username: username.trim(), name: name.trim() || undefined, password: password.trim(), role: admin ? 'admin' : 'user' });
      onDone();
    } catch (e: any) {
      setErr(e?.message === 'username already exists' ? 'Такой логин уже есть' : 'Ошибка');
    } finally { setBusy(false); }
  }

  return (
    <div className="card animate-slideup mb-4 space-y-2">
      <input className="input" placeholder="Логин (латиницей)" value={username} onChange={(e) => setU(e.target.value)} autoCapitalize="none" />
      <input className="input" placeholder="Имя" value={name} onChange={(e) => setN(e.target.value)} />
      <input className="input" placeholder="Пароль" value={password} onChange={(e) => setP(e.target.value)} />
      <label className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" checked={admin} onChange={(e) => setAdmin(e.target.checked)} className="h-5 w-5 accent-[var(--color-primary)]" /> Администратор</label>
      {err && <p className="text-sm text-[var(--color-danger)]">{err}</p>}
      <button onClick={save} disabled={busy} className="btn btn-primary w-full">Добавить пользователя</button>
    </div>
  );
}
