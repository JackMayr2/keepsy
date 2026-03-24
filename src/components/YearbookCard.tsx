import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, Pressable, Platform, Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/contexts/ThemeContext';
import { DSIcon, DSText } from '@/src/design-system';
import type { YearbookWithRole } from '@/src/types/yearbook.types';
import type { YearbookMemberPreview } from '@/src/hooks/useYearbookMemberPreviews';
import type { YearbookCollagePhotos } from '@/src/services/firestore';

type YearbookCardProps = {
  yearbook: YearbookWithRole;
  /** Carousel item width (required for horizontal layout). */
  width: number;
  memberPreview?: YearbookMemberPreview;
  /** Polaroid collage on cover + total memory count for “+N memories”. */
  collage?: YearbookCollagePhotos;
};

const CARD_RADIUS = 24;
/** Cover height vs width — slightly shorter than before for a lighter card. */
const COVER_ASPECT = 0.94;
const CONTENT_PADDING_X = 14;
const CONTENT_PADDING_TOP = 8;
const CONTENT_PADDING_BOTTOM = 10;
const AVATAR = 32;
const AVATAR_OVERLAP = 10;
/** Mini polaroid footprint (white frame + caption strip). */
const POLAROID_W = 26;
const POLAROID_H = 30;
const POLAROID_PAD_TOP = 2;
const POLAROID_PAD_H = 2;
const POLAROID_CAPTION = 6;
const COLLAGE_GAP = 4;

const TITLE_BLOCK_MIN = 40;
const DESC_BLOCK_MIN = 22;

export function YearbookCard({ yearbook, width, memberPreview, collage }: YearbookCardProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const initial = yearbook.name.charAt(0).toUpperCase();
  const scale = useSharedValue(1);
  const [coverError, setCoverError] = useState(false);
  const coverHeight = Math.round(width * COVER_ASPECT);
  const isCreator = yearbook.role === 'creator';

  useEffect(() => {
    setCoverError(false);
  }, [yearbook.id, yearbook.aiVisualUrl]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    router.push({ pathname: '/yearbook/[id]', params: { id: yearbook.id } });
  };

  const handleShare = () => {
    Share.share({
      message: `Join "${yearbook.name}" on Keepsy! Use code: ${yearbook.inviteCode}`,
      title: 'Join my yearbook',
    });
  };

  const photos = (memberPreview?.photoURLs ?? []).slice(0, 5);
  const total = memberPreview?.total ?? 0;
  const extra = total > 5 ? total - 5 : 0;

  const collageUrls = collage?.urls ?? [];
  const collageSlots: (string | null)[] = [...collageUrls.slice(0, 4)];
  while (collageSlots.length < 4) collageSlots.push(null);
  const hasCollage = collageSlots.some(Boolean);
  const totalMemories = collage?.totalMemories ?? 0;
  const extraMemories = totalMemories > 4 ? totalMemories - 4 : 0;
  const collageGridW = POLAROID_W * 2 + COLLAGE_GAP;
  const collageGridH = POLAROID_H * 2 + COLLAGE_GAP;

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => {
        scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1);
      }}
      style={({ pressed }) => [styles.card, { width }, pressed && styles.pressed]}
    >
      <Animated.View style={animatedStyle}>
        <View
          style={[
            styles.cardInner,
            {
              backgroundColor: theme.colors.surface,
              borderColor: isCreator ? theme.colors.sun : 'transparent',
              shadowColor: isCreator ? theme.colors.sun : '#5D5AF6',
            },
            isCreator && styles.creatorCard,
          ]}
        >
          <View style={[styles.visualContainer, { height: coverHeight, borderTopLeftRadius: CARD_RADIUS, borderTopRightRadius: CARD_RADIUS }]}>
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
              colors={['rgba(22,20,46,0.02)', 'rgba(22,20,46,0.55)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.visualShade}
            />
            {total > 0 ? (
              <View style={styles.avatarRowWrap} pointerEvents="none">
                <View style={styles.avatarRow}>
                  {photos.map((url, i) => (
                    <View
                      key={i}
                      style={[
                        styles.avatarSlot,
                        {
                          marginLeft: i === 0 ? 0 : -AVATAR_OVERLAP,
                          zIndex: photos.length - i,
                          borderColor: theme.colors.surface,
                        },
                      ]}
                    >
                      {url ? (
                        <Image source={{ uri: url }} style={styles.avatarImg} />
                      ) : (
                        <View style={[styles.avatarImg, styles.avatarFallback, { backgroundColor: theme.colors.borderMuted }]}>
                          <DSText variant="caption" color="secondary">
                            ?
                          </DSText>
                        </View>
                      )}
                    </View>
                  ))}
                  {extra > 0 ? (
                    <View
                      style={[
                        styles.avatarSlot,
                        styles.plusMore,
                        {
                          marginLeft: photos.length ? -AVATAR_OVERLAP : 0,
                          backgroundColor: theme.colors.primary,
                          borderColor: theme.colors.surface,
                          zIndex: 0,
                        },
                      ]}
                    >
                      <DSText variant="caption" style={styles.plusMoreText}>
                        +{extra}
                      </DSText>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}
            {hasCollage ? (
              <View style={[styles.collageOverlay, { alignItems: 'flex-end' }]} pointerEvents="none">
                <View style={[styles.collageGridBlock, { width: collageGridW, height: collageGridH }]}>
                  <View style={styles.collageRow}>
                    {[0, 1].map((i) => (
                      <View key={`c-${i}`} style={[styles.polaroidShadowWrap, { width: POLAROID_W, height: POLAROID_H }]}>
                        <View style={styles.polaroidInner}>
                          <View
                            style={[
                              styles.polaroidTop,
                              { paddingTop: POLAROID_PAD_TOP, paddingHorizontal: POLAROID_PAD_H },
                            ]}
                          >
                            <View style={[styles.polaroidPhotoWell, { backgroundColor: theme.colors.borderMuted }]}>
                              {collageSlots[i] ? (
                                <Image source={{ uri: collageSlots[i]! }} style={styles.polaroidImg} resizeMode="cover" />
                              ) : null}
                            </View>
                          </View>
                          <View style={[styles.polaroidCaptionStrip, { height: POLAROID_CAPTION }]} />
                        </View>
                      </View>
                    ))}
                  </View>
                  <View style={styles.collageRow}>
                    {[2, 3].map((i) => (
                      <View key={`c-${i}`} style={[styles.polaroidShadowWrap, { width: POLAROID_W, height: POLAROID_H }]}>
                        <View style={styles.polaroidInner}>
                          <View
                            style={[
                              styles.polaroidTop,
                              { paddingTop: POLAROID_PAD_TOP, paddingHorizontal: POLAROID_PAD_H },
                            ]}
                          >
                            <View style={[styles.polaroidPhotoWell, { backgroundColor: theme.colors.borderMuted }]}>
                              {collageSlots[i] ? (
                                <Image source={{ uri: collageSlots[i]! }} style={styles.polaroidImg} resizeMode="cover" />
                              ) : null}
                            </View>
                          </View>
                          <View style={[styles.polaroidCaptionStrip, { height: POLAROID_CAPTION }]} />
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
                {extraMemories > 0 ? (
                  <DSText variant="caption" style={styles.collageMoreLabel} numberOfLines={1}>
                    +{extraMemories} {extraMemories === 1 ? 'memory' : 'memories'}
                  </DSText>
                ) : null}
              </View>
            ) : null}
          </View>
          <View style={styles.content}>
            <View style={[styles.titleBlock, { minHeight: TITLE_BLOCK_MIN }]}>
              <DSText variant="title" numberOfLines={2}>
                {yearbook.name}
              </DSText>
            </View>
            <View style={[styles.descBlock, { minHeight: DESC_BLOCK_MIN }]}>
              <DSText variant="bodySmall" color="secondary" numberOfLines={1} style={styles.desc}>
                {yearbook.description?.trim() ? yearbook.description : ' '}
              </DSText>
            </View>
            <View style={styles.footerRow}>
              <View style={styles.footerMeta}>
                {yearbook.dueDate ? (
                  <DSText variant="caption" color="muted" numberOfLines={1} style={styles.dueDate}>
                    Due {yearbook.dueDate}
                  </DSText>
                ) : null}
              </View>
              <Pressable
                style={[styles.shareAction, { backgroundColor: theme.colors.surfaceSecondary }]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleShare();
                }}
                hitSlop={8}
                accessibilityLabel="Share invite"
              >
                <DSIcon
                  name={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }}
                  size={15}
                  color={theme.colors.text}
                />
                <DSText variant="caption" style={[styles.shareActionLabel, { color: theme.colors.text }]}>
                  Share
                </DSText>
              </Pressable>
            </View>
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
    borderWidth: 0,
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
  creatorCard: {
    borderWidth: 1.5,
  },
  visualContainer: {
    position: 'relative',
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
  avatarRowWrap: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    right: 12,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  collageOverlay: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    gap: 4,
  },
  collageGridBlock: {
    flexDirection: 'column',
    gap: COLLAGE_GAP,
  },
  collageMoreLabel: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 0.5 },
    textShadowRadius: 3,
  },
  collageRow: {
    flexDirection: 'row',
    gap: COLLAGE_GAP,
  },
  polaroidShadowWrap: {
    borderRadius: 2,
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1.5 },
        shadowOpacity: 0.32,
        shadowRadius: 2.5,
      },
      android: { elevation: 4 },
    }),
  },
  polaroidInner: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#FAFAFA',
    borderRadius: 2,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  polaroidTop: {
    flex: 1,
    minHeight: 0,
  },
  polaroidPhotoWell: {
    flex: 1,
    minHeight: 0,
    borderRadius: 1,
    overflow: 'hidden',
  },
  polaroidImg: {
    width: '100%',
    height: '100%',
  },
  polaroidCaptionStrip: {
    backgroundColor: '#FAFAFA',
    flexShrink: 0,
  },
  avatarSlot: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusMore: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusMoreText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  content: {
    paddingTop: CONTENT_PADDING_TOP,
    paddingBottom: CONTENT_PADDING_BOTTOM,
    paddingHorizontal: CONTENT_PADDING_X,
    borderBottomLeftRadius: CARD_RADIUS,
    borderBottomRightRadius: CARD_RADIUS,
  },
  titleBlock: {
    justifyContent: 'center',
  },
  descBlock: {
    marginTop: 2,
    justifyContent: 'center',
  },
  desc: {},
  footerRow: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  footerMeta: {
    flex: 1,
    minHeight: 18,
    justifyContent: 'center',
  },
  dueDate: {
    flex: 1,
  },
  shareAction: {
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shareActionLabel: {
    fontWeight: '700',
  },
});
