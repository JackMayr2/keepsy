import React, { type ReactNode } from 'react';
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
  /** Renders inside the field on the left (e.g. platform icon). */
  leftIcon?: ReactNode;
}

export function Input({
  label,
  error,
  containerStyle,
  style,
  leftIcon,
  ...props
}: InputProps) {
  const { theme } = useTheme();
  const { colors, spacing, radii } = theme;

  return (
    <View style={[styles.container, containerStyle]} collapsable={false}>
      {label ? (
        <Text variant="label" color="secondary" style={[styles.label, { marginBottom: theme.spacing.xs }]}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.inputShell,
          {
            backgroundColor: colors.surfaceGlass,
            borderColor: error ? colors.error : colors.border,
            borderRadius: radii.lg,
            borderWidth: 1.5,
            minHeight: 56,
          },
        ]}
      >
        {leftIcon ? (
          <View style={[styles.leftIconWrap, { paddingLeft: spacing.md }]}>{leftIcon}</View>
        ) : null}
        <TextInput
          style={[
            styles.input,
            {
              flex: 1,
              paddingVertical: spacing.sm + 6,
              paddingRight: spacing.md,
              paddingLeft: leftIcon ? spacing.sm : spacing.md,
              fontSize: theme.typography.fontSize.base,
              color: colors.text,
              textAlignVertical: 'center',
              includeFontPadding: false,
            },
            style,
          ]}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          {...props}
        />
      </View>
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
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftIconWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {},
  error: {},
});
