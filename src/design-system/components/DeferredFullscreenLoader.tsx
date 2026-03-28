import React from 'react';
import { useDeferredLoading, DEFERRED_LOADING_DELAY_MS } from '../hooks/useDeferredLoading';
import { LoadingState } from './LoadingState';

export type DeferredFullscreenLoaderProps = {
  /** When true, may show the full-screen loader after the delay. */
  active: boolean;
  /** Milliseconds `active` must stay true before the overlay appears. @default 1500 */
  delayMs?: number;
  /** Screen reader only — no visible text. */
  accessibilityLabel?: string;
  /** Shown under the loader when the overlay is visible (e.g. upload progress). */
  visibleSubtitle?: string;
  size?: number;
  dimBackground?: boolean;
};

/**
 * Standard full-screen loading: dimmed window + Lottie only (no on-screen copy), after
 * `delayMs` (default 1500ms) so quick work never flashes the overlay.
 */
export function DeferredFullscreenLoader({
  active,
  delayMs = DEFERRED_LOADING_DELAY_MS,
  accessibilityLabel,
  visibleSubtitle,
  size,
  dimBackground,
}: DeferredFullscreenLoaderProps) {
  const showOverlay = useDeferredLoading(active, delayMs);

  if (!active || !showOverlay) return null;

  return (
    <LoadingState
      fill
      accessibilityLabel={accessibilityLabel}
      visibleSubtitle={visibleSubtitle}
      size={size}
      dimBackground={dimBackground}
    />
  );
}
