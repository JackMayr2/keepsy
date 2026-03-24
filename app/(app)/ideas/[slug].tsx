import React, { useLayoutEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Container, Text, Button } from '@/src/components/ui';

type IdeaContent = {
  title: string;
  eyebrow: string;
  paragraphs: string[];
  cta?: string;
};

const IDEAS: Record<string, IdeaContent> = {
  'christmas-cards': {
    title: 'The card that keeps on giving',
    eyebrow: 'Holiday cards, reimagined',
    paragraphs: [
      'Paper cards are lovely — until they sit in a drawer. Keepsy lets your crew share photos, prompts, and little notes in one living yearbook that keeps growing through the season.',
      'Instead of signing fifty envelopes, invite your people once. Everyone adds their warmth in one place: the ugly-sweater pic, the cookie fail, the toast that made everyone cry.',
      'When January hits, you’ll still have the whole story — not a pile of cardstock.',
    ],
    cta: 'Start a holiday yearbook',
  },
  'family-newsletter': {
    title: 'The anti-newsletter newsletter',
    eyebrow: 'For families',
    paragraphs: [
      'Remember those annual “letter from the family” emails? Same energy — but visual, interactive, and something people actually open.',
      'Drop in trips, milestones, and inside jokes. Relatives can react without replying-all to forty people.',
      'Keepsy is for the group chat that deserves better than a PDF attachment.',
    ],
    cta: 'Create a family yearbook',
  },
  'live-reactions': {
    title: 'Reactions that actually land',
    eyebrow: 'New',
    paragraphs: [
      'We’re experimenting with lightweight reactions on prompts and polls — think “heart this answer” without the noise of a full comment thread.',
      'You\'ll see this roll out gradually across yearbooks. Nothing to turn on; it’ll just appear when your group is ready.',
    ],
  },
  'print-exports': {
    title: 'From screen to shelf',
    eyebrow: 'Coming soon',
    paragraphs: [
      'We’re exploring beautiful print-on-demand layouts for your yearbook — coffee-table books, mini zines, and postcard packs.',
      'Join the waitlist by keeping your yearbook active; we’ll let you know when your story is ready for the physical world.',
    ],
  },
};

const DEFAULT_SLUG = 'christmas-cards';

export default function IdeaDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string | string[] }>();
  const id = typeof slug === 'string' ? slug : slug?.[0] ?? DEFAULT_SLUG;
  const content = IDEAS[id] ?? IDEAS[DEFAULT_SLUG];
  const navigation = useNavigation();
  const router = useRouter();

  useLayoutEffect(() => {
    navigation.setOptions({ title: content.title });
  }, [navigation, content.title]);

  return (
    <Container scroll extraBottomPadding={24}>
      <Text variant="caption" color="secondary" style={styles.eyebrow}>
        {content.eyebrow}
      </Text>
      <Text variant="titleLarge" style={styles.title}>
        {content.title}
      </Text>
      <View style={styles.body}>
        {content.paragraphs.map((p, i) => (
          <Text key={i} variant="body" color="secondary" style={[styles.para, i < content.paragraphs.length - 1 && styles.paraSpacing]}>
            {p}
          </Text>
        ))}
      </View>
      {content.cta ? (
        <Button
          title={content.cta}
          onPress={() => router.push('/(app)/yearbook/create')}
          style={styles.cta}
        />
      ) : null}
    </Container>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    marginBottom: 20,
  },
  body: {
    marginBottom: 0,
  },
  para: {
    lineHeight: 24,
  },
  paraSpacing: {
    marginBottom: 16,
  },
  cta: {
    marginTop: 28,
  },
});
