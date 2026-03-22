import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Alert, Image, Pressable } from 'react-native';
import { useYearbookId } from '@/src/contexts/YearbookIdContext';
import { useYearbook } from '@/src/hooks/useYearbook';
import { updateYearbook } from '@/src/services/firestore';
import { generateYearbookVisualOptions } from '@/src/services/openai';
import { isOpenAIConfigured } from '@/src/config/openai';
import { logger } from '@/src/utils/logger';
import { DSIcon } from '@/src/design-system';
import { Container, Text, Button, Input, DatePickerField } from '@/src/components/ui';
import { useTheme } from '@/src/contexts/ThemeContext';

export default function YearbookSettingsScreen() {
  const id = useYearbookId();
  const { theme } = useTheme();
  const { yearbook, loading, refresh } = useYearbook(id);
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatedUrls, setGeneratedUrls] = useState<string[]>([]);
  const [selectedAiUrl, setSelectedAiUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const openAiReady = isOpenAIConfigured();

  const minimumDueDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  React.useEffect(() => {
    if (yearbook) {
      setDescription(yearbook.description ?? '');
      setDueDate(yearbook.dueDate ?? '');
      setSelectedAiUrl(yearbook.aiVisualUrl ?? null);
      setGeneratedUrls([]);
    }
  }, [yearbook]);

  const handleGenerateCover = async () => {
    if (!aiPrompt.trim()) {
      Alert.alert('Describe the image', 'Enter a short description for the yearbook cover.');
      return;
    }
    setGenerating(true);
    try {
      const urls = await generateYearbookVisualOptions(aiPrompt.trim(), 4);
      setGeneratedUrls(urls);
      setSelectedAiUrl(urls[0] ?? selectedAiUrl);
    } catch (e) {
      logger.error('YearbookSettings', 'generateYearbookVisualOptions failed', e);
      Alert.alert('Error', e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await updateYearbook(id, {
        description: description.trim() || undefined,
        dueDate: dueDate.trim() || undefined,
        aiVisualUrl: selectedAiUrl ?? null,
      });
      refresh();
    } finally {
      setSaving(false);
    }
  };

  if (loading || !yearbook) {
    return (
      <Container>
        <Text variant="body" color="secondary">
          Loading…
        </Text>
      </Container>
    );
  }

  return (
    <Container scroll>
      <Text variant="title" style={styles.sectionTitle}>
        Details
      </Text>
      <Input
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Yearbook description"
        multiline
      />
      <DatePickerField
        label="Due date"
        value={dueDate}
        onChange={setDueDate}
        placeholder="Select due date"
        minimumDate={minimumDueDate}
      />

      <View style={styles.aiSection}>
        <Text variant="title" style={styles.sectionTitle}>
          Yearbook cover image
        </Text>
        {selectedAiUrl ? (
          <Image source={{ uri: selectedAiUrl }} style={styles.currentCover} resizeMode="cover" />
        ) : null}
        {!openAiReady ? (
          <Text variant="caption" color="secondary" style={styles.aiSetupHint}>
            Add{' '}
            <Text variant="caption" style={styles.mono}>
              EXPO_PUBLIC_OPENAI_API_KEY
            </Text>{' '}
            to `.env` and restart Expo to generate AI covers. See README for OpenAI setup.
          </Text>
        ) : (
          <>
            <Input
              label="Describe the cover"
              value={aiPrompt}
              onChangeText={setAiPrompt}
              placeholder="e.g. Sorority house at sunset, polaroid style"
              multiline
              containerStyle={styles.inputTight}
            />
            <Button
              title={generatedUrls.length ? 'Regenerate options' : 'Generate options'}
              variant="outline"
              onPress={handleGenerateCover}
              loading={generating}
              disabled={!aiPrompt.trim()}
              icon={<DSIcon name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }} size={16} color={theme.colors.text} />}
              style={styles.genBtn}
            />
            {generatedUrls.length > 0 ? (
              <View style={styles.grid}>
                {generatedUrls.map((url) => (
                  <Pressable
                    key={url}
                    style={[
                      styles.gridItem,
                      selectedAiUrl === url && { borderColor: theme.colors.primary },
                    ]}
                    onPress={() => setSelectedAiUrl(url)}
                  >
                    <Image source={{ uri: url }} style={styles.gridImage} resizeMode="cover" />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </>
        )}
      </View>

      <Button
        title="Save changes"
        onPress={handleSave}
        loading={saving}
        icon={<DSIcon name={{ ios: 'checkmark.circle.fill', android: 'task_alt', web: 'check_circle' }} size={16} color="#FFFFFF" />}
        style={styles.saveBtn}
      />
      <Text variant="body" color="secondary" style={styles.hint}>
        Invite code: {yearbook.inviteCode}
      </Text>
    </Container>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { marginBottom: 12 },
  saveBtn: { marginTop: 16 },
  hint: { marginTop: 24 },
  aiSection: { marginTop: 8 },
  aiSetupHint: { lineHeight: 20, marginBottom: 8 },
  mono: { fontFamily: 'monospace' },
  currentCover: {
    width: '100%',
    height: 140,
    borderRadius: 16,
    marginBottom: 12,
  },
  inputTight: { marginBottom: 8 },
  genBtn: { marginTop: 4 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  gridItem: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
});
