import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useNavigation } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { useYearbookId } from '@/src/contexts/YearbookIdContext';
import { useYearbookNav, useScrollToHideNav } from '@/src/contexts/YearbookNavContext';
import { getYearbookMembers, getUser } from '@/src/services/firestore';
import { isTutorialYearbook } from '@/src/tutorial/constants';
import { loadTutorialMembersWithUsers } from '@/src/tutorial/personas';
import { Container, Text } from '@/src/components/ui';
import {
  DSIcon,
  DeferredFullscreenLoader,
  standardFlatListScrollProps,
  TAB_BAR_CONTENT_HEIGHT,
} from '@/src/design-system';
import type { YearbookMember } from '@/src/types/yearbook.types';
import type { User } from '@/src/types/user.types';
import { useTheme } from '@/src/contexts/ThemeContext';

const LIST_PADDING_BASE = 24;

type MemberWithUser = YearbookMember & { user: User | null };

export default function MembersTab() {
  const id = useYearbookId();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { userId: currentUserId } = useAuth();
  const { theme } = useTheme();
  const { navVisible, setNavVisible } = useYearbookNav();
  const { onScroll, scrollEventThrottle } = useScrollToHideNav();
  const listPaddingBottom = LIST_PADDING_BASE + (navVisible ? TAB_BAR_CONTENT_HEIGHT : 0) + insets.bottom;
  const [members, setMembers] = useState<MemberWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setNavVisible(true);
    return () => setNavVisible(true);
  }, [setNavVisible]);
  useEffect(() => {
    navigation.getParent()?.setOptions({ headerShown: navVisible });
  }, [navigation, navVisible]);

  const load = async () => {
    if (!id) return;
    if (isTutorialYearbook(id)) {
      const withUsers = await loadTutorialMembersWithUsers(currentUserId ?? undefined, getUser);
      setMembers(withUsers);
      return;
    }
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
    if (!id) return;
    router.push({
      pathname: '/(app)/profile/[userId]',
      params: { userId: memberUserId, yearbookId: id },
    });
  };

  if (loading) {
    return (
      <Container>
        <DeferredFullscreenLoader active />
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
      <DeferredFullscreenLoader active={refreshing} />
      <FlatList
        data={members}
        keyExtractor={(m) => m.id}
        contentContainerStyle={[styles.list, { paddingBottom: listPaddingBottom }]}
        {...standardFlatListScrollProps}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
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
              <View style={styles.rowAccessory}>
                <DSIcon
                  name={{ ios: 'chevron.right', android: 'arrow_forward_ios', web: 'arrow_forward_ios' }}
                  size={16}
                  color={theme.colors.textMuted}
                />
              </View>
            </Pressable>
          );
        }}
      />
    </Container>
  );
}

const styles = StyleSheet.create({
  empty: { marginTop: 24, textAlign: 'center' },
  list: {},
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
  rowAccessory: {
    width: 24,
    alignItems: 'flex-end',
  },
});
