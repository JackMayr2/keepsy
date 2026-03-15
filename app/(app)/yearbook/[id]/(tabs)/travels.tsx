import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { useYearbookId } from '@/src/contexts/YearbookIdContext';
import { getTravels, createTravel } from '@/src/services/firestore';
import { Container, Text, Button, Input } from '@/src/components/ui';

export default function TravelsTab() {
  const id = useYearbookId();
  const { userId } = useAuth();
  const [travels, setTravels] = useState<Array<{ id: string; placeName?: string; notes?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [placeName, setPlaceName] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

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
      <Button title="Add travel" onPress={() => setModalVisible(true)} style={styles.addBtn} />
      <FlatList
        data={travels}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
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
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
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
              <Button title="Save" onPress={handleAdd} loading={saving} />
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
  list: { paddingBottom: 24 },
  row: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
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
  },
  modalTitle: { marginBottom: 16 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
});