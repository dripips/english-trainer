import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Languages, Image as ImageIcon, RotateCcw, BookOpen } from 'lucide-react';
import { api } from '../api';
import { useApi } from '../lib/useApi';
import { Header } from '../components/Header';
import { Spinner, SpeakButton } from '../components/ui';
import { prefetchTts } from '../lib/speech';

export function BookReader() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data: book, loading } = useApi(() => api.book(id!), [id]);
  const [page, setPage] = useState(0);
  const [showRu, setShowRu] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const touchX = useRef<number | null>(null);

  const total = book?.pages.length ?? 0;
  const atEnd = page >= total; // total = "The End" page

  // Prefetch current + next page audio and preload next image.
  useEffect(() => {
    if (!book) return;
    const cur = book.pages[page];
    if (cur) prefetchTts(cur.en);
    const next = book.pages[page + 1];
    if (next) { prefetchTts(next.en); const im = new Image(); im.src = next.image; }
    setImgOk(true);
    setShowRu(false);
  }, [book, page]);

  if (loading || !book) return <Spinner />;

  const go = (d: number) => setPage((p) => Math.max(0, Math.min(total, p + d)));

  function onTouchStart(e: React.TouchEvent) { touchX.current = e.touches[0].clientX; }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  }

  return (
    <div>
      <Header back title={book.title} subtitle={atEnd ? 'Конец' : `Страница ${page + 1} из ${total}`} />

      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="select-none">
        {atEnd ? (
          <div className="card animate-pop flex flex-col items-center py-12 text-center">
            <BookOpen size={56} className="text-[var(--color-primary)]" />
            <div className="display mt-3 text-2xl font-bold">The End 🎉</div>
            <p className="mt-1 text-[var(--color-muted)]">Молодец! Ты прочитал книгу.</p>
            <div className="mt-5 flex w-full gap-2">
              <button onClick={() => setPage(0)} className="btn btn-soft flex-1"><RotateCcw size={18} /> Сначала</button>
              <button onClick={() => nav('/books')} className="btn btn-primary flex-1">К книгам</button>
            </div>
          </div>
        ) : (
          <div key={page} className="animate-fadein">
            {/* illustration */}
            <div className="card relative mb-3 aspect-square w-full overflow-hidden !p-0">
              {imgOk ? (
                <img src={book.pages[page].image} alt="" className="h-full w-full object-cover" onError={() => setImgOk(false)} />
              ) : (
                <div className="grid h-full w-full place-items-center bg-[var(--color-surface2)] text-[var(--color-muted)]"><ImageIcon size={48} /></div>
              )}
              <span className="absolute bottom-2 right-2 rounded-full bg-black/45 px-2.5 py-1 text-xs font-semibold text-white">{page + 1} / {total}</span>
            </div>

            {/* text */}
            <div className="card">
              <div className="flex items-start gap-2">
                <p data-lookup className="flex-1 text-lg leading-relaxed">{book.pages[page].en}</p>
                <SpeakButton text={book.pages[page].en} className="mt-0.5" />
              </div>
              <button onClick={() => setShowRu((v) => !v)} className="btn btn-soft mt-3 gap-2">
                <Languages size={16} /> {showRu ? 'Скрыть перевод' : 'Перевод'}
              </button>
              {showRu && <p className="mt-2 leading-relaxed text-[var(--color-muted)]">{book.pages[page].ru}</p>}
            </div>
          </div>
        )}
      </div>

      {/* nav */}
      {!atEnd && (
        <div className="mt-4 flex items-center gap-3">
          <button onClick={() => go(-1)} disabled={page === 0}
            className="btn btn-soft !px-4 disabled:opacity-30"><ChevronLeft size={20} /></button>
          <div className="flex flex-1 items-center gap-1">
            {book.pages.map((_, i) => (
              <span key={i} className="h-1.5 flex-1 rounded-full transition-colors"
                style={{ background: i <= page ? 'var(--color-primary)' : 'var(--color-surface2)' }} />
            ))}
          </div>
          <button onClick={() => go(1)} className="btn btn-primary !px-4">
            {page === total - 1 ? 'Конец' : <ChevronRight size={20} />}
          </button>
        </div>
      )}
      <p className="mt-3 text-center text-xs text-[var(--color-muted)]">Листай свайпом или кнопками · нажми на слово для перевода</p>
    </div>
  );
}
