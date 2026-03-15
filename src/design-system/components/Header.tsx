import React from 'react';
import { XStack, Text } from 'tamagui';

type HeaderProps = {
  title: string;
  right?: React.ReactNode;
};

export function Header({ title, right }: HeaderProps) {
  return (
    <XStack justifyContent="space-between" alignItems="center" marginBottom="$4" flexWrap="wrap" gap="$3">
      <Text fontSize="$7" fontWeight="700" letterSpacing={-0.5}>
        {title}
      </Text>
      {right}
    </XStack>
  );
}
