import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useYearbooks } from '@/src/hooks/useYearbooks';
import { useYearbookMemberPreviews } from '@/src/hooks/useYearbookMemberPreviews';
import { useYearbookCollagePhotos } from '@/src/hooks/useYearbookCollagePhotos';
import { getUser } from '@/src/services/firestore';
import type { User } from '@/src/types/user.types';
import type { YearbookWithRole } from '@/src/types/yearbook.types';
import { sortYearbooksForHomeCarousel } from '@/src/utils/yearbookCarousel';
import {
  DSButton,
  DSIcon,
  DSText,
  EmptyState,
  DeferredFullscreenLoader,
} from '@/src/design-system';
import { YearbookCard } from '@/src/components/YearbookCard';
import { ScreenBackground } from '@/src/components/ui/ScreenBackground';
import { Text } from '@/src/components/ui';
import { Page } from '@/src/design-system';
import { KEEPSY_LINKS, mailtoSupport, mailtoThoughtsAndIdeas } from '@/src/config/keepsyLinks';
import { SocialPlatformIcon } from '@/src/components/ui/SocialPlatformIcon';

const GREETING_PHRASES = [
  'Hunting for future nostalgia? You’re in the right place.',
  'This is where the good memories get saved.',
  'Your crew, your moments — all in one place.',
  'Ready to bottle up this year?',
  'Yearbooks aren’t just for school anymore.',
];

const CARD_GAP = 14;
const H_PADDING = 24;
/** Space for floating profile + FAB */
const BOTTOM_FLOAT_RESERVE = 96;

type FeatureSlug = 'christmas-cards' | 'family-newsletter' | 'live-reactions' | 'print-exports';
type ConnectBubbleKey = 'instagram' | 'twitter' | 'ideas' | 'website' | 'help' | 'contact';
const CONNECT_BUBBLE_KEYS: ConnectBubbleKey[] = ['instagram', 'twitter', 'ideas', 'website', 'help', 'contact'];
const CONNECT_BUBBLE_SIZE = 58;
const CONNECT_WAVE_HEIGHT = 10;

function makeWaveOutputs(index: number, total: number, amplitude: number, samples = 121): number[] {
  const denom = Math.max(1, total - 1);
  const p = index / denom;
  const output: number[] = [];
  for (let i = 0; i < samples; i += 1) {
    const t = i / (samples - 1);
    // Continuous synchronized wave with fixed cycle timing.
    const y = Math.sin((t * Math.PI * 2) - (p * Math.PI * 2)) * amplitude;
    output.push(y);
  }
  return output;
}

export default function HomeScreen() {
  const { userId, pendingJoinCode } = useAuth();
  const { theme, colorScheme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { yearbooks, loading, error, refresh } = useYearbooks(userId);

  const [me, setMe] = useState<User | null>(null);
  const phraseIndex = useMemo(() => Math.floor(Math.random() * GREETING_PHRASES.length), [userId]);
  const [fabOpen, setFabOpen] = useState(false);
  const fabExpand = useRef(new Animated.Value(0)).current;
  const bubbleWave = useRef(new Animated.Value(0)).current;

  const sortedYearbooks = useMemo(() => sortYearbooksForHomeCarousel(yearbooks), [yearbooks]);
  const previewIds = useMemo(() => sortedYearbooks.map((y) => y.id), [sortedYearbooks]);
  const memberPreviews = useYearbookMemberPreviews(previewIds);
  const collageById = useYearbookCollagePhotos(previewIds);

  const cardWidth = Math.min(windowWidth * 0.9, 420);
  const sidePad = (windowWidth - cardWidth) / 2;

  useEffect(() => {
    if (pendingJoinCode) {
      router.replace({ pathname: '/(app)/yearbook/join', params: { code: pendingJoinCode } });
    }
  }, [pendingJoinCode, router]);

  useEffect(() => {
    if (!userId) {
      setMe(null);
      return;
    }
    getUser(userId).then(setMe);
  }, [userId]);

  useEffect(() => {
    Animated.timing(fabExpand, {
      toValue: fabOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fabOpen, fabExpand]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(bubbleWave, {
        toValue: 1,
        duration: 7600,
        easing: Easing.linear,
        isInteraction: false,
        useNativeDriver: true,
      })
    );
    bubbleWave.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [bubbleWave]);

  const firstName = me?.firstName?.trim() || 'there';
  const greeting = GREETING_PHRASES[phraseIndex % GREETING_PHRASES.length];

  const openIdea = (slug: FeatureSlug) => {
    router.push({ pathname: '/(app)/ideas/[slug]', params: { slug } });
  };

  const openExternal = (url: string, failMessage: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Could not open link', failMessage);
    });
  };

  const connectBubbles: Array<{ key: ConnectBubbleKey; onPress: () => void }> = [
    { key: 'instagram', onPress: () => openExternal(KEEPSY_LINKS.instagram, 'Could not open Instagram.') },
    { key: 'twitter', onPress: () => openExternal(KEEPSY_LINKS.twitter, 'Could not open X.') },
    { key: 'ideas', onPress: () => openExternal(mailtoThoughtsAndIdeas(), 'Could not open your email app.') },
    { key: 'website', onPress: () => openExternal(KEEPSY_LINKS.website, 'Could not open the website.') },
    { key: 'help', onPress: () => openExternal(mailtoSupport(), 'Could not open your email app.') },
    { key: 'contact', onPress: () => openExternal(`mailto:${KEEPSY_LINKS.feedbackEmail}`, 'Could not open your email app.') },
  ];

  const renderItem = useCallback(
    ({ item }: { item: YearbookWithRole }) => (
      <YearbookCard
        yearbook={item}
        width={cardWidth}
        memberPreview={memberPreviews[item.id]}
        collage={collageById[item.id]}
      />
    ),
    [cardWidth, memberPreviews, collageById]
  );

  if (loading) {
    return (
      <Page flex={1}>
        <DeferredFullscreenLoader active />
      </Page>
    );
  }

  if (error) {
    return (
      <Page flex={1} justifyContent="center" alignItems="center" paddingHorizontal="$6">
        <DSText variant="title" textAlign="center" marginBottom="$2">
          Something went wrong
        </DSText>
        <DSText variant="body" color="secondary" textAlign="center" marginBottom="$5">
          {error.message}
        </DSText>
        <DSButton
          title="Try again"
          onPress={refresh}
          variant="outline"
          icon={<DSIcon name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }} size={16} color={theme.colors.text} />}
        />
      </Page>
    );
  }

  const scrollBottomPad = Math.max(insets.bottom, 16) + BOTTOM_FLOAT_RESERVE;

  return (
    <View style={styles.screen}>
      <View style={styles.bgFill} pointerEvents="none">
        <ScreenBackground />
      </View>
      <ScrollView
        style={[styles.scroll, styles.scrollLayer]}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPad }]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.greetingBlock, { paddingTop: insets.top + 16, paddingHorizontal: H_PADDING }]}>
          <Text variant="title" style={styles.greetingHi}>
            Hi, {firstName}
          </Text>
          <Text variant="body" color="secondary" style={styles.greetingLine}>
            {greeting}
          </Text>
        </View>

        {sortedYearbooks.length === 0 ? (
          <View style={[styles.emptyWrap, { paddingHorizontal: H_PADDING }]}>
            <EmptyState
              title="No yearbooks yet"
              description="Tap + to create a yearbook or join one with a code from a friend."
            />
          </View>
        ) : (
          <View style={styles.carouselBleed}>
            <FlatList
              horizontal
              style={styles.carousel}
              data={sortedYearbooks}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              showsHorizontalScrollIndicator={false}
              snapToInterval={cardWidth + CARD_GAP}
              decelerationRate="fast"
              snapToAlignment="start"
              removeClippedSubviews={false}
              contentContainerStyle={{
                paddingLeft: sidePad,
                paddingRight: sidePad,
                gap: CARD_GAP,
                paddingTop: 8,
                paddingBottom: 20,
              }}
            />
          </View>
        )}

        <View style={[styles.featuresSection, { paddingHorizontal: H_PADDING }]}>
          <Text variant="label" color="secondary" style={styles.sectionLabel}>
            New in Keepsy
          </Text>
          <Pressable
            onPress={() => openIdea('live-reactions')}
            style={({ pressed }) => [
              styles.featureCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderMuted,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            <View style={[styles.pill, { backgroundColor: theme.colors.surfaceSecondary }]}>
              <Text variant="caption" style={{ color: theme.colors.primary, fontWeight: '700' }}>
                New
              </Text>
            </View>
            <Text variant="title" style={styles.featureTitle}>
              Live reactions (beta)
            </Text>
            <Text variant="body" color="secondary" numberOfLines={2}>
              Heart answers without spamming the group chat. Rolling out gradually.
            </Text>
            <Text variant="caption" color="primary" style={styles.learnMore}>
              Learn more →
            </Text>
          </Pressable>
        </View>

        <View style={[styles.featuresSection, { paddingHorizontal: H_PADDING }]}>
          <Text variant="label" color="secondary" style={styles.sectionLabel}>
            Ideas for Keepsy
          </Text>
          <Pressable
            onPress={() => openIdea('christmas-cards')}
            style={({ pressed }) => [
              styles.heroFeature,
              {
                borderColor: theme.colors.borderMuted,
                opacity: pressed ? 0.95 : 1,
              },
            ]}
          >
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGradient}
            >
              <Text style={styles.heroEyebrow}>Holidays</Text>
              <Text style={styles.heroTitle}>Ditch the stamp. Send the season.</Text>
              <Text style={styles.heroSub}>
                Keepsy as your Christmas card — one link, everyone’s memories, zero envelopes.
              </Text>
              <View style={styles.heroCtaRow}>
                <Text style={styles.heroCta}>See how it works</Text>
                <DSIcon name={{ ios: 'arrow.right.circle.fill', android: 'arrow_forward', web: 'arrow_forward' }} size={22} color="#FFFFFF" />
              </View>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => openIdea('family-newsletter')}
            style={({ pressed }) => [
              styles.featureCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderMuted,
                marginTop: 12,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            <Text variant="title" style={styles.featureTitle}>
              The family newsletter, upgraded
            </Text>
            <Text variant="body" color="secondary" numberOfLines={2}>
              One shared yearbook beats a PDF wall of text. Tap to read more.
            </Text>
            <Text variant="caption" color="primary" style={styles.learnMore}>
              Learn more →
            </Text>
          </Pressable>
        </View>

        <View style={[styles.featuresSection, { paddingHorizontal: H_PADDING, paddingBottom: 8 }]}>
          <Text variant="label" color="secondary" style={styles.sectionLabel}>
            Coming soon
          </Text>
          <View
            style={[
              styles.featureCardMuted,
              {
                backgroundColor: theme.colors.surfaceSecondary,
                borderColor: theme.colors.borderMuted,
              },
            ]}
          >
            <Text variant="title" style={styles.featureTitle}>
              Print & keepsake exports
            </Text>
            <Text variant="body" color="secondary" numberOfLines={3}>
              Turn your digital yearbook into something you can hold — we’re prototyping layouts and partners.
            </Text>
            <Pressable onPress={() => openIdea('print-exports')} hitSlop={8}>
              <Text variant="caption" color="primary" style={styles.learnMore}>
                Get the teaser →
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.connectSection, { paddingHorizontal: H_PADDING }]}>
          <Text variant="label" color="secondary" style={styles.sectionLabel}>
            Connect with Keepsy
          </Text>
          <View style={styles.bubbleField}>
            {connectBubbles.map((bubble, i) => {
              const samples = 121;
              const inputRange = Array.from({ length: samples }, (_, idx) => idx / (samples - 1));
              const wave = bubbleWave.interpolate({
                inputRange,
                outputRange: makeWaveOutputs(i, connectBubbles.length, CONNECT_WAVE_HEIGHT, samples),
              });
              return (
                <Animated.View
                  key={bubble.key}
                  style={[
                    styles.bubbleWrap,
                    {
                      transform: [{ translateY: wave }],
                    },
                  ]}
                >
                  <Pressable
                    onPress={bubble.onPress}
                    style={({ pressed }) => [
                      styles.connectBubble,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.borderMuted,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    {bubble.key === 'instagram' ? <SocialPlatformIcon platform="instagram" size={24} /> : null}
                    {bubble.key === 'twitter' ? <SocialPlatformIcon platform="twitter" size={24} /> : null}
                    {bubble.key === 'ideas' ? (
                      <DSIcon name={{ ios: 'lightbulb.fill', android: 'lightbulb', web: 'lightbulb' }} size={24} color={theme.colors.sun} />
                    ) : null}
                    {bubble.key === 'website' ? (
                      <DSIcon name={{ ios: 'globe', android: 'language', web: 'language' }} size={24} color={theme.colors.primary} />
                    ) : null}
                    {bubble.key === 'help' ? (
                      <DSIcon name={{ ios: 'questionmark.circle.fill', android: 'help', web: 'help' }} size={24} color={theme.colors.accent} />
                    ) : null}
                    {bubble.key === 'contact' ? (
                      <DSIcon name={{ ios: 'envelope.fill', android: 'mail', web: 'mail' }} size={24} color={theme.colors.textMuted} />
                    ) : null}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomControls, { paddingBottom: Math.max(insets.bottom, 16) }]} pointerEvents="box-none">
        <Pressable
          style={({ pressed }) => [styles.profileHit, pressed && { opacity: 0.9 }]}
          onPress={() => router.push('/(app)/(tabs)/settings')}
          accessibilityLabel="Open settings"
          hitSlop={10}
        >
          <View
            style={[
              styles.profileShell,
              {
                backgroundColor: colorScheme === 'dark' ? 'rgba(11, 16, 48, 0.92)' : 'rgba(255, 255, 255, 0.96)',
                borderColor: colorScheme === 'dark' ? 'rgba(197, 204, 255, 0.14)' : 'rgba(255, 255, 255, 0.85)',
              },
            ]}
          >
            {me?.photoURL ? (
              <Image source={{ uri: me.photoURL }} style={styles.profilePic} />
            ) : (
              <View style={[styles.profilePic, styles.profilePicPlaceholder, { backgroundColor: theme.colors.borderMuted }]}>
                <Text variant="caption" color="secondary">
                  {(firstName.charAt(0) || '?').toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </Pressable>

        <View style={styles.fabSide}>
          <Animated.View
            style={[
              styles.fabMenu,
              {
                opacity: fabExpand,
                transform: [
                  {
                    translateY: fabExpand.interpolate({
                      inputRange: [0, 1],
                      outputRange: [28, 0],
                    }),
                  },
                ],
              },
            ]}
            pointerEvents={fabOpen ? 'auto' : 'none'}
          >
            <Pressable
              style={[styles.fabMenuItem, { backgroundColor: theme.colors.surface }]}
              onPress={() => {
                setFabOpen(false);
                router.push('/(app)/yearbook/join');
              }}
            >
              <DSIcon name={{ ios: 'person.badge.plus', android: 'group_add', web: 'person_add' }} size={22} color={theme.colors.primary} />
              <Text variant="body" style={[styles.fabMenuLabel, { color: theme.colors.text }]}>
                Join with code
              </Text>
            </Pressable>
            <Pressable
              style={[styles.fabMenuItem, { backgroundColor: theme.colors.surface }]}
              onPress={() => {
                setFabOpen(false);
                router.push('/(app)/yearbook/create');
              }}
            >
              <DSIcon name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }} size={22} color={theme.colors.primary} />
              <Text variant="body" style={[styles.fabMenuLabel, { color: theme.colors.text }]}>
                Create yearbook
              </Text>
            </Pressable>
          </Animated.View>
          <Pressable
            style={[styles.fab, { backgroundColor: theme.colors.primary }]}
            onPress={() => setFabOpen((o) => !o)}
            accessibilityLabel="Add yearbook"
          >
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: fabExpand.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '45deg'],
                    }),
                  },
                ],
              }}
            >
              <DSIcon name={{ ios: 'plus', android: 'add', web: 'add' }} size={28} color="#FFFFFF" />
            </Animated.View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  bgFill: {
    ...StyleSheet.absoluteFillObject,
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollLayer: {
    zIndex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  greetingBlock: {
    marginBottom: 8,
  },
  greetingHi: {
    marginBottom: 6,
  },
  greetingLine: {
    lineHeight: 22,
  },
  /** Full-bleed row: no horizontal padding so carousel isn’t clipped by a parent box */
  carouselBleed: {
    width: '100%',
    overflow: 'visible',
  },
  carousel: {
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 440,
    overflow: 'visible',
  },
  emptyWrap: {
    minHeight: 220,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  featuresSection: {
    marginTop: 8,
  },
  sectionLabel: {
    marginBottom: 10,
    letterSpacing: 0.4,
  },
  featureCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  featureCardMuted: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 10,
  },
  featureTitle: {
    marginBottom: 8,
  },
  learnMore: {
    marginTop: 12,
    fontWeight: '600',
  },
  heroFeature: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  heroGradient: {
    padding: 22,
    minHeight: 168,
    justifyContent: 'flex-end',
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    marginBottom: 8,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 14,
  },
  heroCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroCta: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  bottomControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  profileHit: {
    borderRadius: 28,
  },
  profileShell: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0F1637',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 10,
  },
  profilePic: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  profilePicPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabSide: {
    alignItems: 'flex-end',
  },
  fabMenu: {
    marginBottom: 12,
    alignItems: 'flex-end',
    gap: 8,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  fabMenuLabel: {
    fontWeight: '600',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#14162B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 12,
  },
  connectSection: {
    marginTop: 20,
    paddingBottom: 20,
  },
  bubbleField: {
    height: CONNECT_BUBBLE_SIZE + CONNECT_WAVE_HEIGHT * 2 + 4,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bubbleWrap: {
    width: CONNECT_BUBBLE_SIZE,
    alignItems: 'center',
  },
  connectBubble: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F1637',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
});
