import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View, type ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';

const BOOK_ANIMATION = require('../../../assets/lottie/book-with-turning-pages.json');

export type KeepsyBookLoaderProps = {
  size?: number;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

/**
 * App loading indicator: Lottie “book with turning pages” (`assets/lottie/book-with-turning-pages.json`).
 * Uses original asset colors (no tint). No visible caption — use `accessibilityLabel` for VoiceOver.
 */
export function KeepsyBookLoader({
  size = 48,
  style,
  accessibilityLabel = 'Loading',
}: KeepsyBookLoaderProps) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => {
      if (!cancelled) setReduceMotion(!!v);
    });
    const sub = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      (enabled: boolean) => setReduceMotion(!!enabled),
    );
    return () => {
      cancelled = true;
      sub?.remove?.();
    };
  }, []);

  return (
    <View
      style={[styles.wrap, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: true }}
    >
      <LottieView
        key={reduceMotion ? 'static' : 'anim'}
        source={BOOK_ANIMATION}
        style={{ width: size, height: size }}
        autoPlay={!reduceMotion}
        loop={!reduceMotion}
        {...(reduceMotion ? { progress: 0.18 } : {})}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
