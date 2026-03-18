/**
 * Design tokens — re-exported from design-system for legacy useTheme() consumers.
 * Single source: design-system/theme/keepsy-tokens.ts
 */
import { keepsySpace, keepsyRadius, keepsyFontSize, keepsyFontWeight, keepsyLineHeight, keepsyShadows } from '@/src/design-system/theme/keepsy-tokens';

export const spacing = {
  xs: keepsySpace[2],
  sm: keepsySpace[3],
  md: keepsySpace[4],
  lg: keepsySpace[6],
  xl: keepsySpace[7],
  xxl: keepsySpace[9],
} as const;

export const radii = {
  sm: keepsyRadius[2],
  md: keepsyRadius[3],
  lg: keepsyRadius[5],
  xl: keepsyRadius[6],
  pill: keepsyRadius.pill,
  full: keepsyRadius.full,
} as const;

export const typography = {
  fontSize: {
    xs: keepsyFontSize[2],
    sm: keepsyFontSize[3],
    base: keepsyFontSize[4],
    lg: keepsyFontSize[5],
    xl: keepsyFontSize[6],
    '2xl': keepsyFontSize[8],
    '3xl': keepsyFontSize[9],
  },
  fontWeight: {
    normal: keepsyFontWeight[2] as '400',
    medium: keepsyFontWeight[3] as '500',
    semibold: keepsyFontWeight[4] as '600',
    bold: keepsyFontWeight[5] as '700',
  },
  lineHeight: {
    tight: keepsyLineHeight[1],
    normal: keepsyLineHeight[3],
    relaxed: keepsyLineHeight[4],
  },
} as const;

export const shadows = {
  sm: keepsyShadows.sm,
  md: keepsyShadows.md,
  lg: keepsyShadows.lg,
} as const;
