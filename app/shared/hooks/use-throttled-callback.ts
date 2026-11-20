import { useCallback, useRef } from "react";

/** `callback`, run at most once per `intervalMs`; calls in between are dropped. */
export function useThrottledCallback(callback: () => void, intervalMs: number): () => void {
  const lastRun = useRef(0);

  return useCallback(() => {
    const now = Date.now();
    if (now - lastRun.current >= intervalMs) {
      lastRun.current = now;
      callback();
    }
  }, [callback, intervalMs]);
}
