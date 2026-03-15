import React from 'react';
import {
  Pressable,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const { theme } = useTheme();
  const { colors, spacing, radii, shadows } = theme;

  const variantStyles: Record<ButtonVariant, { bg: string; border?: string; textColor?: string }> = {
    primary: { bg: colors.primary, textColor: '#FFFFFF' },
    secondary: { bg: colors.surfaceMuted, textColor: colors.text },
    ghost: { bg: 'transparent', textColor: colors.text },
    outline: { bg: 'transparent', border: colors.border, textColor: colors.text },
  };

  const v = variantStyles[variant];
  const isDisabled = disabled || loading;
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: v.bg,
          borderWidth: v.border ? 1.5 : 0,
          borderColor: v.border,
          paddingVertical: spacing.sm + 2,
          paddingHorizontal: spacing.lg,
          borderRadius: radii.pill,
          opacity: isDisabled ? 0.5 : pressed ? 0.92 : 1,
          ...(isPrimary && !isDisabled ? shadows.sm : {}),
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#fff' : colors.primary}
        />
      ) : (
        <Text
          variant="label"
          style={{
            color: v.textColor ?? colors.text,
            fontWeight: '600',
            letterSpacing: 0.2,
          }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
});
