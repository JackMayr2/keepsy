import React from 'react';
import { Card, CardProps } from 'tamagui';

export interface DSCardProps extends CardProps {
  onPress?: () => void;
  elevated?: boolean;
}

export function DSCard({ onPress, children, elevated = true, ...rest }: DSCardProps) {
  return (
    <Card
      size="$4"
      borderRadius={24}
      padding="$5"
      backgroundColor="rgba(255,255,255,0.74)"
      borderWidth={1}
      borderColor="rgba(102, 92, 165, 0.18)"
      shadowColor="rgba(93, 90, 246, 0.12)"
      shadowOffset={{ width: 0, height: 6 }}
      shadowOpacity={elevated ? 1 : 0}
      shadowRadius={elevated ? 20 : 0}
      elevation={elevated ? 6 : 0}
      pressStyle={{ opacity: 0.98, scale: 0.995 }}
      animation="quick"
      onPress={onPress}
      {...rest}
    >
      {children}
    </Card>
  );
}
