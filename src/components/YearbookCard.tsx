import React from 'react';
import { View, StyleSheet, Image, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Text } from '@/src/components/ui';
import type { YearbookWithRole } from '@/src/types/yearbook.types';

type YearbookCardProps = {
  yearbook: YearbookWithRole;
  onLeave?: () => void;
};

export function YearbookCard({ yearbook, onLeave }: YearbookCardProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const initial = yearbook.name.charAt(0).toUpperCase();

  const handlePress = () => {
    router.push({ pathname: '/(app)/yearbook/[id]', params: { id: yearbook.id } });
  };

  return (
    <Pressable onPress={handlePress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.visualContainer}>
        {yearbook.aiVisualUrl ? (
          <Image source={{ uri: yearbook.aiVisualUrl }} style={styles.visual} resizeMode="cover" />
        ) : (
          <View style={[styles.placeholder, { backgroundColor: theme.colors.pastelLavender }]}>
            <Text variant="titleLarge" style={styles.initial}>
              {initial}
            </Text>
          </View>
        )}
        <View style={styles.overlay} />
      </View>
      <View style={[styles.content, { backgroundColor: theme.colors.surface }]}>
        <Text variant="title" numberOfLines={1}>
          {yearbook.name}
        </Text>
        {yearbook.description ? (
          <Text variant="bodySmall" color="secondary" numberOfLines={2} style={styles.desc}>
            {yearbook.description}
          </Text>
        ) : null}
        {yearbook.role !== 'creator' && onLeave ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onLeave();
            }}
            style={styles.leaveBtn}
          >
            <Text variant="caption" color="primary">
              Leave yearbook
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  pressed: { opacity: 0.98 },
  visualContainer: {
    height: 160,
    position: 'relative',
  },
  visual: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: '#fff',
    opacity: 0.95,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  content: {
    padding: 20,
  },
  desc: { marginTop: 6 },
  leaveBtn: { marginTop: 10 },
});
