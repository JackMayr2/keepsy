import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Modal,
  Pressable,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { useYearbookId } from '@/src/contexts/YearbookIdContext';
import { useYearbookNav, useScrollToHideNav } from '@/src/contexts/YearbookNavContext';
import { usePrompts } from '@/src/hooks/usePrompts';
import { saveDraft, getSubmissionsForPrompt } from '@/src/services/firestore';
import { uploadPromptImage } from '@/src/services/storage';
import { logger } from '@/src/utils/logger';
import { DSIcon, DeferredFullscreenLoader, KeepsyBookLoader } from '@/src/design-system';
import { Container, Text, Button, Input } from '@/src/components/ui';
import { AppKeyboardAwareScrollView } from '@/src/components/ui/AppKeyboardAwareScrollView';
import { standardFlatListScrollProps, TAB_BAR_CONTENT_HEIGHT } from '@/src/design-system';
import type { Prompt, Draft } from '@/src/types/prompt.types';
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
  const [submissions, setSubmissions] = useState<Draft[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

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

  const openModal = async (item: Prompt) => {
    setSelected(item);
    setAnswer('');
    setPhotoUri(null);
    setSubmissions([]);
    if (id) {
      setLoadingSubmissions(true);
      try {
        const list = await getSubmissionsForPrompt(id, item.id);
        setSubmissions(list);
      } finally {
        setLoadingSubmissions(false);
      }
    }
  };

  if (loading) {
    return (
      <Container>
        <DeferredFullscreenLoader active />
      </Container>
    );
  }

  const asyncBusy = saving || loadingSubmissions;

  return (
    <Container>
      <DeferredFullscreenLoader active={asyncBusy} />
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
            <AppKeyboardAwareScrollView
              showsVerticalScrollIndicator={false}
              extraScrollHeight={120}
              contentContainerStyle={styles.modalScrollContent}
            >
            <Text variant="title" style={styles.modalTitle}>
              {selected?.text}
            </Text>
            {submissions.length > 0 && (
              <View style={styles.submissionsSection}>
                <Text variant="label" color="secondary" style={styles.submissionsLabel}>
                  Answers from yearbook ({submissions.length})
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.submissionsScroll}>
                  {submissions.map((s) => (
                    <View key={s.id} style={[styles.submissionChip, { backgroundColor: theme.colors.surfaceSecondary }]}>
                      {s.photoURL ? (
                        <Image source={{ uri: s.photoURL }} style={styles.submissionThumb} />
                      ) : null}
                      {s.content ? (
                        <Text variant="caption" numberOfLines={2} style={styles.submissionText}>
                          {s.content}
                        </Text>
                      ) : s.photoURL ? (
                        <Text variant="caption" color="secondary">Photo</Text>
                      ) : null}
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
            {loadingSubmissions && (
              <View style={styles.submissionsLoader}>
                <KeepsyBookLoader size={24} />
              </View>
            )}
            <Text variant="label" color="secondary" style={styles.yourAnswerLabel}>
              Your answer
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
            </AppKeyboardAwareScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Container>
  );
}

const styles = StyleSheet.create({
  list: {},
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
    maxHeight: '90%',
  },
  modalScrollContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  modalTitle: { marginBottom: 16 },
  photoSection: { marginVertical: 8 },
  previewImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: 12, marginBottom: 12 },
  changePhoto: { alignSelf: 'flex-start' },
  submissionsSection: { marginBottom: 16 },
  submissionsLabel: { marginBottom: 8 },
  submissionsScroll: { marginHorizontal: -24 },
  submissionChip: {
    width: 120,
    borderRadius: 12,
    padding: 8,
    marginRight: 8,
    overflow: 'hidden',
  },
  submissionThumb: { width: '100%', height: 72, borderRadius: 8, marginBottom: 6 },
  submissionText: {},
  submissionsLoader: { marginVertical: 8, alignItems: 'center' },
  yourAnswerLabel: { marginBottom: 8 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
});
