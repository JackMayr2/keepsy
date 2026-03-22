import React, { useEffect } from 'react';
import { StyleSheet, View, Image, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { KEEPSY_LOGO_IMAGE } from '../keepsyLogoAsset';

type KeepsyBookLoaderProps = {
  /** Square edge length for the logo + animation. */
  size?: number;
  style?: ViewStyle;
};

/**
 * Page-turn loading animation using the official Keepsy book logo.
 * Right half of the artwork flips on the vertical spine (center) in a loop.
 */
export function KeepsyBookLoader({ size = 56, style }: KeepsyBookLoaderProps) {
  const flip = useSharedValue(0);
  const pageHalf = size / 2;

  useEffect(() => {
    const pageDuration = 520;
    const pauseOpen = 220;
    const easing = Easing.bezier(0.45, 0.02, 0.2, 1);

    flip.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(1, { duration: pageDuration, easing }),
        withTiming(1, { duration: pauseOpen }),
        withTiming(0, { duration: 0 })
      ),
      -1,
      false
    );
  }, [flip]);

  const flipStyle = useAnimatedStyle(() => {
    const deg = interpolate(flip.value, [0, 1], [0, -178]);
    return {
      transform: [
        { perspective: 900 },
        { translateX: pageHalf / 2 },
        { rotateY: `${deg}deg` },
        { translateX: -pageHalf / 2 },
      ],
    };
  });

  const corner = Math.max(6, Math.round(size * 0.18));

  return (
    <View
      style={[styles.wrap, { width: size, height: size }, style]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      accessibilityState={{ busy: true }}
    >
      <View style={[styles.outerClip, { width: size, height: size, borderRadius: corner }]}>
        <View style={[styles.inner, { width: size, height: size }]}>
        <Image
          source={KEEPSY_LOGO_IMAGE}
          style={[styles.baseImage, { width: size, height: size }]}
          resizeMode="contain"
        />
        {/* Right page: clipped half, same image aligned to base; flips around spine at center */}
        <View style={[styles.flipClip, { left: pageHalf, width: pageHalf, height: size }]} pointerEvents="none">
          <Animated.View
            style={[
              {
                width: pageHalf,
                height: size,
                overflow: 'hidden',
                backfaceVisibility: 'hidden',
              },
              flipStyle,
            ]}
          >
            <Image
              source={KEEPSY_LOGO_IMAGE}
              style={[styles.flapImage, { width: size, height: size, left: -pageHalf }]}
              resizeMode="contain"
            />
          </Animated.View>
        </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerClip: {
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  inner: {
    position: 'relative',
    overflow: 'visible',
    backgroundColor: '#000000',
  },
  baseImage: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  flapImage: {
    position: 'absolute',
    top: 0,
  },
  flipClip: {
    position: 'absolute',
    top: 0,
    zIndex: 2,
    overflow: 'visible',
  },
});
