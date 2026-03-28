import React from 'react';
import { Input as TamaguiInput, InputProps, YStack } from 'tamagui';
import { DSText } from './DSText';
import { useTheme } from '@/src/contexts/ThemeContext';

export interface DSInputProps extends InputProps {
  label?: string;
  error?: string;
}

export function DSInput({ label, error, ...rest }: DSInputProps) {
  const { theme } = useTheme();

  return (
    <YStack width="100%" gap="$2">
      {label ? (
        <DSText variant="label" color="secondary">
          {label}
        </DSText>
      ) : null}
      <TamaguiInput
        size="$4"
        minHeight={56}
        paddingHorizontal="$4"
        paddingVertical="$3"
        borderRadius={theme.radii.lg}
        borderWidth={1.5}
        backgroundColor={theme.colors.surfaceGlass}
        borderColor={error ? theme.colors.error : theme.colors.border}
        color={theme.colors.text as any}
        placeholderTextColor={theme.colors.textMuted as any}
        selectionColor={theme.colors.primary as any}
        fontSize={16}
        textAlignVertical="center"
        focusStyle={{
          borderColor: theme.colors.primary,
          backgroundColor: theme.colors.surface,
        }}
        {...rest}
      />
      {error ? (
        <DSText variant="caption" style={{ color: theme.colors.error }}>
          {error}
        </DSText>
      ) : null}
    </YStack>
  );
}
