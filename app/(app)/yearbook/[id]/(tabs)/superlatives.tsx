import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { useYearbookId } from '@/src/contexts/YearbookIdContext';
import {
  getSuperlatives,
  getYearbookMembers,
  nominateSuperlative,
  getUser,
  ensureDefaultSuperlatives,
} from '@/src/services/firestore';
import { logger } from '@/src/utils/logger';
import { Container, Text, Button } from '@/src/components/ui';
import type { YearbookMember } from '@/src/types/yearbook.types';
import type { User } from '@/src/types/user.types';
import { useTheme } from '@/src/contexts/ThemeContext';

type SuperlativeWithNominations = {
  id: string;
  category: string;
  nominations: Record<string, string>;
};

type MemberWithUser = YearbookMember & { user: User | null };

export default function SuperlativesTab() {
  const id = useYearbookId();
  const { userId } = useAuth();
  const { theme } = useTheme();
  const [superlatives, setSuperlatives] = useState<SuperlativeWithNominations[]>([]);
  const [members, setMembers] = useState<MemberWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [nominating, setNominating] = useState(false);
  const [selectedSuperlative, setSelectedSuperlative] = useState<SuperlativeWithNominations | null>(null);

  const load = async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      try {
        await ensureDefaultSuperlatives(id);
      } catch (e) {
        logger.warn('SuperlativesTab', 'ensureDefaultSuperlatives failed (may need Firestore rules)', e);
      }
      const [supList, memberList] = await Promise.all([
        getSuperlatives(id),
        getYearbookMembers(id),
      ]);
      setSuperlatives(
        supList.map((s) => ({
          id: s.id,
          category: s.category,
          nominations: s.nominations ?? {},
        }))
      );
      const withUsers: MemberWithUser[] = await Promise.all(
        memberList.map(async (m) => ({
          ...m,
          user: await getUser(m.userId),
        }))
      );
      setMembers(withUsers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleNominate = async (superlativeId: string, nominatedUserId: string) => {
    if (!userId) return;
    setNominating(true);
    try {
      await nominateSuperlative(superlativeId, userId, nominatedUserId);
      await load();
      setSelectedSuperlative(null);
    } finally {
      setNominating(false);
    }
  };

  const getMemberName = (member: MemberWithUser) =>
    member.user
      ? [member.user.firstName, member.user.lastName].filter(Boolean).join(' ') || 'No name'
      : '…';

  if (loading) {
    return (
      <Container>
        <ActivityIndicator size="large" style={styles.loader} />
      </Container>
    );
  }

  if (superlatives.length === 0) {
    return (
      <Container>
        <Text variant="body" color="secondary">
          No superlatives yet. Admins can add categories like “Most Likely to…”
        </Text>
      </Container>
    );
  }

  return (
    <Container>
      {superlatives.map((s) => {
        const myNominatedId = userId ? s.nominations[userId] : undefined;
        const nominatedMember = myNominatedId
          ? members.find((m) => m.userId === myNominatedId)
          : null;
        const nominatedName = nominatedMember ? getMemberName(nominatedMember) : null;

        return (
          <View
            key={s.id}
            style={[styles.row, { borderBottomColor: theme.colors.borderMuted }]}
          >
            <Text variant="body" style={styles.category}>
              {s.category}
            </Text>
            {nominatedName ? (
              <Text variant="caption" color="secondary">
                You nominated: {nominatedName}
              </Text>
            ) : (
              <Button
                title="Nominate"
                variant="outline"
                onPress={() => setSelectedSuperlative(s)}
                style={styles.nominateBtn}
              />
            )}
          </View>
        );
      })}

      <Modal visible={!!selectedSuperlative} animationType="slide" transparent>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedSuperlative(null)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text variant="title" style={styles.modalTitle}>
              {selectedSuperlative?.category}
            </Text>
            <Text variant="caption" color="secondary" style={styles.modalSubtitle}>
              Who do you want to nominate?
            </Text>
            <FlatList
              data={members.filter((m) => m.userId !== userId)}
              keyExtractor={(m) => m.id}
              style={styles.memberList}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [
                    styles.memberRow,
                    { backgroundColor: theme.colors.surface },
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() =>
                    selectedSuperlative &&
                    handleNominate(selectedSuperlative.id, item.userId)
                  }
                  disabled={nominating}
                >
                  {item.user?.photoURL ? (
                    <Image source={{ uri: item.user.photoURL }} style={styles.avatar} />
                  ) : (
                    <View
                      style={[
                        styles.avatarPlaceholder,
                        { backgroundColor: theme.colors.borderMuted },
                      ]}
                    >
                      <Text variant="caption" color="secondary">
                        {getMemberName(item).charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text variant="body">{getMemberName(item)}</Text>
                </Pressable>
              )}
            />
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => setSelectedSuperlative(null)}
              style={styles.cancelBtn}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </Container>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 24 },
  row: {
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  category: { marginBottom: 6 },
  nominateBtn: { alignSelf: 'flex-start', marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '70%',
  },
  modalTitle: { marginBottom: 4 },
  modalSubtitle: { marginBottom: 16 },
  memberList: { maxHeight: 280, marginBottom: 12 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: { marginTop: 8 },
});
