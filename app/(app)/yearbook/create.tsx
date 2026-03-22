import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Alert, Image, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import { createYearbook } from '@/src/services/firestore';
import { generateYearbookVisualOptions } from '@/src/services/openai';
import { isOpenAIConfigured } from '@/src/config/openai';
import { logger } from '@/src/utils/logger';
import { BrandLogo, DSIcon } from '@/src/design-system';
import { Container, Button, Input, Text, DatePickerField } from '@/src/components/ui';
import { addMonths, toISODateString } from '@/src/utils/dateFormat';

export default function CreateYearbookScreen() {
  const { userId } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const defaultDue = useMemo(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return toISODateString(addMonths(d, 1));
  }, []);
  const [dueDate, setDueDate] = useState(defaultDue);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatedUrls, setGeneratedUrls] = useState<string[]>([]);
  const [selectedAiUrl, setSelectedAiUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);

  const minimumDueDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    try {
      const urls = await generateYearbookVisualOptions(aiPrompt.trim(), 4);
      setGeneratedUrls(urls);
      setSelectedAiUrl(urls[0] ?? null);
    } catch (e) {
      logger.error('CreateYearbook', 'generateYearbookVisualOptions failed', e);
      Alert.alert('Error', e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || !userId) return;
    setLoading(true);
    try {
      const id = await createYearbook(userId, {
        name: name.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate.trim() ? dueDate.trim() : undefined,
        aiVisualUrl: selectedAiUrl ?? undefined,
      });
      setLoading(false);
      router.replace({ pathname: '/(app)/yearbook/[id]', params: { id } });
    } catch (e) {
      setLoading(false);
      logger.error('CreateYearbook', 'createYearbook failed', e);
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to create yearbook');
    }
  };

  const canCreate = name.trim();
  const openAiReady = isOpenAIConfigured();

  return (
    <View style={styles.flex}>
      <Container scroll style={styles.content}>
        <BrandLogo size="sm" tagline="launch a signature yearbook" />
        <Text variant="titleLarge" style={styles.title}>
          Create yearbook
        </Text>
        <Input
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Alpha Chi 2025"
        />
        <Input
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="What's this yearbook for?"
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
          <Text variant="label" style={styles.aiLabel}>
            AI cover visual (optional)
          </Text>
          {!openAiReady ? (
            <Text variant="caption" color="secondary" style={styles.aiSetupHint}>
              Add an OpenAI API key to enable AI cover art. Create `.env` in the project root with{' '}
              <Text variant="caption" style={styles.mono}>
                EXPO_PUBLIC_OPENAI_API_KEY=sk-…
              </Text>
              {' '}then restart Expo. See README → “OpenAI / ChatGPT API key” for step-by-step setup (platform.openai.com → API keys + billing).
            </Text>
          ) : (
            <>
              <Input
                value={aiPrompt}
                onChangeText={setAiPrompt}
                placeholder="e.g. iridescent purple gradient, polaroid collage, sorority sisterhood vibes"
                multiline
              />
              <Button
                title={generatedUrls.length ? 'Regenerate' : 'Generate options'}
                variant="outline"
                onPress={handleGenerate}
                loading={generating}
                disabled={!aiPrompt.trim()}
                icon={<DSIcon name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }} size={16} color={theme.colors.text} />}
                style={styles.genBtn}
              />
              {generatedUrls.length > 0 && (
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
              )}
            </>
          )}
        </View>
        <Button
          title="Create"
          onPress={handleCreate}
          disabled={!canCreate}
          loading={loading}
          icon={<DSIcon name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }} size={16} color="#FFFFFF" />}
          style={styles.button}
        />
      </Container>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {},
  title: { marginBottom: 24 },
  aiSection: { marginTop: 16 },
  aiLabel: { marginBottom: 8 },
  aiSetupHint: { lineHeight: 20 },
  mono: { fontFamily: 'monospace' },
  genBtn: { marginTop: 8 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
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
  button: { marginTop: 24 },
});
