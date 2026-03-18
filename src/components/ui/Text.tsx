import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { useTheme } from '@/src/contexts/ThemeContext';

export type TextVariant = 'body' | 'bodySmall' | 'title' | 'titleLarge' | 'caption' | 'label';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: 'default' | 'secondary' | 'muted' | 'primary';
}

export function Text({
  variant = 'body',
  color = 'default',
  style,
  ...props
}: TextProps) {
  const { theme } = useTheme();
  const { colors, typography: typo } = theme;

  const colorMap = {
    default: colors.text,
    secondary: colors.textSecondary,
    muted: colors.textMuted,
    primary: colors.primary,
  };

  const variantStyles: Record<TextVariant, object> = {
    body: { fontSize: typo.fontSize.base, lineHeight: 24, fontWeight: typo.fontWeight.normal },
    bodySmall: { fontSize: typo.fontSize.sm, lineHeight: 20, fontWeight: typo.fontWeight.normal },
    title: { fontSize: typo.fontSize.xl, lineHeight: 28, fontWeight: typo.fontWeight.semibold, letterSpacing: -0.4 },
    titleLarge: { fontSize: typo.fontSize['2xl'], lineHeight: 36, fontWeight: typo.fontWeight.bold, letterSpacing: -0.9 },
    caption: { fontSize: typo.fontSize.xs, lineHeight: 16, fontWeight: typo.fontWeight.normal },
    label: { fontSize: typo.fontSize.sm, lineHeight: 18, fontWeight: typo.fontWeight.medium, letterSpacing: 0.2 },
  };

  return (
    <RNText
      style={[
        styles.base,
        variantStyles[variant],
        { color: colorMap[color] },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
