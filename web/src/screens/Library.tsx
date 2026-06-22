import { Link } from 'react-router-dom';
import { BookOpen, BookX, ChevronRight, FileText, Star } from 'lucide-react';
import { api } from '../api';
import type { LibraryBook, LibraryLevel } from '../types';
import { useApi } from '../lib/useApi';
import { Header } from '../components/Header';
import { EmptyState, Spinner } from '../components/ui';

const LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;

export function Library() {
  const { data, loading } = useApi(() => api.libraryBooks(), []);
  const levels = normalizeLevels(data?.levels);
  const total = levels.reduce((sum, l) => sum + l.count, 0);
  const recommended = levels.flatMap((l) => l.books).filter((b) => b.recommended);

  if (loading || !data) return <Spinner label="Открываю библиотеку…" />;

  return (
    <div className="space-y-5">
      <Header back title="Библиотека" subtitle={total ? `${total} PDF по уровням A1–B2` : 'книги по уровням'} />

      {recommended.length > 0 && (
        <section>
          <div className="mb-2 flex items-center gap-2">
            <Star size={16} className="text-[var(--color-amber)]" />
            <span className="display text-sm font-bold text-[var(--color-amber)]">Рекомендуем начать</span>
          </div>
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
            {recommended.map((book) => (
              <BookCard key={`${book.level}/${book.file}`} book={book} compact />
            ))}
          </div>
        </section>
      )}

      {levels.map((level) => (
        <section key={level.level}>
          <div className="mb-2 flex items-center gap-2">
            <span className="display text-lg font-bold" style={{ color: levelColor(level.level) }}>{level.level}</span>
            <span className="text-xs text-[var(--color-muted)]">{level.count} {plural(level.count, 'книга', 'книги', 'книг')}</span>
          </div>

          {level.books.length ? (
            <div className="space-y-2.5">
              {level.books.map((book) => (
                <BookCard key={`${book.level}/${book.file}`} book={book} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-4 py-5">
              <EmptyState icon={BookX} title={`Нет книг ${level.level}`} hint="Книги появятся здесь после добавления PDF на сервер." />
            </div>
          )}
        </section>
      ))}

      {!total && (
        <div className="card flex items-center gap-3 !py-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--color-mint)_18%,transparent)]">
            <BookOpen size={20} className="text-[var(--color-mint)]" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold">Библиотека готова</div>
            <div className="text-xs text-[var(--color-muted)]">Осталось добавить PDF-файлы по уровням на сервер.</div>
          </div>
        </div>
      )}
    </div>
  );
}

function BookCard({ book, compact }: { book: LibraryBook; compact?: boolean }) {
  const href = `/library/${book.level}/${encodeURIComponent(book.file)}`;
  const color = levelColor(book.level);

  if (compact) {
    return (
      <Link to={href} className="w-32 shrink-0 transition active:scale-[0.97]">
        <div className="relative mb-1.5 h-44 w-32 overflow-hidden rounded-2xl bg-[var(--color-surface2)]">
          {book.coverUrl
            ? <img src={book.coverUrl} alt={book.title} className="h-full w-full object-cover" />
            : <CoverPlaceholder color={color} />}
          {book.recommended && (
            <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-[var(--color-amber)] px-2 py-0.5 text-[10px] font-bold text-black">
              <Star size={9} fill="currentColor" /> Топ
            </div>
          )}
          <div className="absolute bottom-1.5 right-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ background: color, color: '#160f33' }}>{book.level}</div>
        </div>
        <div className="line-clamp-2 text-xs font-semibold leading-tight">{book.title}</div>
        {book.author && <div className="mt-0.5 truncate text-[11px] text-[var(--color-muted)]">{book.author}</div>}
      </Link>
    );
  }

  return (
    <Link to={href} className="card flex gap-3 overflow-hidden !py-3 transition active:scale-[0.98]">
      <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-xl bg-[var(--color-surface2)]">
        {book.coverUrl
          ? <img src={book.coverUrl} alt={book.title} className="h-full w-full object-cover" />
          : <CoverPlaceholder color={color} icon />}
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1 truncate font-semibold">{book.title}</div>
          {book.recommended && <Star size={14} className="mt-0.5 shrink-0 text-[var(--color-amber)]" fill="currentColor" />}
        </div>
        {book.author && <div className="truncate text-xs text-[var(--color-muted)]">{book.author}</div>}
        {book.description && <div className="mt-1 line-clamp-2 text-xs text-[var(--color-muted)]">{book.description}</div>}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {book.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-[var(--color-surface2)] px-2 py-0.5 text-[10px] text-[var(--color-muted)]">{tag}</span>
          ))}
          <span className="ml-auto text-[10px] text-[var(--color-muted)]">
            {formatBytes(book.size)}{book.pages ? ` · ${book.pages} стр.` : ''}
          </span>
        </div>
      </div>
      <ChevronRight size={18} className="self-center shrink-0 text-[var(--color-muted)]" />
    </Link>
  );
}

function CoverPlaceholder({ color, icon }: { color: string; icon?: boolean }) {
  return (
    <div className="flex h-full w-full items-center justify-center" style={{ background: `color-mix(in srgb, ${color} 20%, var(--color-surface2))` }}>
      <FileText size={icon ? 20 : 28} style={{ color }} />
    </div>
  );
}

function normalizeLevels(levels?: LibraryLevel[]) {
  const byLevel = new Map((levels || []).map((l) => [l.level, l]));
  return LEVELS.map((level) => byLevel.get(level) || { level, title: level, count: 0, books: [] as LibraryBook[] });
}

function levelColor(level: string) {
  if (level === 'A1') return 'var(--color-mint)';
  if (level === 'A2') return 'var(--color-sky)';
  if (level === 'B1') return 'var(--color-amber)';
  return 'var(--color-pink)';
}

function formatBytes(bytes: number) {
  if (!bytes) return '';
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(mb >= 10 ? 0 : 1)} МБ` : `${Math.round(bytes / 1024)} КБ`;
}

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}
