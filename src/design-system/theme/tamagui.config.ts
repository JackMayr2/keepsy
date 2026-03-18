/**
 * Tamagui config – Keepsy design system.
 * Partiful-inspired: soft, premium, pastel-forward. Single source of truth for tokens.
 */
import { config as defaultConfig } from '@tamagui/config';
import { createTamagui } from 'tamagui';
import { keepsyColors, keepsyColorsDark } from './keepsy-tokens';

type Theme = Record<string, string>;

function buildLightTheme(): Theme {
  const c = keepsyColors;
  const base = defaultConfig.themes?.light ?? ({} as Theme);
  return {
    ...base,
    background: c.background.primary,
    backgroundHover: c.background.secondary,
    backgroundPress: c.background.tertiary,
    backgroundFocus: c.surface.primary,
    backgroundStrong: c.surface.muted,
    backgroundTransparent: 'transparent',
    color: c.text.primary,
    colorHover: c.text.secondary,
    colorPress: c.text.secondary,
    colorFocus: c.brand.primary,
    colorTransparent: 'transparent',
    borderColor: c.border.subtle,
    borderColorHover: c.border.default,
    borderColorFocus: c.brand.primary,
    borderColorPress: c.border.default,
    placeholderColor: c.text.muted,
    // Primary (violet) for buttons when theme="blue"
    blue1: '#F5F3FF',
    blue2: '#EDE9FE',
    blue3: '#DDD6FE',
    blue4: '#C4B5FD',
    blue5: '#A78BFA',
    blue6: '#8B5CF6',
    blue7: '#7C5CBF',
    blue8: '#6D28D9',
    blue9: '#5B21B6',
    blue10: '#4C1D95',
    blue11: '#3B0764',
    blue12: '#1E1B4B',
  };
}

function buildDarkTheme(): Theme {
  const c = keepsyColorsDark;
  const base = defaultConfig.themes?.dark ?? ({} as Theme);
  return {
    ...base,
    background: c.background.primary,
    backgroundHover: c.background.secondary,
    backgroundPress: c.background.tertiary,
    backgroundFocus: c.surface.primary,
    backgroundStrong: c.surface.muted,
    backgroundTransparent: 'transparent',
    color: c.text.primary,
    colorHover: c.text.secondary,
    colorPress: c.text.secondary,
    colorFocus: c.brand.primary,
    colorTransparent: 'transparent',
    borderColor: c.border.subtle,
    borderColorHover: c.border.default,
    borderColorFocus: c.brand.primary,
    borderColorPress: c.border.default,
    placeholderColor: c.text.muted,
    blue1: '#1E1B4B',
    blue2: '#312E81',
    blue3: '#3730A3',
    blue4: '#4338CA',
    blue5: '#4C1D95',
    blue6: '#5B21B6',
    blue7: '#6D28D9',
    blue8: '#7C5CBF',
    blue9: '#A78BFA',
    blue10: '#C4B5FD',
    blue11: '#DDD6FE',
    blue12: '#EDE9FE',
  };
}

const keepsyLight = buildLightTheme();
const keepsyDark = buildDarkTheme();

export const config = createTamagui({
  ...defaultConfig,
  themes: {
    ...defaultConfig.themes,
    light: keepsyLight,
    dark: keepsyDark,
  },
});

// Conf type and TamaguiCustomConfig extension live in tamagui-config.d.ts
// so this file has no typeof (avoids Tamagui Babel parse error).
