import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/src/contexts/ThemeContext';

type NavFadeBarProps = {
  /** Which edge the bar sits on; gradient fades from transparent (content side) to translucent. */
  edge: 'top' | 'bottom';
  /** Extends the gradient past its host bounds for softer transitions. */
  bleed?: number;
};

/**
 * Nav bar background: gradient only (no blur), transparent at content edge to translucent
 * where buttons sit. Light, minimal overlay so icons and labels stay readable.
 */
export function NavFadeBar({ edge, bleed = 0 }: NavFadeBarProps) {
  const { colorScheme } = useTheme();
  const isTop = edge === 'top';
  const topColors = colorScheme === 'dark'
    ? ['rgba(11,16,48,0.98)', 'rgba(11,16,48,0.8)', 'rgba(11,16,48,0)']
    : ['rgba(247,244,255,0.96)', 'rgba(243,240,255,0.7)', 'rgba(247,244,255,0)'];
  const bottomColors = colorScheme === 'dark'
    ? ['rgba(11,16,48,0)', 'rgba(11,16,48,0.8)', 'rgba(11,16,48,0.98)']
    : ['rgba(247,244,255,0)', 'rgba(243,240,255,0.7)', 'rgba(247,244,255,0.96)'];

  const gradientFrame = isTop
    ? { top: 0, left: 0, right: 0, bottom: -bleed }
    : { top: -bleed, left: 0, right: 0, bottom: 0 };

  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          gradientFrame,
          { backgroundColor: colorScheme === 'dark' ? 'rgba(11, 16, 48, 0.88)' : 'rgba(247, 244, 255, 0.82)' },
        ]}
        pointerEvents="none"
      />
    );
  }

  return (
    <LinearGradient
      colors={isTop ? topColors : bottomColors}
      locations={[0, 0.45, 1]}
      style={gradientFrame}
      pointerEvents="none"
    />
  );
}
