import React from 'react';
import { View } from 'react-native';

export type MapProfileMarkerProps = {
  coordinate: { latitude: number; longitude: number };
  photoURL?: string | null;
  initials: string;
  title?: string;
  description?: string;
  onPress?: () => void;
  variant?: 'trip' | 'home';
};

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0] ?? '';
    const b = parts[parts.length - 1][0] ?? '';
    return (a + b).toUpperCase() || '?';
  }
  return (name.trim().slice(0, 2) || '?').toUpperCase();
}

/** Web fallback: map markers are not rendered on web map placeholder view. */
export function MapProfileMarker(_props: MapProfileMarkerProps) {
  return <View />;
}
