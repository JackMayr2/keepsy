import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, FlatList } from 'react-native';
import { useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/contexts/AuthContext';
import { useYearbookId } from '@/src/contexts/YearbookIdContext';
import { useYearbookNav, useScrollToHideNav } from '@/src/contexts/YearbookNavContext';
import {
  getPolls,
  votePoll,
  getUserVote,
  getPollResults,
  ensureDefaultPolls,
} from '@/src/services/firestore';
import { logger } from '@/src/utils/logger';
import { Container, Text } from '@/src/components/ui';
import { DSIcon, KeepsyBookLoader, standardFlatListScrollProps, TAB_BAR_CONTENT_HEIGHT } from '@/src/design-system';
import { useTheme } from '@/src/contexts/ThemeContext';

const LIST_PADDING_BASE = 24;

type PollWithVote = {
  id: string;
  question: string;
  options: string[];
  userVote: number | null;
  results: number[] | null;
};

export default function PollsTab() {
  const id = useYearbookId();
  const navigation = useNavigation();
  const { userId } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { navVisible, setNavVisible } = useYearbookNav();
  const { onScroll, scrollEventThrottle } = useScrollToHideNav();
  const listPaddingBottom = LIST_PADDING_BASE + (navVisible ? TAB_BAR_CONTENT_HEIGHT : 0) + insets.bottom;
  const [polls, setPolls] = useState<PollWithVote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setNavVisible(true);
    return () => setNavVisible(true);
  }, [setNavVisible]);
  useEffect(() => {
    navigation.getParent()?.setOptions({ headerShown: navVisible });
  }, [navigation, navVisible]);

  const load = async () => {
    if (!id || !userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      try {
        await ensureDefaultPolls(id);
      } catch (e) {
        logger.warn('PollsTab', 'ensureDefaultPolls failed (may need Firestore rules)', e);
      }
      const list = await getPolls(id);
      const withVotes: PollWithVote[] = await Promise.all(
        list.map(async (p) => {
          const userVote = await getUserVote(p.id, userId);
          const results = userVote !== null ? await getPollResults(p.id) : null;
          return {
            id: p.id,
            question: p.question,
            options: p.options,
            userVote,
            results,
          };
        })
      );
      setPolls(withVotes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id, userId]);

  const handleVote = async (pollId: string, optionIndex: number) => {
    if (!userId) return;
    await votePoll(pollId, userId, optionIndex);
    load();
  };

  if (loading) {
    return (
      <Container>
        <View style={styles.loaderWrap}>
          <KeepsyBookLoader size={52} />
        </View>
      </Container>
    );
  }

  if (polls.length === 0) {
    return (
      <Container>
        <Text variant="body" color="secondary">
          No polls yet. Admins can add polls.
        </Text>
      </Container>
    );
  }

  return (
    <Container>
      <FlatList
        data={polls}
        keyExtractor={(poll) => poll.id}
        contentContainerStyle={[styles.list, { paddingBottom: listPaddingBottom }]}
        {...standardFlatListScrollProps}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        renderItem={({ item: poll }) => (
          <View style={styles.poll}>
            <Text variant="title" style={styles.question}>
              {poll.question}
            </Text>
            {poll.userVote === null ? (
              poll.options.map((opt, i) => (
                <Pressable
                  key={i}
                  style={[
                    styles.option,
                    {
                      backgroundColor: theme.colors.surfaceSecondary,
                      borderColor: theme.colors.glassBorder,
                    },
                  ]}
                  onPress={() => handleVote(poll.id, i)}
                >
                  <View style={styles.optionContent}>
                    <DSIcon
                      name={{ ios: 'chart.bar.xaxis', android: 'bar-chart', web: 'bar-chart' }}
                      size={16}
                      color={theme.colors.primary}
                    />
                    <Text variant="body" style={styles.optionLabel}>
                      {opt}
                    </Text>
                  </View>
                </Pressable>
              ))
            ) : (
              poll.options.map((opt, i) => {
                const count = poll.results?.[i] ?? 0;
                const total = poll.results?.reduce((a, b) => a + b, 0) ?? 0;
                const pct = total ? Math.round((count / total) * 100) : 0;
                return (
                  <View key={i} style={styles.resultRow}>
                    <Text variant="body">
                      {opt} — {count} ({pct}%)
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        )}
      />
    </Container>
  );
}

const styles = StyleSheet.create({
  list: {},
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
  poll: { marginBottom: 24 },
  question: { marginBottom: 12 },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  optionLabel: { textAlign: 'center', flexShrink: 1 },
  resultRow: { paddingVertical: 6 },
});
