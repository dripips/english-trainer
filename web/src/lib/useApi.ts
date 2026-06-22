import { useCallback, useEffect, useState } from 'react';

// Minimal data-fetching hook with loading/error/refetch.
export function useApi<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(() => {
    let alive = true;
    let attempt = 0;
    setLoading(true);
    setError(null);
    // Retry transient failures (e.g. a brief server restart during deploy) before
    // giving up, so the UI self-heals instead of hanging on a spinner.
    const attemptFn = () => {
      fn()
        .then((d) => { if (alive) { setData(d); setLoading(false); } })
        .catch((e) => {
          if (!alive) return;
          if (e?.message === 'unauthorized' || attempt >= 2) {
            setError(e?.message || 'error');
            setLoading(false);
          } else {
            attempt += 1;
            setTimeout(attemptFn, 800);
          }
        });
    };
    attemptFn();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => run(), [run]);

  return { data, loading, error, refetch: run, setData };
}
