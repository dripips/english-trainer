import { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, BookX, Maximize2, X } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { api } from '../api';
import { useApi } from '../lib/useApi';
import { Header } from '../components/Header';
import { Spinner, EmptyState } from '../components/ui';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const PAGE_KEY = 'tb_page';

export function Textbook() {
  const { data: info, loading } = useApi(() => api.textbookInfo(), []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<any>(null);
  const saveTimer = useRef<any>(null);
  const renderSeq = useRef(0);

  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(() => Number(localStorage.getItem(PAGE_KEY)) || 1);
  const [zoom, setZoom] = useState(1);
  const [immersive, setImmersive] = useState(false);
  const [rendering, setRendering] = useState(true);

  const renderPage = useCallback(async (n: number, z: number) => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas) return;
    const seq = ++renderSeq.current;
    setRendering(true);
    try {
      const p = await pdf.getPage(n);
      const base = p.getViewport({ scale: 1 });
      const containerW = (wrapRef.current?.clientWidth || 360) - 8;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const scale = (containerW / base.width) * z * dpr;
      const viewport = p.getViewport({ scale });
      if (seq !== renderSeq.current) return;
      const ctx = canvas.getContext('2d')!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / dpr}px`;
      canvas.style.height = `${viewport.height / dpr}px`;
      await p.render({ canvasContext: ctx, viewport }).promise;
    } catch { /* ignore */ }
    if (seq === renderSeq.current) setRendering(false);
  }, []);

  // load document, resume on saved page
  useEffect(() => {
    if (!info?.available) return;
    let cancelled = false;
    const task = pdfjsLib.getDocument({
      url: '/api/textbook/file', withCredentials: true,
      disableStream: true, disableAutoFetch: true, rangeChunkSize: 262144,
    });
    task.promise.then(async (pdf: any) => {
      if (cancelled) return;
      pdfRef.current = pdf;
      setNumPages(pdf.numPages);
      // resume: localStorage first, then server settings
      let start = Number(localStorage.getItem(PAGE_KEY)) || 0;
      if (!start) { try { const s = await api.settings(); start = Number(s.textbookPage) || 1; } catch { start = 1; } }
      start = Math.min(Math.max(1, start), pdf.numPages);
      setPage(start);
      renderPage(start, 1);
    }).catch(() => setRendering(false));
    return () => { cancelled = true; };
  }, [info?.available, renderPage]);

  // re-render on page / zoom change
  useEffect(() => { if (pdfRef.current) renderPage(page, zoom); }, [page, zoom, renderPage]);

  // re-render when entering/leaving fullscreen (width changes) and on resize/rotate
  useEffect(() => {
    const t = setTimeout(() => { if (pdfRef.current) renderPage(page, zoom); }, 60);
    return () => clearTimeout(t);
  }, [immersive]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let t: any;
    const onResize = () => { clearTimeout(t); t = setTimeout(() => { if (pdfRef.current) renderPage(page, zoom); }, 150); };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => { window.removeEventListener('resize', onResize); window.removeEventListener('orientationchange', onResize); };
  }, [page, zoom, renderPage]);

  // persist page (local + server)
  useEffect(() => {
    if (!numPages) return;
    localStorage.setItem(PAGE_KEY, String(page));
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { api.setSettings({ textbookPage: page }).catch(() => {}); }, 800);
  }, [page, numPages]);

  const go = useCallback((d: number) => {
    setPage((p) => Math.min(numPages || 1, Math.max(1, p + d)));
  }, [numPages]);

  // swipe to turn pages (only when not zoomed in); double-tap to zoom
  const touch = useRef<{ x: number; y: number; t: number; lastTap: number }>({ x: 0, y: 0, t: 0, lastTap: 0 });
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touch.current.x = t.clientX; touch.current.y = t.clientY; touch.current.t = Date.now();
  }
  function onTouchEnd(e: React.TouchEvent) {
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;
    const dt = Date.now() - touch.current.t;
    // double-tap zoom toggle
    if (dt < 250 && Math.abs(dx) < 12 && Math.abs(dy) < 12) {
      const now = Date.now();
      if (now - touch.current.lastTap < 300) { setZoom((z) => (z > 1 ? 1 : 2)); touch.current.lastTap = 0; return; }
      touch.current.lastTap = now;
      return;
    }
    // horizontal swipe → page turn (only when not zoomed)
    if (zoom <= 1.05 && Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      go(dx < 0 ? 1 : -1);
    }
  }

  if (loading) return <Spinner />;
  if (!info?.available) {
    return (
      <div>
        <Header back title="Учебник" />
        <EmptyState icon={BookX} title="Учебник не загружен" hint="PDF учебника кладётся на сервер отдельно (он не входит в репозиторий)." />
      </div>
    );
  }

  const canvasEl = (
    <div ref={wrapRef} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      className="no-scrollbar flex-1 overflow-auto rounded-2xl bg-[var(--color-bg2)]">
      <div className="tb-stage">
        <canvas ref={canvasRef} className="rounded-lg bg-white" />
      </div>
    </div>
  );

  const pager = (compact = false) => (
    <div className={`flex items-center gap-2 ${compact ? '' : 'mt-3'}`}>
      <button onClick={() => go(-1)} disabled={page <= 1} className="btn btn-soft !px-3 disabled:opacity-40"><ChevronLeft size={20} /></button>
      <div className="flex items-center gap-1 rounded-2xl bg-[var(--color-surface2)] px-3 py-2 text-sm">
        <input type="number" min={1} max={numPages} value={page}
          onChange={(e) => { const n = Math.min(numPages, Math.max(1, Number(e.target.value) || 1)); setPage(n); }}
          className="w-10 bg-transparent text-center outline-none" />
        <span className="text-[var(--color-muted)]">/ {numPages || '…'}</span>
      </div>
      <div className="flex-1" />
      <button onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.25).toFixed(2)))} className="btn btn-soft !px-3"><ZoomOut size={18} /></button>
      <span className="w-10 text-center text-xs text-[var(--color-muted)]">{Math.round(zoom * 100)}%</span>
      <button onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} className="btn btn-soft !px-3"><ZoomIn size={18} /></button>
      <button onClick={() => go(1)} disabled={page >= numPages} className="btn btn-soft !px-3 disabled:opacity-40"><ChevronRight size={20} /></button>
    </div>
  );

  if (immersive) {
    return (
      <div className="fixed inset-0 z-[80] flex flex-col bg-black">
        <div className="safe-top flex items-center gap-2 px-3 py-2">
          <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white">{page} / {numPages || '…'}</span>
          <div className="flex-1" />
          <button onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.25).toFixed(2)))} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white"><ZoomOut size={18} /></button>
          <button onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white"><ZoomIn size={18} /></button>
          <button onClick={() => setImmersive(false)} aria-label="Закрыть" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white"><X size={20} /></button>
        </div>
        <div ref={wrapRef} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="no-scrollbar relative flex-1 overflow-auto">
          <div className="tb-stage">
            <canvas ref={canvasRef} className="bg-white" />
          </div>
          {/* tap zones / arrows */}
          <button onClick={() => go(-1)} disabled={page <= 1} aria-label="Назад"
            className="absolute left-2 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur disabled:opacity-30"><ChevronLeft size={26} /></button>
          <button onClick={() => go(1)} disabled={page >= numPages} aria-label="Вперёд"
            className="absolute right-2 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur disabled:opacity-30"><ChevronRight size={26} /></button>
        </div>
        <div className="safe-bottom h-1" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Header back title="Учебник" subtitle={numPages ? `стр. ${page} из ${numPages}` : 'загрузка…'}
        right={<button onClick={() => setImmersive(true)} aria-label="Во весь экран" className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--color-surface)]"><Maximize2 size={18} /></button>} />
      {canvasEl}
      {rendering && <p className="py-1 text-center text-xs text-[var(--color-muted)]">рендерю…</p>}
      {pager()}
      <p className="mt-2 text-center text-[11px] text-[var(--color-muted)]">свайп — листать · двойной тап — приблизить · ⤢ — на весь экран</p>
    </div>
  );
}
