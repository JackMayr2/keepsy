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
        minHeight={56}
        paddingHorizontal="$4"
        paddingVertical="$3"
        borderRadius={18}
        borderWidth={1.5}
        backgroundColor="rgba(255,255,255,0.68)"
        borderColor={error ? '$red10' : 'rgba(102, 92, 165, 0.22)'}
        placeholderTextColor="$placeholderColor"
        fontSize={16}
        textAlignVertical="center"
        {...rest}
      />
      {error ? (
        <DSText variant="caption" style={{ color: 'var(--red10)' }}>
          {error}
        </DSText>
      ) : null}
    </YStack>
  );
}
