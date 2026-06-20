import { useEffect, useState } from 'react';
import { api } from '../api';
import { Header } from '../components/Header';
import { Spinner } from '../components/ui';

export function Settings() {
  const [newPerDay, setNewPerDay] = useState(12);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.settings().then((s) => setNewPerDay(Number(s.newPerDay ?? 12))).finally(() => setLoading(false));
  }, []);

  async function save(v: number) {
    setNewPerDay(v);
    await api.setSettings({ newPerDay: v });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <Header back title="Настройки ⚙️" />
      <div className="card">
        <div className="display mb-1 font-bold">Новых слов в день</div>
        <p className="mb-3 text-sm text-[var(--color-muted)]">Сколько новых карточек показывать ежедневно. Программа советует 10–15.</p>
        <div className="flex items-center gap-3">
          <input type="range" min={3} max={30} step={1} value={newPerDay} onChange={(e) => save(Number(e.target.value))} className="flex-1 accent-[var(--color-primary)]" />
          <span className="display w-10 text-center text-xl font-bold">{newPerDay}</span>
        </div>
        {saved && <p className="mt-2 text-sm text-[var(--color-success)]">Сохранено ✅</p>}
      </div>

      <div className="card mt-4">
        <div className="display mb-1 font-bold">О приложении</div>
        <p className="text-sm text-[var(--color-muted)]">English Trainer — личный тренажёр для двоих. Уроки, слова с интервальным повторением, грамматика, разминки и журнал ошибок. Без рекламы и подписок 💛</p>
      </div>
    </div>
  );
}
