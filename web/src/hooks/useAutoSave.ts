import { useCallback, useRef, useState } from "react";
import type { AutoSaveStatus } from "../module/record/moduleRecord.types";

/**
 * Saves the latest value once edits pause for `delay` ms. Saves run one at a time;
 * changes made during a save are saved right after it, so each save sees the previous one's result.
 */
export function useAutoSave<T>(
  onSave: (value: T) => void | Promise<unknown>,
  delay = 800,
) {
  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = useRef<{ value: T } | null>(null);
  const running = useRef<Promise<void> | null>(null);

  const drain = useCallback(async () => {
    while (pending.current) {
      const { value } = pending.current;
      pending.current = null;
      setStatus("saving");
      try {
        await onSave(value);
        setStatus(pending.current ? "saving" : "saved");
      } catch {
        setStatus("error");
        break;
      }
    }
    running.current = null;
  }, [onSave]);

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    if (!running.current && pending.current) running.current = drain();
    return running.current ?? Promise.resolve();
  }, [drain]);

  const schedule = useCallback(
    (value: T) => {
      pending.current = { value };
      setStatus("pending");
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    },
    [flush, delay],
  );

  return { status, schedule, flush };
}
