import React from 'react';
import { Pressable, StyleSheet, ViewStyle, StyleProp, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
  iconAfter?: React.ReactNode;
  compact?: boolean;
  iconOnly?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  icon,
  iconAfter,
  compact = false,
  iconOnly = false,
}: ButtonProps) {
  const { colorScheme, theme } = useTheme();
  const { colors, spacing, radii, shadows } = theme;

  const secondaryBackground = colorScheme === 'dark' ? 'rgba(255,255,255,0.12)' : colors.surfaceGlass;
  const outlineBackground = colorScheme === 'dark' ? 'rgba(16, 22, 58, 0.92)' : colors.surfaceSecondary;
  const variantStyles: Record<ButtonVariant, { bg: string; border?: string; textColor?: string }> = {
    primary: { bg: colors.primary, border: 'rgba(255,255,255,0.16)', textColor: '#FFFFFF' },
    secondary: { bg: secondaryBackground, border: colors.glassBorder, textColor: colors.text },
    ghost: { bg: 'transparent', textColor: colors.text },
    outline: { bg: outlineBackground, border: colors.glassBorder, textColor: colors.text },
  };

  const v = variantStyles[variant];
  const isDisabled = disabled || loading;
  const isPrimary = variant === 'primary';
  const innerStyle = {
    borderWidth: v.border ? 1 : 0,
    borderColor: v.border,
    paddingVertical: compact ? spacing.sm : spacing.sm + 2,
    paddingHorizontal: iconOnly ? 0 : compact ? spacing.md + 2 : spacing.lg,
    borderRadius: iconOnly ? 18 : radii.pill,
    minHeight: compact ? 46 : 54,
    minWidth: iconOnly ? (compact ? 46 : 54) : undefined,
  };
  const content = (
    <View style={[styles.content, iconOnly && styles.contentIconOnly]}>
      {iconOnly ? (
        icon
      ) : (
        <>
          <View style={styles.iconSlot}>{icon}</View>
          <View style={styles.labelWrap}>
            <Text
              variant="label"
              style={{
                color: v.textColor ?? colors.text,
                fontWeight: '700',
                letterSpacing: 0.3,
                textAlign: 'center',
                textAlignVertical: 'center',
                includeFontPadding: false,
              }}
              numberOfLines={1}
            >
              {title}
            </Text>
          </View>
          <View style={styles.iconSlot}>{iconAfter}</View>
        </>
      )}
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.pressable,
        isPrimary && !isDisabled ? shadows.md : undefined,
        {
          opacity: isDisabled ? 0.52 : pressed ? 0.94 : 1,
        },
        style,
      ]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={[colors.primary, colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, innerStyle]}
        >
          {content}
        </LinearGradient>
      ) : (
        <View style={[styles.base, innerStyle, { backgroundColor: v.bg }]}>
          {content}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: 999,
  },
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    width: '100%',
  },
  contentIconOnly: {
    gap: 0,
  },
  iconSlot: {
    width: 24,
    minHeight: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelWrap: {
    flex: 1,
    minWidth: 0,
  },
});
