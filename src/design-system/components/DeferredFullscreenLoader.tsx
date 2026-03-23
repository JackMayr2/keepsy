import React from 'react';
import { useDeferredLoading, DEFERRED_LOADING_DELAY_MS } from '../hooks/useDeferredLoading';
import { LoadingState } from './LoadingState';

export type DeferredFullscreenLoaderProps = {
  /** When true, may show the full-screen loader after the delay. */
  active: boolean;
  /** Milliseconds `active` must stay true before the overlay appears. @default 500 */
  delayMs?: number;
  /** Screen reader only — no visible text. */
  accessibilityLabel?: string;
  size?: number;
  dimBackground?: boolean;
};

/**
 * Standard full-screen loading: dimmed window + Lottie only (no on-screen copy), after
 * `delayMs` (default 500ms) so quick work never flashes the overlay.
 */
export function DeferredFullscreenLoader({
  active,
  delayMs = DEFERRED_LOADING_DELAY_MS,
  accessibilityLabel,
  size,
  dimBackground,
}: DeferredFullscreenLoaderProps) {
  const showOverlay = useDeferredLoading(active, delayMs);

  if (!active || !showOverlay) return null;

  return (
    <LoadingState
      fill
      accessibilityLabel={accessibilityLabel}
      size={size}
      dimBackground={dimBackground}
    />
  );
}
