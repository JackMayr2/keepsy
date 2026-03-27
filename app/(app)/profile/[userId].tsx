import { Container, SocialPlatformIcon, Text } from '@/src/components/ui';
import { useTheme } from '@/src/contexts/ThemeContext';
import { DeferredFullscreenLoader } from '@/src/design-system';
import { getDraftsForUser, getPrompts, getUser } from '@/src/services/firestore';
import { isDemoUserId, isTutorialYearbook } from '@/src/tutorial/constants';
import { buildTutorialDemoProfilePromptRows } from '@/src/tutorial/demoContent';
import { getUserForTutorial } from '@/src/tutorial/personas';
import type { Draft, Prompt } from '@/src/types/prompt.types';
import type { User } from '@/src/types/user.types';
import {
    resolveSocialUrl,
    socialPlatformChipStyle,
} from '@/src/utils/socialLinks';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, StyleSheet, View } from 'react-native';

const SOCIAL_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  twitter: 'Twitter / X',
  linkedin: 'LinkedIn',
};

type PromptAnswerRow = { prompt: Prompt; draft: Draft };

function paramString(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export default function MemberProfileScreen() {
  const params = useLocalSearchParams<{ userId: string; yearbookId?: string | string[] }>();
  const profileUserId = paramString(params.userId);
  const yearbookId = paramString(params.yearbookId);

  const { theme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [promptRows, setPromptRows] = useState<PromptAnswerRow[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(false);

  useEffect(() => {
    if (!profileUserId) {
      setLoading(false);
      return;
    }
    getUserForTutorial(profileUserId, getUser)
      .then(setUser)
      .finally(() => setLoading(false));
  }, [profileUserId]);

  useEffect(() => {
    if (!profileUserId || !yearbookId) {
      setPromptRows([]);
      setPromptsLoading(false);
      return;
    }
    if (isDemoUserId(profileUserId) && isTutorialYearbook(yearbookId)) {
      let cancelled = false;
      setPromptsLoading(true);
      (async () => {
        try {
          const plist = await getPrompts(yearbookId);
          if (cancelled) return;
          const rows = buildTutorialDemoProfilePromptRows(yearbookId, profileUserId, plist);
          if (!cancelled) setPromptRows(rows);
        } catch {
          if (!cancelled) setPromptRows([]);
        } finally {
          if (!cancelled) setPromptsLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
    if (isDemoUserId(profileUserId)) {
      setPromptRows([]);
      setPromptsLoading(false);
      return;
    }
    let cancelled = false;
    setPromptsLoading(true);
    (async () => {
      try {
        const [plist, drafts] = await Promise.all([
          getPrompts(yearbookId),
          getDraftsForUser(profileUserId, yearbookId),
        ]);
        if (cancelled) return;
        const byPrompt: Record<string, Draft> = {};
        for (const d of drafts) {
          byPrompt[d.promptId] = d;
        }
        const sorted = [...plist].sort((a, b) => a.order - b.order);
        const rows: PromptAnswerRow[] = [];
        for (const p of sorted) {
          const d = byPrompt[p.id];
          if (!d || d.status !== 'submitted') continue;
          const hasText = Boolean(d.content?.trim());
          const hasPhoto = Boolean(d.photoURL);
          if (!hasText && !hasPhoto) continue;
          rows.push({ prompt: p, draft: d });
        }
        setPromptRows(rows);
      } catch {
        if (!cancelled) setPromptRows([]);
      } finally {
        if (!cancelled) setPromptsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileUserId, yearbookId]);

  if (loading) {
    return (
      <Container>
        <DeferredFullscreenLoader active />
      </Container>
    );
  }

  if (!user) {
    return (
      <Container>
        <Text variant="body" color="secondary">
          Profile not found.
        </Text>
      </Container>
    );
  }

  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'No name';
  const socialLinks = user.socialLinks ?? {};

  return (
    <Container scroll>
      <View style={styles.header}>
        {user.photoURL ? (
          <Image source={{ uri: user.photoURL }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.borderMuted }]}>
            <Text variant="title" color="secondary">
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text variant="titleLarge" style={styles.name}>
          {name}
        </Text>
        {user.bio ? (
          <Text variant="body" color="secondary" style={styles.bio}>
            {user.bio}
          </Text>
        ) : null}
        {user.city ? (
          <Text variant="body" color="secondary" style={styles.city}>
            {user.city}
          </Text>
        ) : null}
      </View>

      {yearbookId ? (
        <View style={styles.section}>
          <Text variant="label" color="secondary" style={styles.sectionTitle}>
            Prompt answers
          </Text>
          <Text variant="caption" color="secondary" style={styles.sectionHint}>
            What they shared in this yearbook (submitted responses only).
          </Text>
          {promptsLoading ? (
            <View style={styles.promptsLoading}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : promptRows.length === 0 ? (
            <Text variant="body" color="secondary" style={styles.emptyPrompts}>
              No prompt answers yet.
            </Text>
          ) : (
            <View style={styles.promptList}>
              {promptRows.map(({ prompt, draft }) => (
                <View
                  key={prompt.id}
                  style={[styles.promptCard, { borderColor: theme.colors.borderMuted, backgroundColor: theme.colors.surfaceGlass }]}
                >
                  <Text variant="label" color="secondary" style={styles.promptQuestion}>
                    {prompt.text}
                  </Text>
                  {prompt.type === 'photo' && draft.photoURL ? (
                    <Image source={{ uri: draft.photoURL }} style={styles.promptPhoto} resizeMode="cover" />
                  ) : null}
                  {draft.content?.trim() ? (
                    <Text variant="body" style={styles.promptAnswer}>
                      {draft.content.trim()}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>
      ) : null}

      {Object.keys(socialLinks).length > 0 ? (
        <View style={styles.section}>
          <Text variant="label" color="secondary" style={styles.sectionTitle}>
            Connect
          </Text>
          <View style={styles.socialRow}>
            {Object.entries(socialLinks).map(([key, value]) => {
              if (!value?.trim()) return null;
              const url = resolveSocialUrl(key, value);
              if (!url) return null;
              const label = SOCIAL_LABELS[key] ?? key;
              const { background, iconColor } = socialPlatformChipStyle(key);
              return (
                <Pressable
                  key={key}
                  accessibilityRole="link"
                  accessibilityLabel={`Open ${label}`}
                  hitSlop={8}
                  onPress={() => Linking.openURL(url)}
                  style={({ pressed }) => [
                    styles.socialHit,
                    { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
                  ]}
                >
                  <View style={[styles.socialIconCircle, { backgroundColor: background }]}>
                    <SocialPlatformIcon platform={key} size={28} color={iconColor} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </Container>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: 12 },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: { marginBottom: 8 },
  bio: { textAlign: 'center', paddingHorizontal: 24 },
  city: { textAlign: 'center', marginTop: 8, paddingHorizontal: 24 },
  section: { marginTop: 8, marginBottom: 8 },
  sectionTitle: { marginBottom: 6 },
  sectionHint: { marginBottom: 12 },
  promptsLoading: { paddingVertical: 20, alignItems: 'center' },
  emptyPrompts: { paddingVertical: 8 },
  promptList: { gap: 12 },
  promptCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    overflow: 'hidden',
  },
  promptQuestion: { marginBottom: 10 },
  promptPhoto: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#1a1a1a',
  },
  promptAnswer: { lineHeight: 22 },
  socialRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  socialHit: {
    minWidth: 56,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
});
