import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { useYearbookId } from '@/src/contexts/YearbookIdContext';
import { useYearbookNav, useScrollToHideNav } from '@/src/contexts/YearbookNavContext';
import { getTravels, createTravel } from '@/src/services/firestore';
import { DSIcon } from '@/src/design-system';
import { Container, Text, Button, Input } from '@/src/components/ui';
import { standardFlatListScrollProps, TAB_BAR_CONTENT_HEIGHT } from '@/src/design-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/contexts/ThemeContext';

const LIST_PADDING_BASE = 24;

export default function TravelsTab() {
  const id = useYearbookId();
  const navigation = useNavigation();
  const { userId } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { navVisible, setNavVisible } = useYearbookNav();
  const { onScroll, scrollEventThrottle } = useScrollToHideNav();
  const listPaddingBottom = LIST_PADDING_BASE + (navVisible ? TAB_BAR_CONTENT_HEIGHT : 0) + insets.bottom;
  const [travels, setTravels] = useState<Array<{ id: string; placeName?: string; notes?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [placeName, setPlaceName] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNavVisible(true);
    return () => setNavVisible(true);
  }, [setNavVisible]);
  useEffect(() => {
    navigation.getParent()?.setOptions({ headerShown: navVisible });
  }, [navigation, navVisible]);

  const load = async () => {
    if (!id) return;
    const list = await getTravels(id);
    setTravels(list.map((t) => ({ id: t.id, placeName: t.placeName, notes: t.notes })));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleAdd = async () => {
    if (!id || !userId) return;
    setSaving(true);
    try {
      await createTravel(id, userId, { placeName: placeName.trim() || undefined, notes: notes.trim() || undefined });
      setPlaceName('');
      setNotes('');
      setModalVisible(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <ActivityIndicator size="large" style={styles.loader} />
      </Container>
    );
  }

  return (
    <Container>
      <Button
        title="Add travel"
        onPress={() => setModalVisible(true)}
        icon={<DSIcon name={{ ios: 'airplane.circle.fill', android: 'flight_takeoff', web: 'flight_takeoff' }} size={16} color="#FFFFFF" />}
        style={styles.addBtn}
      />
      <FlatList
        data={travels}
        keyExtractor={(t) => t.id}
        contentContainerStyle={[styles.list, { paddingBottom: listPaddingBottom }]}
        {...standardFlatListScrollProps}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        renderItem={({ item }) => (
          <View style={[styles.row, { borderBottomColor: theme.colors.borderMuted }]}>
            <Text variant="body">{item.placeName || 'Unnamed place'}</Text>
            {item.notes ? (
              <Text variant="caption" color="secondary" numberOfLines={2}>
                {item.notes}
              </Text>
            ) : null}
          </View>
        )}
      />
      <Modal visible={modalVisible} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable
            style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text variant="title" style={styles.modalTitle}>
              Add travel
            </Text>
            <Input
              label="Place"
              value={placeName}
              onChangeText={setPlaceName}
              placeholder="Where did you go?"
            />
            <Input
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes (optional)"
              multiline
            />
            <View style={styles.modalActions}>
              <Button title="Cancel" variant="ghost" onPress={() => setModalVisible(false)} />
              <Button
                title="Save"
                onPress={handleAdd}
                loading={saving}
                icon={<DSIcon name={{ ios: 'bookmark.fill', android: 'bookmark', web: 'bookmark' }} size={16} color="#FFFFFF" />}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Container>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 24 },
  addBtn: { marginBottom: 16 },
  list: {},
  row: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: { marginBottom: 16 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
});
