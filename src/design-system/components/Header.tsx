import React from 'react';
import { XStack, YStack, Text } from 'tamagui';

type HeaderProps = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
};

export function Header({ title, subtitle, right }: HeaderProps) {
  return (
    <YStack marginBottom="$6" gap="$3">
      <Text fontSize="$9" fontWeight="800" letterSpacing={-1.1} lineHeight={36}>
        {title}
      </Text>
      {subtitle || right ? (
        <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap="$3">
          {subtitle ? (
            <Text flex={1} minWidth={220} fontSize="$3" color="$colorHover" lineHeight={20}>
              {subtitle}
            </Text>
          ) : (
            <YStack flex={1} />
          )}
          {right ? (
            <XStack flexWrap="wrap" justifyContent="flex-end" alignItems="center" gap="$2" maxWidth="100%">
              {right}
            </XStack>
          ) : null}
        </XStack>
      ) : null}
    </YStack>
  );
}
