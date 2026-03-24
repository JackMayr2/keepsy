import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Alert, Image, Pressable } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import { createYearbook, createYearbookStarterPack, updateYearbook } from '@/src/services/firestore';
import { uploadYearbookCoverFromRemoteUrl } from '@/src/services/storage';
import { shouldRehostYearbookCoverUrl } from '@/src/utils/yearbookCoverUrl';
import { generateYearbookVisualOptions } from '@/src/services/openai';
import { isOpenAIConfigured } from '@/src/config/openai';
import { logger } from '@/src/utils/logger';
import { BrandLogo, DSIcon, DeferredFullscreenLoader } from '@/src/design-system';
import { Container, Button, Input, Text, DatePickerField } from '@/src/components/ui';
import { addMonths, toISODateString } from '@/src/utils/dateFormat';
import type { YearbookType } from '@/src/types/yearbook.types';
import type { PromptType } from '@/src/types/prompt.types';

type EditablePrompt = { id: string; text: string; type: PromptType };
type EditablePoll = { id: string; question: string; options: string[] };
type StarterPack = {
  prompts: EditablePrompt[];
  polls: EditablePoll[];
  superlatives: string[];
};

const YEARBOOK_TYPES: Array<{ value: YearbookType; label: string }> = [
  { value: 'college', label: 'College' },
  { value: 'workplace', label: 'Workplace' },
  { value: 'family', label: 'Family' },
  { value: 'friends', label: 'Friends' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'sports-team', label: 'Sports team' },
  { value: 'club-org', label: 'Club / org' },
  { value: 'travel', label: 'Travel' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'other', label: 'Other' },
];

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function toEditablePrompt(text: string, type: PromptType): EditablePrompt {
  return { id: uid('p'), text, type };
}
function toEditablePoll(question: string, options: string[]): EditablePoll {
  return { id: uid('poll'), question, options };
}

function recommendedPackForType(type: YearbookType): StarterPack {
  switch (type) {
    case 'college':
      return {
        prompts: [
          toEditablePrompt('What class changed how you think?', 'text'),
          toEditablePrompt('Share a dorm/apartment memory photo', 'photo'),
          toEditablePrompt('What are you proudest of this semester?', 'text'),
          toEditablePrompt('Post a photo from your favorite campus spot', 'photo'),
          toEditablePrompt('What advice would you give incoming students?', 'text'),
          toEditablePrompt('What club or activity defined your year?', 'text'),
        ],
        polls: [
          toEditablePoll('Best study fuel?', ['Coffee', 'Tea', 'Energy drink', 'Water + snacks']),
          toEditablePoll('Most iconic campus hangout?', ['Library', 'Student center', 'Dining hall', 'Off-campus cafe']),
          toEditablePoll('Ideal finals week vibe?', ['Locked in', 'Chaotic', 'Balanced', 'Survive and thrive']),
        ],
        superlatives: [
          'Most likely to have 14 tabs open',
          'Best lecture note-taker',
          'Most likely to save the group project',
          'Most likely to become a professor',
          'Most likely to start a startup',
          'Best campus style',
        ],
      };
    case 'workplace':
      return {
        prompts: [
          toEditablePrompt('Biggest win this year?', 'text'),
          toEditablePrompt('Share a photo from your favorite team moment', 'photo'),
          toEditablePrompt('What did you learn from a challenge?', 'text'),
          toEditablePrompt('What teammate are you most grateful for and why?', 'text'),
          toEditablePrompt('Post a photo that captures your team culture', 'photo'),
          toEditablePrompt('What are you excited to build next?', 'text'),
        ],
        polls: [
          toEditablePoll('Best meeting snack?', ['Donuts', 'Fruit', 'Coffee', 'No snacks, all focus']),
          toEditablePoll('Preferred work style?', ['Deep focus blocks', 'Rapid collaboration', 'Hybrid mix', 'Depends on project']),
          toEditablePoll('Team celebration pick?', ['Lunch out', 'Happy hour', 'Activity day', 'Remote game']),
        ],
        superlatives: [
          'Most likely to fix production in 5 minutes',
          'Best presenter',
          'Most organized',
          'Most likely to answer within 2 minutes',
          'Best Slack one-liners',
          'Most likely to mentor everyone',
        ],
      };
    case 'family':
      return {
        prompts: [
          toEditablePrompt('Favorite family memory this year?', 'text'),
          toEditablePrompt('Share a family photo from this year', 'photo'),
          toEditablePrompt('What family tradition means the most to you?', 'text'),
          toEditablePrompt('Post a photo of your favorite family meal moment', 'photo'),
          toEditablePrompt('What made you laugh the hardest this year?', 'text'),
          toEditablePrompt('What are you looking forward to next year?', 'text'),
        ],
        polls: [
          toEditablePoll('Best family movie night genre?', ['Comedy', 'Action', 'Animation', 'Classic']),
          toEditablePoll('Holiday meal MVP?', ['Appetizers', 'Main dish', 'Dessert', 'Leftovers']),
          toEditablePoll('Ideal reunion activity?', ['Board games', 'Cookout', 'Outdoors', 'Story time']),
        ],
        superlatives: [
          'Best storyteller',
          'Most likely to bring snacks for everyone',
          'Funniest family member',
          'Most likely to plan the reunion',
          'Best holiday spirit',
          'Most likely to keep family traditions alive',
        ],
      };
    case 'holiday':
      return {
        prompts: [
          toEditablePrompt('Favorite holiday memory this season?', 'text'),
          toEditablePrompt('Share your best holiday photo', 'photo'),
          toEditablePrompt('What tradition do you never skip?', 'text'),
          toEditablePrompt('Post a photo of your decorations or setup', 'photo'),
          toEditablePrompt('What made this holiday season special?', 'text'),
          toEditablePrompt('What are you wishing for next year?', 'text'),
        ],
        polls: [
          toEditablePoll('Best holiday drink?', ['Hot cocoa', 'Cider', 'Coffee', 'Tea']),
          toEditablePoll('Top holiday soundtrack vibe?', ['Classics', 'Pop', 'Instrumental', 'Mix playlist']),
          toEditablePoll('Gift wrapping style?', ['Perfectly wrapped', 'Minimal', 'Gift bag', 'Chaos mode']),
        ],
        superlatives: [
          'Most festive',
          'Best gift giver',
          'Most likely to start singing carols',
          'Best cookie baker',
          'Most likely to wear matching pajamas',
          'Most likely to keep the lights up the longest',
        ],
      };
    default:
      return {
        prompts: [
          toEditablePrompt('What was your favorite moment this year?', 'text'),
          toEditablePrompt('Share a photo that captures the vibe', 'photo'),
          toEditablePrompt('What are you most proud of?', 'text'),
          toEditablePrompt('Post a candid photo everyone will love', 'photo'),
          toEditablePrompt('What is one thing you learned this year?', 'text'),
          toEditablePrompt('What should we remember most about this chapter?', 'text'),
        ],
        polls: [
          toEditablePoll('Best way to celebrate?', ['Dinner', 'Party', 'Trip', 'Chill night']),
          toEditablePoll('Favorite group activity?', ['Photos', 'Games', 'Food', 'Adventure']),
          toEditablePoll('How would you describe this year?', ['Iconic', 'Chaotic', 'Growth', 'Unforgettable']),
        ],
        superlatives: [
          'Most likely to make everyone laugh',
          'Best dressed',
          'Most likely to organize the next event',
          'Most likely to hype everyone up',
          'Most likely to become famous',
          'Most unforgettable vibe',
        ],
      };
  }
}

export default function CreateYearbookScreen() {
  const { userId } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [type, setType] = useState<YearbookType>('friends');
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

  const [prompts, setPrompts] = useState<EditablePrompt[]>([]);
  const [polls, setPolls] = useState<EditablePoll[]>([]);
  const [superlatives, setSuperlatives] = useState<string[]>([]);

  const [newPromptText, setNewPromptText] = useState('');
  const [newPromptType, setNewPromptType] = useState<PromptType>('text');
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollOptions, setNewPollOptions] = useState('');
  const [newSuperlative, setNewSuperlative] = useState('');

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
      if (!selectedAiUrl) setSelectedAiUrl(urls[0] ?? null);
    } catch (e) {
      logger.error('CreateYearbook', 'generateYearbookVisualOptions failed', e);
      Alert.alert('Error', e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handlePickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to choose a cover image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]) return;
    setSelectedAiUrl(result.assets[0].uri);
  };

  const handleStepTwo = () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please give your yearbook a name first.');
      return;
    }
    const pack = recommendedPackForType(type);
    setPrompts(pack.prompts);
    setPolls(pack.polls);
    setSuperlatives(pack.superlatives);
    setStep(2);
  };

  const addPrompt = () => {
    const text = newPromptText.trim();
    if (!text) return;
    setPrompts((prev) => [...prev, toEditablePrompt(text, newPromptType)]);
    setNewPromptText('');
  };

  const addPoll = () => {
    const question = newPollQuestion.trim();
    const options = newPollOptions
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    if (!question || options.length < 2) {
      Alert.alert('Invalid poll', 'Add a question and at least two comma-separated options.');
      return;
    }
    setPolls((prev) => [...prev, toEditablePoll(question, options)]);
    setNewPollQuestion('');
    setNewPollOptions('');
  };

  const addSuperlative = () => {
    const text = newSuperlative.trim();
    if (!text) return;
    setSuperlatives((prev) => [...prev, text]);
    setNewSuperlative('');
  };

  const handleCreate = async () => {
    if (!name.trim() || !userId) return;
    setLoading(true);
    try {
      const id = await createYearbook(
        userId,
        {
          name: name.trim(),
          type,
          description: description.trim() || undefined,
          dueDate: dueDate.trim() ? dueDate.trim() : undefined,
          aiVisualUrl: null,
        },
        { seedDefaults: false }
      );

      await createYearbookStarterPack(id, {
        prompts: prompts.map((p) => ({ text: p.text, type: p.type })),
        polls: polls.map((p) => ({ question: p.question, options: p.options })),
        superlatives,
      });

      if (selectedAiUrl) {
        try {
          let permanent = selectedAiUrl;
          const isLocalUri = selectedAiUrl.startsWith('file:') || selectedAiUrl.startsWith('content:');
          if (isLocalUri || shouldRehostYearbookCoverUrl(selectedAiUrl)) {
            permanent = await uploadYearbookCoverFromRemoteUrl(id, selectedAiUrl);
          }
          await updateYearbook(id, { aiVisualUrl: permanent });
        } catch (persistErr) {
          logger.error('CreateYearbook', 'Could not persist cover to Storage', persistErr);
          Alert.alert(
            'Yearbook created',
            'We could not save your selected cover. You can set it later from yearbook settings.'
          );
        }
      }

      setLoading(false);
      router.replace({ pathname: '/(app)/yearbook/[id]', params: { id } });
    } catch (e) {
      setLoading(false);
      logger.error('CreateYearbook', 'createYearbook failed', e);
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to create yearbook');
    }
  };

  const openAiReady = isOpenAIConfigured();
  const createBusy = generating || loading;

  return (
    <View style={styles.flex}>
      <DeferredFullscreenLoader active={createBusy} />
      <Container scroll style={styles.content}>
        <BrandLogo size="sm" tagline="launch a signature yearbook" />
        <Text variant="titleLarge" style={styles.title}>
          {step === 1 ? 'Create yearbook' : 'Build your starter pack'}
        </Text>

        {step === 1 ? (
          <>
            <Input
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Alpha Chi 2025"
            />
            <View style={styles.typeSection}>
              <Text variant="label" style={styles.typeLabel}>
                Type
              </Text>
              <View style={styles.typeWrap}>
                {YEARBOOK_TYPES.map((option) => {
                  const selected = option.value === type;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setType(option.value)}
                      style={[
                        styles.typeChip,
                        {
                          borderColor: selected ? theme.colors.primary : theme.colors.borderMuted,
                          backgroundColor: selected ? theme.colors.surfaceSecondary : theme.colors.surface,
                        },
                      ]}
                    >
                      <Text
                        variant="caption"
                        style={{
                          color: selected ? theme.colors.primary : theme.colors.text,
                          fontWeight: selected ? '700' : '600',
                        }}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
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
                Cover visual (optional)
              </Text>
              <Button
                title={selectedAiUrl ? 'Change from camera roll' : 'Choose from camera roll'}
                variant="outline"
                onPress={handlePickFromLibrary}
                icon={<DSIcon name={{ ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo' }} size={16} color={theme.colors.text} />}
              />

              {openAiReady ? (
                <>
                  <Input
                    value={aiPrompt}
                    onChangeText={setAiPrompt}
                    placeholder="e.g. warm collage of film photos and notebooks"
                    multiline
                  />
                  <Button
                    title={generatedUrls.length ? 'Regenerate AI options' : 'Generate AI options'}
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
              ) : (
                <Text variant="caption" color="secondary" style={styles.aiSetupHint}>
                  Want AI options too? Add an OpenAI API key in `.env` using EXPO_PUBLIC_OPENAI_API_KEY.
                </Text>
              )}

              {selectedAiUrl ? (
                <View style={styles.selectedWrap}>
                  <Text variant="caption" color="secondary" style={styles.selectedLabel}>
                    Selected cover
                  </Text>
                  <View style={[styles.selectedPreview, { borderColor: theme.colors.primary }]}>
                    <Image source={{ uri: selectedAiUrl }} style={styles.gridImage} resizeMode="cover" />
                  </View>
                </View>
              ) : null}
            </View>

            <Button
              title="Next: Review starter pack"
              onPress={handleStepTwo}
              iconAfter={<DSIcon name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }} size={16} color="#FFFFFF" />}
              style={styles.button}
            />
          </>
        ) : (
          <>
            <Text variant="body" color="secondary" style={styles.stepHint}>
              We recommended a {YEARBOOK_TYPES.find((x) => x.value === type)?.label ?? 'custom'} starter pack. Remove anything you do not want and add your own.
            </Text>

            <View style={styles.sectionBlock}>
              <Text variant="label" style={styles.sectionTitle}>Prompts</Text>
              {prompts.map((p) => (
                <View key={p.id} style={[styles.itemRow, { borderColor: theme.colors.borderMuted }]}> 
                  <View style={styles.itemTextWrap}>
                    <Text variant="body">{p.text}</Text>
                    <Text variant="caption" color="secondary">{p.type === 'photo' ? 'Photo prompt' : 'Text prompt'}</Text>
                  </View>
                  <Pressable onPress={() => setPrompts((prev) => prev.filter((x) => x.id !== p.id))} hitSlop={8}>
                    <DSIcon name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={18} color={theme.colors.textMuted} />
                  </Pressable>
                </View>
              ))}
              <Input placeholder="Add custom prompt" value={newPromptText} onChangeText={setNewPromptText} />
              <View style={styles.inlineRow}>
                <Pressable onPress={() => setNewPromptType('text')} style={[styles.smallChip, { borderColor: newPromptType === 'text' ? theme.colors.primary : theme.colors.borderMuted }]}>
                  <Text variant="caption" style={{ color: newPromptType === 'text' ? theme.colors.primary : theme.colors.text }}>Text</Text>
                </Pressable>
                <Pressable onPress={() => setNewPromptType('photo')} style={[styles.smallChip, { borderColor: newPromptType === 'photo' ? theme.colors.primary : theme.colors.borderMuted }]}>
                  <Text variant="caption" style={{ color: newPromptType === 'photo' ? theme.colors.primary : theme.colors.text }}>Photo</Text>
                </Pressable>
                <Button title="Add" compact variant="outline" onPress={addPrompt} />
              </View>
            </View>

            <View style={styles.sectionBlock}>
              <Text variant="label" style={styles.sectionTitle}>Polls</Text>
              {polls.map((p) => (
                <View key={p.id} style={[styles.itemRow, { borderColor: theme.colors.borderMuted }]}> 
                  <View style={styles.itemTextWrap}>
                    <Text variant="body">{p.question}</Text>
                    <Text variant="caption" color="secondary">{p.options.join(' • ')}</Text>
                  </View>
                  <Pressable onPress={() => setPolls((prev) => prev.filter((x) => x.id !== p.id))} hitSlop={8}>
                    <DSIcon name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={18} color={theme.colors.textMuted} />
                  </Pressable>
                </View>
              ))}
              <Input placeholder="Poll question" value={newPollQuestion} onChangeText={setNewPollQuestion} />
              <Input placeholder="Options (comma-separated)" value={newPollOptions} onChangeText={setNewPollOptions} />
              <Button title="Add poll" compact variant="outline" onPress={addPoll} />
            </View>

            <View style={styles.sectionBlock}>
              <Text variant="label" style={styles.sectionTitle}>Superlatives</Text>
              {superlatives.map((s, idx) => (
                <View key={`${s}_${idx}`} style={[styles.itemRow, { borderColor: theme.colors.borderMuted }]}> 
                  <View style={styles.itemTextWrap}>
                    <Text variant="body">{s}</Text>
                  </View>
                  <Pressable onPress={() => setSuperlatives((prev) => prev.filter((_, i) => i !== idx))} hitSlop={8}>
                    <DSIcon name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={18} color={theme.colors.textMuted} />
                  </Pressable>
                </View>
              ))}
              <View style={styles.inlineRow}>
                <View style={styles.inlineGrow}>
                  <Input placeholder="Add superlative category" value={newSuperlative} onChangeText={setNewSuperlative} />
                </View>
                <Button title="Add" compact variant="outline" onPress={addSuperlative} />
              </View>
            </View>

            <View style={styles.footerRow}>
              <Button
                title="Back"
                variant="outline"
                onPress={() => setStep(1)}
                icon={<DSIcon name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={16} color={theme.colors.text} />}
                style={styles.footerBtn}
              />
              <Button
                title="Create yearbook"
                onPress={handleCreate}
                loading={loading}
                icon={<DSIcon name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }} size={16} color="#FFFFFF" />}
                style={styles.footerBtn}
              />
            </View>
          </>
        )}
      </Container>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {},
  title: { marginBottom: 16 },
  stepHint: { marginBottom: 14, lineHeight: 20 },
  typeSection: { marginBottom: 8 },
  typeLabel: { marginBottom: 8 },
  typeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  aiSection: { marginTop: 16 },
  aiLabel: { marginBottom: 8 },
  aiSetupHint: { lineHeight: 20, marginTop: 10 },
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
  selectedWrap: { marginTop: 12 },
  selectedLabel: { marginBottom: 6 },
  selectedPreview: {
    width: 132,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
  },
  button: { marginTop: 24 },
  sectionBlock: { marginTop: 18, gap: 8 },
  sectionTitle: { marginBottom: 2 },
  itemRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemTextWrap: { flex: 1 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineGrow: { flex: 1 },
  smallChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  footerRow: {
    marginTop: 24,
    flexDirection: 'row',
    gap: 10,
  },
  footerBtn: { flex: 1 },
});
