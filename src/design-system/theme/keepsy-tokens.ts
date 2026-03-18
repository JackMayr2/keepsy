/**
 * Keepsy design tokens — single source of truth.
 * Visual direction: iridescent, glossy, social, playful, premium.
 */

export const keepsyGradients = {
  daydream: ['#FFF5FD', '#F0ECFF', '#E7F5FF'] as const,
  aurora: ['#6D67FF', '#B16FFF', '#FF77B8'] as const,
  bubble: ['#FFD56C', '#FF8CC5', '#7FE4FF'] as const,
  spotlight: ['#FFFFFF', '#F8F3FF', '#EFF7FF'] as const,
  afterparty: ['#0B1030', '#22297A', '#7A41D8'] as const,
} as const;

export const keepsyLogo = {
  mark: '#FFFFFF',
  orbit: '#FFD96E',
  wordmark: '#16142E',
  wordmarkInverse: '#FFFFFF',
} as const;

// Raw color palette for light mode.
export const keepsyColors = {
  background: {
    primary: '#F7F4FF',
    secondary: '#EEF4FF',
    tertiary: '#FFFFFF',
    wash: 'rgba(255,255,255,0.64)',
  },
  surface: {
    primary: 'rgba(255,255,255,0.88)',
    secondary: 'rgba(255,255,255,0.72)',
    muted: '#E6E2FA',
  },
  text: {
    primary: '#16142E',
    secondary: '#5D5A82',
    muted: '#8D89B0',
    inverse: '#FFFFFF',
  },
  brand: {
    primary: '#5D5AF6',
    primaryHover: '#4B46E4',
    primaryMuted: '#D1CCFF',
    accent: '#FF6CB2',
    accentMuted: '#FFD8EA',
    highlight: '#69DEFF',
    sun: '#FFD56C',
  },
  border: {
    subtle: 'rgba(123, 110, 194, 0.16)',
    default: 'rgba(102, 92, 165, 0.26)',
    strong: 'rgba(78, 67, 137, 0.4)',
  },
  semantic: {
    success: '#17A271',
    successMuted: '#D9FFF1',
    error: '#E24E70',
    errorMuted: '#FFE0E7',
    warning: '#D99219',
    warningMuted: '#FFF0C7',
  },
  pastel: {
    lavender: '#EEE8FF',
    pink: '#FFE4F2',
    mint: '#E1FFF5',
    peach: '#FFF0DC',
    blue: '#E5F5FF',
  },
} as const;

export const keepsyColorsDark = {
  ...keepsyColors,
  background: {
    primary: '#0B1030',
    secondary: '#14193D',
    tertiary: '#1B2151',
    wash: 'rgba(11,16,48,0.42)',
  },
  surface: {
    primary: 'rgba(23,29,70,0.88)',
    secondary: 'rgba(28,34,79,0.72)',
    muted: '#20285F',
  },
  text: {
    primary: '#F8F7FF',
    secondary: '#D2CEF7',
    muted: '#9DA2CB',
    inverse: '#131733',
  },
  brand: {
    primary: '#8A83FF',
    primaryHover: '#A59FFF',
    primaryMuted: '#302C77',
    accent: '#FF97CA',
    accentMuted: '#512043',
    highlight: '#7BE7FF',
    sun: '#FFD982',
  },
  border: {
    subtle: 'rgba(181, 175, 255, 0.12)',
    default: 'rgba(181, 175, 255, 0.22)',
    strong: 'rgba(209, 203, 255, 0.34)',
  },
  semantic: {
    success: '#55E0B1',
    successMuted: '#133F38',
    error: '#FF8AA3',
    errorMuted: '#4F2230',
    warning: '#FFD36E',
    warningMuted: '#493618',
  },
  pastel: {
    lavender: '#2C2A73',
    pink: '#4A2040',
    mint: '#153D38',
    peach: '#4B331F',
    blue: '#183A57',
  },
} as const;

// ——— Spacing scale (consistent rhythm)
export const keepsySpace = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 32,
  8: 40,
  9: 48,
  10: 64,
  true: 16,
} as const;

// ——— Size (for icons, avatars, controls)
export const keepsySize = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 40,
  10: 48,
  11: 56,
  12: 64,
  true: 16,
} as const;

// ——— Radius (rounded, soft geometry)
export const keepsyRadius = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  pill: 9999,
  full: 9999,
  true: 12,
} as const;

// ——— Typography
export const keepsyFontSize = {
  1: 11,
  2: 12,
  3: 14,
  4: 16,
  5: 18,
  6: 20,
  7: 24,
  8: 28,
  9: 32,
  10: 40,
  true: 16,
} as const;

export const keepsyFontWeight = {
  1: '300',
  2: '400',
  3: '500',
  4: '600',
  5: '700',
  true: '400',
} as const;

export const keepsyLineHeight = {
  1: 1.2,
  2: 1.35,
  3: 1.5,
  4: 1.6,
  true: 1.5,
} as const;

// ——— Shadows / elevation (soft, premium)
export const keepsyShadows = {
  none: { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  xs: { shadowColor: '#1C1917', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 },
  sm: { shadowColor: '#1C1917', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  md: { shadowColor: '#1C1917', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 5 },
  lg: { shadowColor: '#1C1917', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 8 },
} as const;
