import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/contexts/ThemeContext';
import { DSText } from '@/src/design-system';
import type { YearbookWithRole } from '@/src/types/yearbook.types';

type YearbookCardProps = {
  yearbook: YearbookWithRole;
  onLeave?: () => void;
};

const CARD_RADIUS = 24;
const VISUAL_HEIGHT = 168;
const CONTENT_PADDING = 22;

export function YearbookCard({ yearbook, onLeave }: YearbookCardProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const initial = yearbook.name.charAt(0).toUpperCase();
  const scale = useSharedValue(1);
  const [coverError, setCoverError] = useState(false);

  useEffect(() => {
    setCoverError(false);
  }, [yearbook.id, yearbook.aiVisualUrl]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    router.push({ pathname: '/(app)/yearbook/[id]', params: { id: yearbook.id } });
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => { scale.value = withSpring(0.98, { damping: 15, stiffness: 400 }); }}
      onPressOut={() => { scale.value = withSpring(1); }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Animated.View style={animatedStyle}>
        <View style={styles.cardInner}>
      <View style={styles.visualContainer}>
        {yearbook.aiVisualUrl && !coverError ? (
          <Image
            source={{ uri: yearbook.aiVisualUrl }}
            style={styles.visual}
            resizeMode="cover"
            onError={() => setCoverError(true)}
          />
        ) : (
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.accent, theme.colors.highlight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.placeholder}
          >
            <DSText variant="titleLarge" style={styles.initial}>
              {initial}
            </DSText>
          </LinearGradient>
        )}
        <LinearGradient
          colors={['rgba(22,20,46,0.04)', 'rgba(22,20,46,0.42)']}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={styles.visualShade}
        />
      </View>
      <View style={[styles.content, { backgroundColor: theme.colors.surface }]}>
        <DSText variant="title" numberOfLines={1}>
          {yearbook.name}
        </DSText>
        {yearbook.description ? (
          <DSText variant="bodySmall" color="secondary" numberOfLines={2} style={styles.desc}>
            {yearbook.description}
          </DSText>
        ) : null}
        <View style={[styles.metaRow, { borderColor: theme.colors.glassBorder, backgroundColor: theme.colors.surfaceSecondary }]}>
          <DSText variant="caption" color="secondary">
            {yearbook.role}
          </DSText>
          <DSText variant="caption" color="muted">
            {yearbook.inviteCode}
          </DSText>
        </View>
        {yearbook.role !== 'creator' && onLeave ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onLeave();
            }}
            hitSlop={8}
            style={styles.leaveBtn}
          >
            <DSText variant="caption" style={{ color: theme.colors.primary }}>
              Leave yearbook
            </DSText>
          </Pressable>
        ) : null}
      </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: CARD_RADIUS,
  },
  pressed: { opacity: 0.98 },
  cardInner: {
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(102, 92, 165, 0.16)',
    ...Platform.select({
      ios: {
        shadowColor: '#5D5AF6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.14,
        shadowRadius: 20,
      },
      android: { elevation: 8 },
    }),
  },
  visualContainer: {
    height: VISUAL_HEIGHT,
    position: 'relative',
    borderTopLeftRadius: CARD_RADIUS,
    borderTopRightRadius: CARD_RADIUS,
    overflow: 'hidden',
  },
  visual: {
    width: '100%',
    height: '100%',
  },
  visualShade: {
    ...StyleSheet.absoluteFillObject,
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
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  content: {
    padding: CONTENT_PADDING,
    borderBottomLeftRadius: CARD_RADIUS,
    borderBottomRightRadius: CARD_RADIUS,
  },
  desc: { marginTop: 8 },
  metaRow: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  leaveBtn: { marginTop: 12 },
});
