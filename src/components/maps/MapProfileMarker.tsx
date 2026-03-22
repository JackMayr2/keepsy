import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import { Marker } from 'react-native-maps';
import { Text } from '@/src/components/ui/Text';

const AVATAR = 44;
const RING = 2;

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0] ?? '';
    const b = parts[parts.length - 1][0] ?? '';
    return (a + b).toUpperCase() || '?';
  }
  return (name.trim().slice(0, 2) || '?').toUpperCase();
}

function MarkerBubble({
  photoURL,
  initials,
  accentColor,
}: {
  photoURL?: string | null;
  initials: string;
  /** Home pins use a green ring; trips use primary-ish */
  accentColor: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(photoURL) && !failed;

  return (
    <View style={styles.bubbleWrap}>
      <View style={[styles.outerRing, { borderColor: accentColor }]}>
        {showImage ? (
          <Image
            source={{ uri: photoURL as string }}
            style={styles.image}
            onError={() => setFailed(true)}
          />
        ) : (
          <View style={[styles.fallback, { backgroundColor: accentColor }]}>
            <Text variant="label" style={styles.initialsText}>
              {initials.slice(0, 2)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export type MapProfileMarkerProps = {
  coordinate: { latitude: number; longitude: number };
  photoURL?: string | null;
  initials: string;
  title?: string;
  description?: string;
  onPress?: () => void;
  /** 'trip' | 'home' — home uses green ring */
  variant?: 'trip' | 'home';
};

/**
 * Map marker: profile photo in a ring, anchored at bottom center (pin point).
 */
export function MapProfileMarker({
  coordinate,
  photoURL,
  initials,
  title,
  description,
  onPress,
  variant = 'trip',
}: MapProfileMarkerProps) {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const accent = variant === 'home' ? '#22C55E' : '#7C6BB5';

  useEffect(() => {
    const t = setTimeout(() => setTracksViewChanges(false), Platform.OS === 'android' ? 800 : 600);
    return () => clearTimeout(t);
  }, [photoURL]);

  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 1 }}
      centerOffset={{ x: 0, y: 0 }}
      title={title}
      description={description}
      onPress={onPress}
      tracksViewChanges={tracksViewChanges}
    >
      <MarkerBubble photoURL={photoURL} initials={initials} accentColor={accent} />
    </Marker>
  );
}

const styles = StyleSheet.create({
  bubbleWrap: {
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 3,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  outerRing: {
    width: AVATAR + RING * 2,
    height: AVATAR + RING * 2,
    borderRadius: (AVATAR + RING * 2) / 2,
    borderWidth: RING,
    backgroundColor: '#fff',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
  },
  fallback: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
});
