import React from 'react';
import { Input as TamaguiInput, InputProps, YStack } from 'tamagui';
import { DSText } from './DSText';

export interface DSInputProps extends InputProps {
  label?: string;
  error?: string;
}

export function DSInput({ label, error, ...rest }: DSInputProps) {
  return (
    <YStack width="100%" gap="$2">
      {label ? (
        <DSText variant="label" color="secondary">
          {label}
        </DSText>
      ) : null}
      <TamaguiInput
        size="$4"
        borderRadius="$3"
        borderWidth={1.5}
        backgroundColor="$background"
        borderColor={error ? '$red10' : '$borderColor'}
        placeholderTextColor="$colorHover"
        {...rest}
      />
      {error ? (
        <DSText variant="caption" color="muted" style={{ color: 'var(--red10)' }}>
          {error}
        </DSText>
      ) : null}
    </YStack>
  );
}
