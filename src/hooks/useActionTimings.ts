import { useCallback, useState } from "react";

export type ActionTiming = {
  key: string;
  label: string;
  durationMs: number;
  ok: boolean;
  at: number;
};

export function useActionTimings(max = 8) {
  const [timings, setTimings] = useState<ActionTiming[]>([]);

  const measure = useCallback(
    async <T,>(key: string, label: string, fn: () => Promise<T>): Promise<T> => {
      const start = performance.now();
      let ok = true;
      try {
        return await fn();
      } catch (e) {
        ok = false;
        throw e;
      } finally {
        const durationMs = Math.round(performance.now() - start);
        setTimings((prev) =>
          [{ key, label, durationMs, ok, at: Date.now() }, ...prev].slice(0, max),
        );
        // Útil pra inspecionar no DevTools
        // eslint-disable-next-line no-console
        console.info(`[timing] ${label} (${key}) — ${durationMs}ms ${ok ? "ok" : "fail"}`);
      }
    },
    [max],
  );

  const clear = useCallback(() => setTimings([]), []);

  return { timings, measure, clear };
}