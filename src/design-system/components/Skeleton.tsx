import React, { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { YStack, YStackProps } from 'tamagui';

type SkeletonProps = YStackProps & {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
};

export function Skeleton({ width = '100%', height = 20, borderRadius = 8, ...rest }: SkeletonProps) {
  const opacity = useSharedValue(0.4);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.7, { duration: 800 }), -1, true);
  }, []);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={[{ width, height, borderRadius, backgroundColor: '#D6D3D1' }, animatedStyle]} />
  );
}

export function SkeletonBlock({ lines = 3, ...rest }: YStackProps & { lines?: number }) {
  return (
    <YStack gap="$2" {...rest}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={16}
          width={i === lines - 1 && lines > 1 ? '75%' : '100%'}
          borderRadius={6}
        />
      ))}
    </YStack>
  );
}
