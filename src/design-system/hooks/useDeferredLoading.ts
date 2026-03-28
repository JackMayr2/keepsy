import { useEffect, useState } from 'react';

const DEFAULT_DELAY_MS = 1500;

/**
 * True only after `active` has been continuously true for at least `delayMs`.
 * Hides immediately when `active` becomes false (no minimum display time).
 *
 * Use for full-screen loaders so fast operations (under the delay) never flash an overlay.
 */
export function useDeferredLoading(
  active: boolean,
  delayMs: number = DEFAULT_DELAY_MS
): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    const id = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(id);
  }, [active, delayMs]);

  return visible;
}

export const DEFERRED_LOADING_DELAY_MS = DEFAULT_DELAY_MS;
