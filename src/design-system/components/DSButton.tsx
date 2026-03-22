import React from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Button as TamaguiButton, Text, XStack } from 'tamagui';
import type { GetProps } from 'tamagui';
import { useTheme as useAppTheme } from '@/src/contexts/ThemeContext';
import { useHaptic } from '../hooks/useHaptic';
import { KeepsyBookLoader } from './KeepsyBookLoader';

const AnimatedButton = Animated.createAnimatedComponent(TamaguiButton);

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

export interface DSButtonProps extends Omit<GetProps<typeof TamaguiButton>, 'theme' | 'variant'> {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: React.ReactNode;
  iconAfter?: React.ReactNode;
  compact?: boolean;
  iconOnly?: boolean;
}

export function DSButton({
  title,
  variant = 'primary',
  loading = false,
  icon,
  iconAfter,
  compact = false,
  iconOnly = false,
  onPress,
  disabled,
  ...rest
}: DSButtonProps) {
  const haptic = useHaptic();
  const { colorScheme, theme } = useAppTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1);
  };
  const handlePress = (e: any) => {
    if (disabled || loading) return;
    haptic.light();
    onPress?.(e);
  };

  const surfaceBackground = colorScheme === 'dark' ? 'rgba(255,255,255,0.12)' : theme.colors.surfaceGlass;
  const outlineBackground = colorScheme === 'dark' ? 'rgba(16, 22, 58, 0.92)' : theme.colors.surfaceSecondary;
  const chrome = {
    primary: {
      backgroundColor: theme.colors.primary,
      borderColor: 'transparent',
      textColor: '#FFFFFF',
      shadowColor: theme.colors.primary,
    },
    secondary: {
      backgroundColor: surfaceBackground,
      borderColor: theme.colors.glassBorder,
      textColor: theme.colors.text,
      shadowColor: 'transparent',
    },
    outline: {
      backgroundColor: outlineBackground,
      borderColor: theme.colors.glassBorder,
      textColor: theme.colors.text,
      shadowColor: 'transparent',
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      textColor: theme.colors.text,
      shadowColor: 'transparent',
    },
  }[variant];

  return (
    <AnimatedButton
      size="$4"
      height={compact ? 46 : 54}
      width={iconOnly ? (compact ? 46 : 54) : undefined}
      paddingHorizontal={iconOnly ? 0 : compact ? '$4' : '$5'}
      borderRadius={iconOnly ? 18 : 20}
      backgroundColor={chrome.backgroundColor}
      borderColor={chrome.borderColor}
      borderWidth={variant === 'ghost' || variant === 'primary' ? 0 : 1}
      shadowColor={chrome.shadowColor}
      shadowOffset={{ width: 0, height: 10 }}
      shadowOpacity={variant === 'primary' ? 1 : 0}
      shadowRadius={variant === 'primary' ? 16 : 0}
      elevation={variant === 'primary' ? 6 : 0}
      pressStyle={{ opacity: 0.95 }}
      opacity={disabled || loading ? 0.6 : 1}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={animatedStyle}
      {...rest}
    >
      {loading ? (
        <KeepsyBookLoader size={compact ? 24 : 28} />
      ) : (
        <XStack width="100%" alignItems="center" justifyContent="center" gap="$2">
          {iconOnly ? (
            icon
          ) : (
            <>
              {icon != null ? (
                <XStack width={24} minHeight={20} justifyContent="center" alignItems="center">
                  {icon}
                </XStack>
              ) : null}
              <XStack flex={1} minWidth={0} justifyContent="center" alignItems="center">
                <Text color={chrome.textColor as any} fontSize="$4" fontWeight="700" letterSpacing={0.2} textAlign="center" lineHeight={18} numberOfLines={1}>
                  {title}
                </Text>
              </XStack>
              {iconAfter != null ? (
                <XStack width={24} minHeight={20} justifyContent="center" alignItems="center">
                  {iconAfter}
                </XStack>
              ) : null}
            </>
          )}
        </XStack>
      )}
    </AnimatedButton>
  );
}
