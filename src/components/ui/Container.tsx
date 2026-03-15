import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, ScrollView } from 'react-native';
import { useTheme } from '@/src/contexts/ThemeContext';

export interface ContainerProps {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
}

export function Container({ children, scroll = false, style }: ContainerProps) {
  const { theme } = useTheme();
  const { colors, spacing } = theme;

  const containerStyle = {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  };

  if (scroll) {
    return (
      <ScrollView
        style={[containerStyle, style]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
  }

  return <View style={[containerStyle, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
});
