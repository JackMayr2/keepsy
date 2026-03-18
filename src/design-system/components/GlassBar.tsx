import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { BlurView } from 'expo-blur';

type GlassBarProps = {
  /** Blur intensity 1–100. Softer = more fade into background. */
  intensity?: number;
  /** 'light' | 'dark' | 'default' | 'extraLight' | etc. */
  tint?: 'light' | 'dark' | 'default' | 'extraLight' | 'regular' | 'prominent';
  /** Use system material for more “liquid glass” on iOS */
  useSystemMaterial?: boolean;
};

/**
 * Translucent bar that blurs content behind it (iOS native blur; Android gets semi-transparent).
 * Use for tab bar and header backgrounds so they “fade into” the screen.
 * On iOS, useSystemMaterial uses systemThinMaterialLight (liquid-glass style).
 */
export function GlassBar({
  intensity = 45,
  tint = 'light',
  useSystemMaterial = false,
}: GlassBarProps) {
  const blurTint = useSystemMaterial && Platform.OS === 'ios' ? 'systemThinMaterialLight' : tint;

  if (Platform.OS === 'web') {
    return (
      <View
        style={[StyleSheet.absoluteFillObject, styles.fallback]}
        pointerEvents="none"
      />
    );
  }

  return (
    <BlurView
      intensity={intensity}
      tint={blurTint}
      style={StyleSheet.absoluteFillObject}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
});
