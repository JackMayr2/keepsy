import React from 'react';
import { BrandBackground, type BrandBackgroundPreset } from '@/src/design-system/components/BrandBackground';
import { useTheme } from '@/src/contexts/ThemeContext';

type ScreenBackgroundProps = {
  preset?: BrandBackgroundPreset;
};

/**
 * Full-screen brand backdrop: light pastel blobs in light mode,
 * darker animated blobs (`afterparty`) in dark mode.
 */
export function ScreenBackground({ preset = 'daydream' }: ScreenBackgroundProps) {
  const { colorScheme } = useTheme();
  const effectivePreset = colorScheme === 'dark' ? 'afterparty' : preset;
  return <BrandBackground preset={effectivePreset} />;
}
