import { spacing, radii, typography, shadows } from './tokens';
import { keepsyColors, keepsyColorsDark } from '@/src/design-system/theme/keepsy-tokens';

export type ThemeColors = {
  primary: string;
  primaryMuted: string;
  accent: string;
  highlight: string;
  sun: string;
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  backgroundWash: string;
  surface: string;
  surfaceSecondary: string;
  surfaceMuted: string;
  surfaceGlass: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderMuted: string;
  glassBorder: string;
  pastelPink: string;
  pastelLavender: string;
  pastelMint: string;
  pastelPeach: string;
  pastelBlue: string;
  success: string;
  error: string;
  warning: string;
};

export const lightColors: ThemeColors = {
  primary: keepsyColors.brand.primary,
  primaryMuted: keepsyColors.brand.primaryMuted,
  accent: keepsyColors.brand.accent,
  highlight: keepsyColors.brand.highlight,
  sun: keepsyColors.brand.sun,
  background: keepsyColors.background.primary,
  backgroundSecondary: keepsyColors.background.secondary,
  backgroundTertiary: keepsyColors.background.tertiary,
  backgroundWash: keepsyColors.background.wash,
  surface: keepsyColors.surface.primary,
  surfaceSecondary: keepsyColors.surface.secondary,
  surfaceMuted: keepsyColors.surface.muted,
  surfaceGlass: keepsyColors.surface.secondary,
  text: keepsyColors.text.primary,
  textSecondary: keepsyColors.text.secondary,
  textMuted: keepsyColors.text.muted,
  border: keepsyColors.border.subtle,
  borderMuted: keepsyColors.border.default,
  glassBorder: keepsyColors.border.default,
  pastelPink: keepsyColors.pastel.pink,
  pastelLavender: keepsyColors.pastel.lavender,
  pastelMint: keepsyColors.pastel.mint,
  pastelPeach: keepsyColors.pastel.peach,
  pastelBlue: keepsyColors.pastel.blue,
  success: keepsyColors.semantic.success,
  error: keepsyColors.semantic.error,
  warning: keepsyColors.semantic.warning,
};

export const darkColors: ThemeColors = {
  primary: keepsyColorsDark.brand.primary,
  primaryMuted: keepsyColorsDark.brand.primaryMuted,
  accent: keepsyColorsDark.brand.accent,
  highlight: keepsyColorsDark.brand.highlight,
  sun: keepsyColorsDark.brand.sun,
  background: keepsyColorsDark.background.primary,
  backgroundSecondary: keepsyColorsDark.background.secondary,
  backgroundTertiary: keepsyColorsDark.background.tertiary,
  backgroundWash: keepsyColorsDark.background.wash,
  surface: keepsyColorsDark.surface.primary,
  surfaceSecondary: keepsyColorsDark.surface.secondary,
  surfaceMuted: keepsyColorsDark.surface.muted,
  surfaceGlass: keepsyColorsDark.surface.secondary,
  text: keepsyColorsDark.text.primary,
  textSecondary: keepsyColorsDark.text.secondary,
  textMuted: keepsyColorsDark.text.muted,
  border: keepsyColorsDark.border.subtle,
  borderMuted: keepsyColorsDark.border.default,
  glassBorder: keepsyColorsDark.border.default,
  pastelPink: keepsyColorsDark.pastel.pink,
  pastelLavender: keepsyColorsDark.pastel.lavender,
  pastelMint: keepsyColorsDark.pastel.mint,
  pastelPeach: keepsyColorsDark.pastel.peach,
  pastelBlue: keepsyColorsDark.pastel.blue,
  success: keepsyColorsDark.semantic.success,
  error: keepsyColorsDark.semantic.error,
  warning: keepsyColorsDark.semantic.warning,
};

export type Theme = {
  colors: ThemeColors;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  shadows: typeof shadows;
};

export const lightTheme: Theme = {
  colors: lightColors,
  spacing,
  radii,
  typography,
  shadows,
};

export const darkTheme: Theme = {
  colors: darkColors,
  spacing,
  radii,
  typography,
  shadows,
};
