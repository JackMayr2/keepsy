import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { useYearbookId } from '@/src/contexts/YearbookIdContext';
import { getYearbookMembers, getUser } from '@/src/services/firestore';
import { Container, Text } from '@/src/components/ui';
import type { YearbookMember } from '@/src/types/yearbook.types';
import type { User } from '@/src/types/user.types';
import { useTheme } from '@/src/contexts/ThemeContext';

type MemberWithUser = YearbookMember & { user: User | null };

export default function MembersTab() {
  const id = useYearbookId();
  const router = useRouter();
  const { userId: currentUserId } = useAuth();
  const { theme } = useTheme();
  const [members, setMembers] = useState<MemberWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!id) return;
    const list = await getYearbookMembers(id);
    const withUsers: MemberWithUser[] = await Promise.all(
      list.map(async (m) => ({
        ...m,
        user: await getUser(m.userId),
      }))
    );
    setMembers(withUsers);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleMemberPress = (memberUserId: string) => {
    router.push({ pathname: '/(app)/profile/[userId]', params: { userId: memberUserId } });
  };

  if (loading) {
    return (
      <Container>
        <ActivityIndicator size="large" style={styles.loader} />
      </Container>
    );
  }

  if (members.length === 0) {
    return (
      <Container>
        <Text variant="body" color="secondary" style={styles.empty}>
          No members yet. Share the invite code so others can join.
        </Text>
      </Container>
    );
  }

  return (
    <Container>
      <FlatList
        data={members}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => {
          const name = item.user
            ? [item.user.firstName, item.user.lastName].filter(Boolean).join(' ') || 'No name'
            : 'Loading…';
          const isCurrentUser = item.userId === currentUserId;
          return (
            <Pressable
              onPress={() => handleMemberPress(item.userId)}
              style={({ pressed }) => [
                styles.row,
                { borderBottomColor: theme.colors.borderMuted },
                pressed && styles.rowPressed,
              ]}
            >
              {item.user?.photoURL ? (
                <Image source={{ uri: item.user.photoURL }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.borderMuted }]}>
                  <Text variant="caption" color="secondary">
                    {name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.rowContent}>
                <Text variant="body" numberOfLines={1}>
                  {name}
                  {isCurrentUser ? ' (you)' : ''}
                </Text>
                <Text variant="caption" color="secondary">
                  {item.role}
                </Text>
              </View>
              <Text variant="caption" color="secondary">
                View profile
              </Text>
            </Pressable>
          );
        }}
      />
    </Container>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 24 },
  empty: { marginTop: 24, textAlign: 'center' },
  list: { paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  rowPressed: { opacity: 0.7 },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowContent: { flex: 1, minWidth: 0, marginRight: 8 },
});
