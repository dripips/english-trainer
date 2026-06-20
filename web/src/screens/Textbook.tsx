import { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, BookX } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { api } from '../api';
import { useApi } from '../lib/useApi';
import { Header } from '../components/Header';
import { Spinner, EmptyState } from '../components/ui';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export function Textbook() {
  const { data: info, loading } = useApi(() => api.textbookInfo(), []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [rendering, setRendering] = useState(true);

  const renderPage = useCallback(async (n: number, z: number) => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas) return;
    setRendering(true);
    try {
      const p = await pdf.getPage(n);
      const base = p.getViewport({ scale: 1 });
      const containerW = (wrapRef.current?.clientWidth || 360);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const scale = (containerW / base.width) * z * dpr;
      const viewport = p.getViewport({ scale });
      const ctx = canvas.getContext('2d')!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / dpr}px`;
      canvas.style.height = `${viewport.height / dpr}px`;
      await p.render({ canvasContext: ctx, viewport }).promise;
    } catch { /* ignore */ }
    setRendering(false);
  }, []);

  useEffect(() => {
    if (!info?.available) return;
    let cancelled = false;
    const task = pdfjsLib.getDocument({
      url: '/api/textbook/file',
      withCredentials: true,
      disableStream: true,      // use HTTP range requests, don't download the whole file
      disableAutoFetch: true,   // fetch only the pages we view
      rangeChunkSize: 262144,
    });
    task.promise.then((pdf: any) => {
      if (cancelled) return;
      pdfRef.current = pdf;
      setNumPages(pdf.numPages);
      renderPage(1, 1);
    }).catch(() => setRendering(false));
    return () => { cancelled = true; };
  }, [info?.available, renderPage]);

  useEffect(() => { if (pdfRef.current) renderPage(page, zoom); }, [page, zoom, renderPage]);

  if (loading) return <Spinner />;
  if (!info?.available) {
    return (
      <div>
        <Header back title="Учебник" />
        <EmptyState icon={BookX} title="Учебник не загружен" hint="PDF учебника кладётся на сервер отдельно (он не входит в репозиторий). Попроси добавить его." />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Header back title="Учебник" subtitle={numPages ? `стр. ${page} из ${numPages}` : 'загрузка…'} />
      <div ref={wrapRef} className="no-scrollbar flex-1 overflow-auto rounded-2xl bg-[var(--color-bg2)] p-2">
        <div className="flex justify-center">
          <canvas ref={canvasRef} className="rounded-lg bg-white" />
        </div>
        {rendering && <p className="py-3 text-center text-sm text-[var(--color-muted)]">рендерю страницу…</p>}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn btn-soft !px-3"><ChevronLeft size={20} /></button>
        <input
          type="number" min={1} max={numPages} value={page}
          onChange={(e) => { const n = Math.min(numPages, Math.max(1, Number(e.target.value) || 1)); setPage(n); }}
          className="input w-16 text-center" />
        <span className="text-sm text-[var(--color-muted)]">/ {numPages}</span>
        <div className="flex-1" />
        <button onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(1)))} className="btn btn-soft !px-3"><ZoomOut size={18} /></button>
        <button onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(1)))} className="btn btn-soft !px-3"><ZoomIn size={18} /></button>
        <button onClick={() => setPage((p) => Math.min(numPages, p + 1))} disabled={page >= numPages} className="btn btn-soft !px-3"><ChevronRight size={20} /></button>
      </div>
    </div>
  );
}
