import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { useYearbookId } from '@/src/contexts/YearbookIdContext';
import {
  getPolls,
  votePoll,
  getUserVote,
  getPollResults,
  ensureDefaultPolls,
} from '@/src/services/firestore';
import { logger } from '@/src/utils/logger';
import { Container, Text } from '@/src/components/ui';

type PollWithVote = {
  id: string;
  question: string;
  options: string[];
  userVote: number | null;
  results: number[] | null;
};

export default function PollsTab() {
  const id = useYearbookId();
  const { userId } = useAuth();
  const [polls, setPolls] = useState<PollWithVote[]>([]);
  const [loading, setLoading] = useState(true);

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
        <ActivityIndicator size="large" style={styles.loader} />
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
      {polls.map((poll) => (
        <View key={poll.id} style={styles.poll}>
          <Text variant="title" style={styles.question}>
            {poll.question}
          </Text>
          {poll.userVote === null ? (
            poll.options.map((opt, i) => (
              <Pressable
                key={i}
                style={styles.option}
                onPress={() => handleVote(poll.id, i)}
              >
                <Text variant="body">{opt}</Text>
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
      ))}
    </Container>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 24 },
  poll: { marginBottom: 24 },
  question: { marginBottom: 12 },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 8,
  },
  resultRow: { paddingVertical: 6 },
});
