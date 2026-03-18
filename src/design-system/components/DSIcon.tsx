import React from 'react';
import { Platform } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { MaterialIcons } from '@expo/vector-icons';

export type DSIconName =
  | string
  | {
      ios: string;
      android?: string;
      web?: string;
    };

type DSIconProps = {
  name: DSIconName;
  size?: number;
  color?: string;
};

export function DSIcon({ name, size = 18, color = '#16142E' }: DSIconProps) {
  const resolvedName =
    typeof name === 'string'
      ? { ios: name, android: name, web: name }
      : {
          ios: name.ios,
          android: name.android ?? name.ios,
          web: name.web ?? name.ios,
        };

  // SymbolView only renders on iOS; on Android/web it returns nothing without a fallback.
  // Use MaterialIcons on Android and web so icons always show.
  if (Platform.OS !== 'ios') {
    const iconName = Platform.OS === 'web'
      ? (resolvedName.web ?? resolvedName.android ?? resolvedName.ios)
      : (resolvedName.android ?? resolvedName.ios);
    return <MaterialIcons name={iconName as any} size={size} color={color} />;
  }

  return <SymbolView name={resolvedName.ios as any} size={size} tintColor={color} />;
}
