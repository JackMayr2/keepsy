import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/src/contexts/ThemeContext';
import { DSIcon } from './DSIcon';
import { NavIconButton } from './NavIconButton';

type AppBackButtonProps = {
  onPress: () => void;
  accessibilityLabel?: string;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
};

export function AppBackButton({
  onPress,
  accessibilityLabel = 'Go back',
  iconSize = 20,
  style,
}: AppBackButtonProps) {
  const { theme } = useTheme();

  return (
    <NavIconButton
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={style}
      icon={
        <DSIcon
          name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
          size={iconSize}
          color={theme.colors.text}
        />
      }
    />
  );
}
