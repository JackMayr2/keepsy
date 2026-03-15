import { spacing, radii, typography, shadows } from './tokens';

export const lightColors = {
  primary: '#6D28D9',
  primaryMuted: '#A78BFA',
  background: '#F8F6F4',
  surface: '#FFFFFF',
  surfaceMuted: '#F3F1EE',
  text: '#1C1917',
  textSecondary: '#57534E',
  textMuted: '#A8A29E',
  border: '#E7E5E4',
  borderMuted: '#F5F5F4',
  pastelPink: '#FDF2F8',
  pastelLavender: '#F5F3FF',
  pastelMint: '#ECFDF5',
  pastelPeach: '#FFF7ED',
  pastelBlue: '#EFF6FF',
  success: '#059669',
  error: '#DC2626',
  warning: '#D97706',
};

export type ThemeColors = typeof lightColors;

export const darkColors: ThemeColors = {
  ...lightColors,
  primary: '#A78BFA',
  primaryMuted: '#7C3AED',
  background: '#111827',
  surface: '#1F2937',
  surfaceMuted: '#374151',
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textMuted: '#9CA3AF',
  border: '#374151',
  borderMuted: '#4B5563',
  pastelPink: '#831843',
  pastelLavender: '#4C1D95',
  pastelMint: '#064E3B',
  pastelPeach: '#9A3412',
  pastelBlue: '#1E3A8A',
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
