import React from 'react';
import { YStack, YStackProps } from 'tamagui';
import { DSText } from './DSText';
import { DSButton } from './DSButton';

export interface EmptyStateProps extends YStackProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  ...rest
}: EmptyStateProps) {
  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      paddingVertical="$10"
      paddingHorizontal="$4"
      gap="$5"
      minHeight={280}
      {...rest}
    >
      <YStack alignItems="center" gap="$3" maxWidth={320}>
        <DSText variant="title" textAlign="center">
          {title}
        </DSText>
        {description ? (
          <DSText variant="body" color="secondary" textAlign="center" lineHeight={22}>
            {description}
          </DSText>
        ) : null}
      </YStack>
      <YStack gap="$3" alignSelf="stretch" alignItems="center">
        {actionLabel && onAction ? (
          <DSButton title={actionLabel} onPress={onAction} />
        ) : null}
        {secondaryActionLabel && onSecondaryAction ? (
          <DSButton title={secondaryActionLabel} onPress={onSecondaryAction} variant="outline" />
        ) : null}
      </YStack>
    </YStack>
  );
}
