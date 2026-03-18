import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/src/contexts/ThemeContext';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Card({ children, onPress, style }: CardProps) {
  const { theme } = useTheme();
  const { colors, spacing, radii, shadows } = theme;

  const cardStyle = {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: 'hidden' as const,
    ...shadows.md,
  };

  const content = (
    <LinearGradient
      colors={[colors.surface, colors.surfaceSecondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.fill, { padding: spacing.lg }]}
    >
      {children}
    </LinearGradient>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          cardStyle,
          { opacity: pressed ? 0.95 : 1 },
          style,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={[cardStyle, style]}>{content}</View>;
}

const styles = StyleSheet.create({
  fill: {
    width: '100%',
    height: '100%',
  },
});
