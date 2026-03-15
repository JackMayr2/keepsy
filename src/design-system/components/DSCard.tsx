import React from 'react';
import { Card, CardProps } from 'tamagui';

export interface DSCardProps extends CardProps {
  onPress?: () => void;
}

export function DSCard({ onPress, children, ...rest }: DSCardProps) {
  return (
    <Card
      size="$4"
      borderRadius="$4"
      padding="$4"
      backgroundColor="$background"
      borderWidth={1}
      borderColor="$borderColor"
      pressStyle={{ opacity: 0.98 }}
      onPress={onPress}
      {...rest}
    >
      {children}
    </Card>
  );
}
