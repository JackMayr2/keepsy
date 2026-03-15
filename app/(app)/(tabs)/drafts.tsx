import React from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { useDrafts } from '@/src/hooks/useDrafts';
import { Container, Text } from '@/src/components/ui';

export default function DraftsScreen() {
  const { userId } = useAuth();
  const { drafts, loading } = useDrafts(userId);

  if (loading) {
    return (
      <Container>
        <ActivityIndicator size="large" style={styles.loader} />
      </Container>
    );
  }

  if (drafts.length === 0) {
    return (
      <Container>
        <View style={styles.empty}>
          <Text variant="body" color="secondary">
            No drafts yet. Answer prompts in a yearbook to see them here.
          </Text>
        </View>
      </Container>
    );
  }

  return (
    <Container>
      <FlatList
        data={drafts}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text variant="body" numberOfLines={2}>
              {item.content || '(No content)'}
            </Text>
            <Text variant="caption" color="muted">
              {item.status === 'draft' ? 'Draft' : 'Submitted'}
            </Text>
          </View>
        )}
      />
    </Container>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 24 },
  loader: { marginTop: 24 },
  empty: { flex: 1, justifyContent: 'center', padding: 24 },
  row: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
});
