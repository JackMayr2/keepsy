import React from 'react';
import { XStack, Text } from 'tamagui';
import { useHaptic } from '../hooks/useHaptic';

export interface ListRowProps {
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
}

export function ListRow({ label, value, onPress, showChevron = true }: ListRowProps) {
  const haptic = useHaptic();
  const handlePress = () => {
    if (onPress) {
      haptic.light();
      onPress();
    }
  };

  return (
    <XStack
      justifyContent="space-between"
      alignItems="center"
      paddingVertical="$3"
      paddingHorizontal="$4"
      onPress={onPress ? handlePress : undefined}
      pressStyle={onPress ? { opacity: 0.7 } : undefined}
    >
      <Text flex={1} fontSize="$4" numberOfLines={1}>
        {label}
      </Text>
      {value != null && value !== '' ? (
        <Text flex={1} fontSize="$4" color="$colorFocus" numberOfLines={1} textAlign="right" marginLeft="$2">
          {value}
        </Text>
      ) : null}
      {showChevron && onPress ? (
        <Text marginLeft="$2" color="$colorHover" fontSize="$2">
          ›
        </Text>
      ) : null}
    </XStack>
  );
}
