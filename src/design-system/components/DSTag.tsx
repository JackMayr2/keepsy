import React from 'react';
import { XStack, Text } from 'tamagui';

export interface DSTagProps {
  label: string;
  onPress?: () => void;
}

export function DSTag({ label, onPress }: DSTagProps) {
  return (
    <XStack
      paddingHorizontal="$3"
      paddingVertical="$1.5"
      borderRadius={9999}
      backgroundColor="$backgroundHover"
      alignSelf="flex-start"
      onPress={onPress}
      pressStyle={{ opacity: 0.9 }}
    >
      <Text fontSize="$2" color="$color" fontWeight="500">
        {label}
      </Text>
    </XStack>
  );
}
