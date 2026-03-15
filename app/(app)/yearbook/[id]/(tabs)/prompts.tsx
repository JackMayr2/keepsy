import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Modal,
  Pressable,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/src/contexts/AuthContext';
import { useYearbookId } from '@/src/contexts/YearbookIdContext';
import { usePrompts } from '@/src/hooks/usePrompts';
import { saveDraft } from '@/src/services/firestore';
import { uploadPromptImage } from '@/src/services/storage';
import { logger } from '@/src/utils/logger';
import { Container, Text, Button, Input } from '@/src/components/ui';
import type { Prompt } from '@/src/types/prompt.types';

export default function PromptsTab() {
  const id = useYearbookId();
  const { userId } = useAuth();
  const { prompts, loading, refresh } = usePrompts(id);
  const [selected, setSelected] = useState<Prompt | null>(null);
  const [answer, setAnswer] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!selected || !userId || !id) return;
    if (selected.type === 'photo' && !photoUri) return;
    if (selected.type === 'text' && !answer.trim()) return;

    setSaving(true);
    try {
      if (selected.type === 'photo' && photoUri) {
        const photoURL = await uploadPromptImage(id, selected.id, userId!, photoUri);
        await saveDraft(id, selected.id, userId, '', 'submitted', photoURL);
      } else {
        await saveDraft(id, selected.id, userId, answer, 'submitted');
      }
      setSelected(null);
      setAnswer('');
      setPhotoUri(null);
      refresh();
    } catch (e) {
      logger.error('PromptsTab', 'submit failed', e);
      Alert.alert('Error', 'Could not submit. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to add a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const openModal = (item: Prompt) => {
    setSelected(item);
    setAnswer('');
    setPhotoUri(null);
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
      <FlatList
        data={prompts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={styles.promptRow}
            onPress={() => openModal(item)}
          >
            <Text variant="body">{item.text}</Text>
            <Text variant="caption" color="muted">
              {item.type === 'photo' ? 'Photo' : 'Text'}
            </Text>
          </Pressable>
        )}
      />
      <Modal visible={!!selected} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setSelected(null)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text variant="title" style={styles.modalTitle}>
              {selected?.text}
            </Text>
            {selected?.type === 'text' ? (
              <Input
                value={answer}
                onChangeText={setAnswer}
                placeholder="Your answer"
                multiline
              />
            ) : (
              <View style={styles.photoSection}>
                {photoUri ? (
                  <>
                    <Image source={{ uri: photoUri }} style={styles.previewImage} />
                    <Button title="Change photo" variant="ghost" onPress={pickPhoto} style={styles.changePhoto} />
                  </>
                ) : (
                  <Button title="Choose photo" onPress={pickPhoto} />
                )}
              </View>
            )}
            <View style={styles.modalActions}>
              <Button title="Cancel" variant="ghost" onPress={() => setSelected(null)} />
              <Button
                title="Submit"
                onPress={handleSubmit}
                disabled={(selected?.type === 'text' && !answer.trim()) || (selected?.type === 'photo' && !photoUri)}
                loading={saving}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Container>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 24 },
  loader: { marginTop: 24 },
  promptRow: {
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
  photoSection: { marginVertical: 8 },
  previewImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: 12, marginBottom: 12 },
  changePhoto: { alignSelf: 'flex-start' },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
});
