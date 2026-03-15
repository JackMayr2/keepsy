import React from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Button as TamaguiButton, Spinner } from 'tamagui';
import type { GetProps } from 'tamagui';
import { useHaptic } from '../hooks/useHaptic';

const AnimatedButton = Animated.createAnimatedComponent(TamaguiButton);

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

export interface DSButtonProps extends Omit<GetProps<typeof TamaguiButton>, 'theme' | 'variant'> {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
}

const variantToTheme: Record<ButtonVariant, 'blue' | 'gray'> = {
  primary: 'blue',
  secondary: 'gray',
  outline: 'blue',
  ghost: 'gray',
};

export function DSButton({
  title,
  variant = 'primary',
  loading = false,
  onPress,
  disabled,
  ...rest
}: DSButtonProps) {
  const haptic = useHaptic();
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

  const isChromeless = variant === 'ghost' || variant === 'outline';
  const isOutlined = variant === 'outline';

  return (
    <AnimatedButton
      size="$4"
      height={52}
      borderRadius={9999}
      theme={variantToTheme[variant] as any}
      chromeless={isChromeless}
      bordered={isOutlined}
      opacity={disabled || loading ? 0.6 : 1}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={animatedStyle}
      {...rest}
    >
      {loading ? (
        <Spinner size="small" color={variant === 'primary' ? 'white' : '$color'} />
      ) : (
        title
      )}
    </AnimatedButton>
  );
}
