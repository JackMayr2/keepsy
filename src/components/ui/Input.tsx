import React from 'react';
import {
  TextInput,
  View,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Text } from './Text';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  containerStyle,
  style,
  ...props
}: InputProps) {
  const { theme } = useTheme();
  const { colors, spacing, radii } = theme;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text variant="label" color="secondary" style={[styles.label, { marginBottom: theme.spacing.xs }]}>
          {label}
        </Text>
      ) : null}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.error : colors.border,
            borderRadius: radii.lg,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm + 4,
            fontSize: theme.typography.fontSize.base,
            color: colors.text,
            borderWidth: 1.5,
          },
          style,
        ]}
        placeholderTextColor={colors.textMuted}
        {...props}
      />
      {error ? (
        <Text variant="caption" style={[styles.error, { color: colors.error, marginTop: theme.spacing.xs }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {},
  input: {},
  error: {},
});
