import { useEffect, useState } from 'react';
import { Check, Bell, BellOff, KeyRound, RefreshCw } from 'lucide-react';
import { api } from '../api';
import { Header } from '../components/Header';
import { Spinner } from '../components/ui';
import { pushSupported, enablePush, disablePush, getSubscription } from '../lib/push';

export function Settings() {
  const [newPerDay, setNewPerDay] = useState(12);
  const [reminderHour, setReminderHour] = useState(19);
  const [remOn, setRemOn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [pushMsg, setPushMsg] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const s = await api.settings();
        setNewPerDay(Number(s.newPerDay ?? 12));
        setReminderHour(Number(s.reminderHour ?? 19));
        setLoading(false);
        // check subscription without blocking the screen
        const sub = await getSubscription();
        setRemOn(!!sub && String(s.remindersEnabled ?? '1') === '1');
      } catch { setLoading(false); }
    })();
  }, []);

  async function saveNum(key: string, v: number, setter: (n: number) => void) {
    setter(v);
    await api.setSettings({ [key]: v });
    setSaved(true); setTimeout(() => setSaved(false), 1200);
  }

  async function toggleReminders() {
    setPushMsg('');
    try {
      if (!remOn) {
        await enablePush();
        await api.setSettings({ reminderHour });
        setRemOn(true);
        setPushMsg('Напоминания включены');
      } else {
        await disablePush();
        setRemOn(false);
        setPushMsg('Напоминания выключены');
      }
    } catch (e: any) {
      const m = e?.message === 'denied' ? 'Разреши уведомления в браузере'
        : e?.message === 'not-supported' ? 'Это устройство не поддерживает пуши (на iPhone — добавь приложение на экран «Домой»)'
        : e?.message === 'server-disabled' ? 'Пуши не настроены на сервере'
        : 'Не удалось включить';
      setPushMsg(m);
    }
    setTimeout(() => setPushMsg(''), 4000);
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <Header back title="Настройки" />

      <div className="card">
        <div className="display mb-1 font-bold">Новых слов в день</div>
        <p className="mb-3 text-sm text-[var(--color-muted)]">Сколько новых карточек показывать ежедневно. Программа советует 10–15.</p>
        <div className="flex items-center gap-3">
          <input type="range" min={3} max={30} step={1} value={newPerDay} onChange={(e) => saveNum('newPerDay', Number(e.target.value), setNewPerDay)} className="flex-1 accent-[var(--color-primary)]" />
          <span className="display w-10 shrink-0 text-center text-xl font-bold">{newPerDay}</span>
        </div>
      </div>

      <div className="card">
        <div className="mb-1 flex items-center gap-2">
          {remOn ? <Bell size={18} className="text-[var(--color-mint)]" /> : <BellOff size={18} className="text-[var(--color-muted)]" />}
          <div className="display font-bold">Напоминания о занятии</div>
        </div>
        <p className="mb-3 text-sm text-[var(--color-muted)]">Пуш-уведомление, если за день ещё не позанимался.</p>
        {pushSupported() ? (
          <>
            <button onClick={toggleReminders} className={`btn w-full ${remOn ? 'btn-ghost' : 'btn-primary'}`}>
              {remOn ? 'Выключить напоминания' : 'Включить напоминания'}
            </button>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-sm text-[var(--color-muted)]">Время</span>
              <input type="range" min={6} max={23} value={reminderHour} disabled={!remOn}
                onChange={(e) => saveNum('reminderHour', Number(e.target.value), setReminderHour)} className="flex-1 accent-[var(--color-primary)] disabled:opacity-40" />
              <span className="display w-14 shrink-0 text-center font-bold">{String(reminderHour).padStart(2, '0')}:00</span>
            </div>
            {remOn && <button onClick={() => api.pushTest()} className="btn btn-soft mt-3 w-full text-sm">Отправить тестовое</button>}
          </>
        ) : (
          <p className="text-sm text-[var(--color-amber)]">На iPhone сначала добавь приложение на экран «Домой», затем включи напоминания отсюда.</p>
        )}
        {pushMsg && <p className="mt-2 text-sm text-[var(--color-muted)]">{pushMsg}</p>}
      </div>

      <ChangePassword />

      {saved && <p className="flex items-center justify-center gap-1 text-sm text-[var(--color-success)]"><Check size={15} /> Сохранено</p>}

      <div className="card">
        <div className="mb-1 flex items-center gap-2"><RefreshCw size={18} className="text-[var(--color-primary)]" /><div className="display font-bold">Обновить приложение</div></div>
        <p className="mb-3 text-sm text-[var(--color-muted)]">Сбросить кэш и загрузить свежую версию (если что-то не подтянулось после обновления).</p>
        <button onClick={hardRefresh} className="btn btn-soft w-full">Сбросить кэш и перезагрузить</button>
      </div>

      <div className="card">
        <div className="display mb-1 font-bold">О приложении</div>
        <p className="text-sm text-[var(--color-muted)]">English Trainer — личный тренажёр для двоих. Уроки, слова с интервальным повторением, грамматика, разминки и журнал ошибок. Без рекламы и подписок.</p>
      </div>
    </div>
  );
}

async function hardRefresh() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } finally {
    window.location.reload();
  }
}

function ChangePassword() {
  const [oldP, setOld] = useState('');
  const [newP, setNew] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    setMsg('');
    if (newP.length < 4) { setMsg('Пароль слишком короткий'); return; }
    setBusy(true);
    try {
      await api.changePassword(oldP, newP);
      setMsg('Пароль изменён ✓'); setOld(''); setNew('');
    } catch (e: any) {
      setMsg(e?.message === 'wrong current password' ? 'Неверный текущий пароль' : 'Не удалось изменить');
    } finally { setBusy(false); }
  }

  return (
    <div className="card">
      <div className="mb-1 flex items-center gap-2"><KeyRound size={18} className="text-[var(--color-sky)]" /><div className="display font-bold">Сменить пароль</div></div>
      <div className="mt-2 space-y-2">
        <input className="input" type="password" placeholder="Текущий пароль" value={oldP} onChange={(e) => setOld(e.target.value)} />
        <input className="input" type="password" placeholder="Новый пароль" value={newP} onChange={(e) => setNew(e.target.value)} />
        <button onClick={save} disabled={busy || !oldP || !newP} className="btn btn-primary w-full">Сохранить пароль</button>
        {msg && <p className="text-sm text-[var(--color-muted)]">{msg}</p>}
      </div>
    </div>
  );
}
