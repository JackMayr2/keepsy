import React, { useState, useEffect } from 'react';
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
import { useNavigation } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { useYearbookId } from '@/src/contexts/YearbookIdContext';
import { useYearbookNav, useScrollToHideNav } from '@/src/contexts/YearbookNavContext';
import { usePrompts } from '@/src/hooks/usePrompts';
import { saveDraft } from '@/src/services/firestore';
import { uploadPromptImage } from '@/src/services/storage';
import { logger } from '@/src/utils/logger';
import { DSIcon } from '@/src/design-system';
import { Container, Text, Button, Input } from '@/src/components/ui';
import { standardFlatListScrollProps, TAB_BAR_CONTENT_HEIGHT } from '@/src/design-system';
import type { Prompt } from '@/src/types/prompt.types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/contexts/ThemeContext';

const LIST_PADDING_BASE = 24;

export default function PromptsTab() {
  const id = useYearbookId();
  const navigation = useNavigation();
  const { userId } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { navVisible, setNavVisible } = useYearbookNav();
  const { onScroll, scrollEventThrottle } = useScrollToHideNav();
  const { prompts, loading, refresh } = usePrompts(id);
  const listPaddingBottom = LIST_PADDING_BASE + (navVisible ? TAB_BAR_CONTENT_HEIGHT : 0) + insets.bottom;
  const [selected, setSelected] = useState<Prompt | null>(null);
  const [answer, setAnswer] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNavVisible(true);
    return () => setNavVisible(true);
  }, [setNavVisible]);
  useEffect(() => {
    navigation.getParent()?.setOptions({ headerShown: navVisible });
  }, [navigation, navVisible]);

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
        contentContainerStyle={[styles.list, { paddingBottom: listPaddingBottom }]}
        {...standardFlatListScrollProps}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.promptRow, { borderBottomColor: theme.colors.borderMuted }]}
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
          <Pressable
            style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
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
                    <Button
                      title="Change photo"
                      variant="ghost"
                      onPress={pickPhoto}
                      icon={<DSIcon name={{ ios: 'photo.on.rectangle.angled', android: 'photo_library', web: 'photo_library' }} size={16} color={theme.colors.text} />}
                      style={styles.changePhoto}
                    />
                  </>
                ) : (
                  <Button
                    title="Choose photo"
                    onPress={pickPhoto}
                    icon={<DSIcon name={{ ios: 'photo.fill.on.rectangle.fill', android: 'add_a_photo', web: 'add_a_photo' }} size={16} color="#FFFFFF" />}
                  />
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
                icon={<DSIcon name={{ ios: 'paperplane.fill', android: 'send', web: 'send' }} size={16} color="#FFFFFF" />}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Container>
  );
}

const styles = StyleSheet.create({
  list: {},
  loader: { marginTop: 24 },
  promptRow: {
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
