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
    body: { fontSize: typo.fontSize.base, fontWeight: typo.fontWeight.normal },
    bodySmall: { fontSize: typo.fontSize.sm, fontWeight: typo.fontWeight.normal },
    title: { fontSize: typo.fontSize.xl, fontWeight: typo.fontWeight.semibold },
    titleLarge: { fontSize: typo.fontSize['2xl'], fontWeight: typo.fontWeight.bold },
    caption: { fontSize: typo.fontSize.xs, fontWeight: typo.fontWeight.normal },
    label: { fontSize: typo.fontSize.sm, fontWeight: typo.fontWeight.medium },
  };

  return (
    <RNText
      style={[
        variantStyles[variant],
        { color: colorMap[color] },
        style,
      ]}
      {...props}
    />
  );
}
