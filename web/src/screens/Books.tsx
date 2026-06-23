import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { api } from '../api';
import { useApi } from '../lib/useApi';
import { Header } from '../components/Header';
import { ListSkeleton, LevelBadge } from '../components/ui';
import type { BookMeta } from '../types';

function BookTile({ b }: { b: BookMeta }) {
  const [ok, setOk] = useState(true);
  return (
    <Link to={`/books/${b.id}`} className="card block overflow-hidden !p-0 active:scale-[0.98]">
      <div className="relative aspect-square w-full bg-[var(--color-surface2)]">
        {ok && <img src={b.cover} alt="" loading="lazy" onError={() => setOk(false)} className="h-full w-full object-cover" />}
        <span className="absolute left-2 top-2"><LevelBadge level={b.level} /></span>
      </div>
      <div className="p-3">
        <div className="display truncate font-bold leading-tight">{b.title}</div>
        <div className="mt-0.5 text-xs text-[var(--color-muted)]">{b.pages} страниц</div>
      </div>
    </Link>
  );
}

export function Books() {
  const { data, loading } = useApi(() => api.books(), []);
  if (loading || !data) return <div><Header back title="Книги с картинками" /><ListSkeleton rows={3} image /></div>;

  return (
    <div>
      <Header back title="Книги с картинками" subtitle="листай, слушай и читай как книжку" />
      {!data.length ? (
        <p className="py-10 text-center text-[var(--color-muted)]">Скоро появятся.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {data.map((b) => <BookTile key={b.id} b={b} />)}
        </div>
      )}
      <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-[var(--color-muted)]">
        <BookOpen size={14} /> Нажми на книгу и листай страницы
      </div>
    </div>
  );
}
