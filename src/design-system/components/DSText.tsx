import React from 'react';
import { Text as TamaguiText, TextProps } from 'tamagui';

export type DSTextVariant = 'titleLarge' | 'title' | 'body' | 'bodySmall' | 'caption' | 'label';

const variantToSize: Record<DSTextVariant, string> = {
  titleLarge: '$7',
  title: '$6',
  body: '$4',
  bodySmall: '$3',
  caption: '$2',
  label: '$3',
};

const variantToWeight: Record<DSTextVariant, string> = {
  titleLarge: '700',
  title: '600',
  body: '400',
  bodySmall: '400',
  caption: '400',
  label: '500',
};

export interface DSTextProps extends TextProps {
  variant?: DSTextVariant;
  color?: 'default' | 'secondary' | 'muted';
}

const colorMap = {
  default: '$color',
  secondary: '$colorFocus',
  muted: '$colorHover',
};

export function DSText({
  variant = 'body',
  color = 'default',
  children,
  ...rest
}: DSTextProps) {
  return (
    <TamaguiText
      fontSize={variantToSize[variant]}
      fontWeight={variantToWeight[variant]}
      color={colorMap[color]}
      letterSpacing={variant === 'titleLarge' ? -0.9 : variant === 'title' ? -0.4 : 0}
      lineHeight={
        variant === 'titleLarge'
          ? 36
          : variant === 'title'
            ? 28
            : variant === 'body'
              ? 24
              : variant === 'bodySmall'
                ? 20
                : variant === 'caption'
                  ? 16
                  : 18
      }
      {...rest}
    >
      {children}
    </TamaguiText>
  );
}
