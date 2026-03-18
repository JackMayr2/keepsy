import React from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/src/contexts/ThemeContext';

type NavIconButtonProps = {
  icon: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

export function NavIconButton({
  icon,
  onPress,
  accessibilityLabel,
  style,
}: NavIconButtonProps) {
  const { colorScheme, theme } = useTheme();
  const chrome = colorScheme === 'dark'
    ? {
        backgroundColor: 'rgba(20, 26, 61, 0.94)',
        borderColor: 'rgba(181, 175, 255, 0.16)',
        shadowColor: '#000000',
      }
    : {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderColor: 'rgba(102, 92, 165, 0.16)',
        shadowColor: theme.colors.primary,
      };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.shell,
        chrome,
        { opacity: pressed ? 0.88 : 1 },
        style,
      ]}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: 42,
    height: 42,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 8,
  },
});
