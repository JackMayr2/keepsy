import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Alert, Image, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { useYearbookId } from '@/src/contexts/YearbookIdContext';
import { useYearbook } from '@/src/hooks/useYearbook';
import {
  createPollForYearbook,
  createPromptForYearbook,
  createSuperlativeForYearbook,
  deletePollAndVotes,
  deletePromptAndDrafts,
  deleteSuperlativeById,
  getMemberRole,
  getPolls,
  getPrompts,
  getSuperlatives,
  getUser,
  getYearbookMembers,
  leaveYearbook,
  removeYearbookMemberByCreator,
  updateYearbook,
  updateYearbookMemberRoleByCreator,
} from '@/src/services/firestore';
import { isTutorialYearbook } from '@/src/tutorial/constants';
import type { YearbookMember, YearbookMemberRole } from '@/src/types/yearbook.types';
import type { Prompt, PromptType } from '@/src/types/prompt.types';
import { uploadYearbookCoverFromRemoteUrl } from '@/src/services/storage';
import { shouldRehostYearbookCoverUrl } from '@/src/utils/yearbookCoverUrl';
import { generateYearbookVisualOptions } from '@/src/services/openai';
import { isOpenAIConfigured } from '@/src/config/openai';
import { logger } from '@/src/utils/logger';
import { DSIcon, DeferredFullscreenLoader } from '@/src/design-system';
import { Container, Text, Button, Input, DatePickerField } from '@/src/components/ui';
import { useTheme } from '@/src/contexts/ThemeContext';

export default function YearbookSettingsScreen() {
  const id = useYearbookId();
  const router = useRouter();
  const { userId } = useAuth();
  const { theme } = useTheme();
  const { yearbook, loading, refresh } = useYearbook(id);
  const [myRole, setMyRole] = useState<YearbookMemberRole | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatedUrls, setGeneratedUrls] = useState<string[]>([]);
  const [selectedAiUrl, setSelectedAiUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const openAiReady = isOpenAIConfigured();

  const [members, setMembers] = useState<YearbookMember[]>([]);
  const [memberLabels, setMemberLabels] = useState<Record<string, string>>({});
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [promptsList, setPromptsList] = useState<Prompt[]>([]);
  const [pollsList, setPollsList] = useState<Array<{ id: string; question: string; options: string[] }>>([]);
  const [superlativesList, setSuperlativesList] = useState<Array<{ id: string; category: string }>>([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [newPromptText, setNewPromptText] = useState('');
  const [newPromptType, setNewPromptType] = useState<PromptType>('text');
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollOptions, setNewPollOptions] = useState('');
  const [newSuperlative, setNewSuperlative] = useState('');
  const [memberBusyId, setMemberBusyId] = useState<string | null>(null);

  const isCreator = yearbook != null && userId != null && yearbook.createdBy === userId;
  const canEditContent = myRole === 'creator' || myRole === 'admin';

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

  useEffect(() => {
    if (!id || !userId) {
      setMyRole(null);
      return;
    }
    getMemberRole(id, userId).then(setMyRole);
  }, [id, userId]);

  const loadMembers = useCallback(async () => {
    if (!id || !isCreator) return;
    setLoadingMembers(true);
    try {
      const list = await getYearbookMembers(id);
      setMembers(list);
      const labels: Record<string, string> = {};
      await Promise.all(
        list.map(async (m) => {
          try {
            const u = await getUser(m.userId);
            labels[m.userId] = u
              ? [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email || 'Member'
              : 'Member';
          } catch {
            labels[m.userId] = 'Member';
          }
        })
      );
      setMemberLabels(labels);
    } catch (e) {
      logger.error('YearbookSettings', 'loadMembers failed', e);
    } finally {
      setLoadingMembers(false);
    }
  }, [id, isCreator]);

  const loadStarterContent = useCallback(async () => {
    if (!id || !canEditContent) return;
    setLoadingContent(true);
    try {
      const [p, po, s] = await Promise.all([getPrompts(id), getPolls(id), getSuperlatives(id)]);
      setPromptsList(p);
      setPollsList(po);
      setSuperlativesList(s.map((x) => ({ id: x.id, category: x.category })));
    } catch (e) {
      logger.error('YearbookSettings', 'loadStarterContent failed', e);
    } finally {
      setLoadingContent(false);
    }
  }, [id, canEditContent]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    loadStarterContent();
  }, [loadStarterContent]);

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
      let visual: string | null = selectedAiUrl ?? null;
      if (visual && shouldRehostYearbookCoverUrl(visual)) {
        try {
          visual = await uploadYearbookCoverFromRemoteUrl(id, visual);
        } catch (persistErr) {
          logger.error('YearbookSettings', 'Cover upload to Storage failed', persistErr);
          Alert.alert(
            'Cover not updated',
            'We couldn’t upload that image to storage, so your previous cover is unchanged. Please try again.'
          );
          visual = yearbook?.aiVisualUrl ?? null;
        }
      }
      await updateYearbook(id, {
        description: description.trim() || undefined,
        dueDate: dueDate.trim() || undefined,
        aiVisualUrl: visual,
      });
      setSelectedAiUrl(visual);
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const promoteToAdmin = async (targetUserId: string) => {
    if (!id || !userId) return;
    setMemberBusyId(targetUserId);
    try {
      await updateYearbookMemberRoleByCreator(id, userId, targetUserId, 'admin');
      await loadMembers();
      refresh();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not promote member');
    } finally {
      setMemberBusyId(null);
    }
  };

  const demoteFromAdmin = async (targetUserId: string) => {
    if (!id || !userId) return;
    setMemberBusyId(targetUserId);
    try {
      await updateYearbookMemberRoleByCreator(id, userId, targetUserId, 'member');
      await loadMembers();
      refresh();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not update role');
    } finally {
      setMemberBusyId(null);
    }
  };

  const confirmRemoveMember = (targetUserId: string, displayName: string) => {
    Alert.alert(
      `Remove ${displayName}?`,
      'They will lose access to this yearbook until invited again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!id || !userId) return;
            setMemberBusyId(targetUserId);
            try {
              await removeYearbookMemberByCreator(id, userId, targetUserId);
              await loadMembers();
              refresh();
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Could not remove member');
            } finally {
              setMemberBusyId(null);
            }
          },
        },
      ]
    );
  };

  const handleAddPrompt = async () => {
    if (!id) return;
    const text = newPromptText.trim();
    if (!text) return;
    try {
      await createPromptForYearbook(id, text, newPromptType);
      setNewPromptText('');
      await loadStarterContent();
      refresh();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not add prompt');
    }
  };

  const handleDeletePrompt = (promptId: string, label: string) => {
    Alert.alert(
      'Delete prompt?',
      `“${label}” will be removed. Drafts and submissions for this prompt will be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePromptAndDrafts(promptId);
              await loadStarterContent();
              refresh();
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Could not delete prompt');
            }
          },
        },
      ]
    );
  };

  const handleAddPoll = async () => {
    if (!id) return;
    const question = newPollQuestion.trim();
    const options = newPollOptions
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    if (!question || options.length < 2) {
      Alert.alert('Invalid poll', 'Add a question and at least two comma-separated options.');
      return;
    }
    try {
      await createPollForYearbook(id, question, options);
      setNewPollQuestion('');
      setNewPollOptions('');
      await loadStarterContent();
      refresh();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not add poll');
    }
  };

  const handleDeletePoll = (pollId: string, label: string) => {
    Alert.alert(
      'Delete poll?',
      `“${label}” and all votes for it will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePollAndVotes(pollId);
              await loadStarterContent();
              refresh();
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Could not delete poll');
            }
          },
        },
      ]
    );
  };

  const handleAddSuperlative = async () => {
    if (!id) return;
    const text = newSuperlative.trim();
    if (!text) return;
    try {
      await createSuperlativeForYearbook(id, text);
      setNewSuperlative('');
      await loadStarterContent();
      refresh();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not add category');
    }
  };

  const handleDeleteSuperlative = (superlativeId: string, label: string) => {
    Alert.alert(
      'Delete superlative?',
      `“${label}” and its nominations will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSuperlativeById(superlativeId);
              await loadStarterContent();
              refresh();
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Could not delete category');
            }
          },
        },
      ]
    );
  };

  if (loading || !yearbook) {
    return (
      <Container>
        <DeferredFullscreenLoader active />
      </Container>
    );
  }

  if (isTutorialYearbook(id)) {
    return (
      <Container scroll>
        <Text variant="title" style={styles.sectionTitle}>
          Tutorial yearbook
        </Text>
        <Text variant="body" color="secondary" style={styles.tutorialSettingsHint}>
          This shared demo uses sample friends so you can explore Keepsy. Your own answers and trips are
          saved, but admin tools are disabled here.
        </Text>
        <Button
          title="Back to home"
          variant="outline"
          onPress={() => router.replace('/(app)/(tabs)')}
          icon={<DSIcon name={{ ios: 'house.fill', android: 'home', web: 'home' }} size={16} color={theme.colors.text} />}
          style={styles.saveBtn}
        />
      </Container>
    );
  }

  const settingsBusy = generating || saving;

  return (
    <Container scroll>
      <DeferredFullscreenLoader active={settingsBusy} />
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

      {isCreator ? (
        <View style={[styles.manageSection, { borderTopColor: theme.colors.borderMuted }]}>
          <Text variant="title" style={styles.manageTitle}>
            Members
          </Text>
          <Text variant="caption" color="secondary" style={styles.manageHint}>
            Promote people to admin or remove them from the yearbook.
          </Text>
          {loadingMembers ? (
            <Text variant="caption" color="secondary">
              Loading…
            </Text>
          ) : (
            members.map((m) => {
              const name = memberLabels[m.userId] ?? 'Member';
              const isSelf = m.userId === userId;
              const display = isSelf ? `${name} (you)` : name;
              const roleLabel =
                m.role === 'creator' ? 'Creator' : m.role === 'admin' ? 'Admin' : 'Member';
              const busy = memberBusyId === m.userId;
              return (
                <View
                  key={m.id}
                  style={[styles.memberCard, { borderColor: theme.colors.borderMuted }]}
                >
                  <View style={styles.memberHeaderRow}>
                    <View style={styles.itemTextWrap}>
                      <Text variant="body">{display}</Text>
                      <Text variant="caption" color="secondary">
                        {roleLabel}
                      </Text>
                    </View>
                  </View>
                  {m.role !== 'creator' ? (
                    <View style={styles.memberActionsRow}>
                      {m.role === 'member' ? (
                        <Button
                          compact
                          title="Make admin"
                          variant="outline"
                          disabled={busy}
                          onPress={() => promoteToAdmin(m.userId)}
                        />
                      ) : null}
                      {m.role === 'admin' ? (
                        <Button
                          compact
                          title="Remove admin"
                          variant="outline"
                          disabled={busy}
                          onPress={() => demoteFromAdmin(m.userId)}
                        />
                      ) : null}
                      <Button
                        compact
                        title="Remove"
                        variant="outline"
                        disabled={busy}
                        onPress={() => confirmRemoveMember(m.userId, name)}
                      />
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      ) : null}

      {canEditContent ? (
        <View style={[styles.manageSection, { borderTopColor: theme.colors.borderMuted }]}>
          <Text variant="title" style={styles.manageTitle}>
            Prompts, polls & superlatives
          </Text>
          <Text variant="caption" color="secondary" style={styles.manageHint}>
            Add or remove items. Deleting a prompt also removes drafts for that prompt.
          </Text>
          {loadingContent ? (
            <Text variant="caption" color="secondary">
              Loading…
            </Text>
          ) : (
            <>
              <View style={styles.sectionBlock}>
                <Text variant="label" style={styles.blockLabel}>
                  Prompts
                </Text>
                {promptsList.map((p) => (
                  <View
                    key={p.id}
                    style={[styles.itemRow, { borderColor: theme.colors.borderMuted }]}
                  >
                    <View style={styles.itemTextWrap}>
                      <Text variant="body">{p.text}</Text>
                      <Text variant="caption" color="secondary">
                        {p.type === 'photo' ? 'Photo prompt' : 'Text prompt'}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleDeletePrompt(p.id, p.text)}
                      hitSlop={8}
                      accessibilityLabel="Delete prompt"
                    >
                      <DSIcon
                        name={{ ios: 'trash', android: 'delete', web: 'delete' }}
                        size={18}
                        color={theme.colors.textMuted}
                      />
                    </Pressable>
                  </View>
                ))}
                <Input
                  placeholder="Add custom prompt"
                  value={newPromptText}
                  onChangeText={setNewPromptText}
                />
                <View style={styles.inlineRow}>
                  <Pressable
                    onPress={() => setNewPromptType('text')}
                    style={[
                      styles.smallChip,
                      { borderColor: newPromptType === 'text' ? theme.colors.primary : theme.colors.borderMuted },
                    ]}
                  >
                    <Text
                      variant="caption"
                      style={{ color: newPromptType === 'text' ? theme.colors.primary : theme.colors.text }}
                    >
                      Text
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setNewPromptType('photo')}
                    style={[
                      styles.smallChip,
                      { borderColor: newPromptType === 'photo' ? theme.colors.primary : theme.colors.borderMuted },
                    ]}
                  >
                    <Text
                      variant="caption"
                      style={{ color: newPromptType === 'photo' ? theme.colors.primary : theme.colors.text }}
                    >
                      Photo
                    </Text>
                  </Pressable>
                  <Button title="Add" compact variant="outline" onPress={handleAddPrompt} />
                </View>
              </View>

              <View style={styles.sectionBlock}>
                <Text variant="label" style={styles.blockLabel}>
                  Polls
                </Text>
                {pollsList.map((p) => (
                  <View
                    key={p.id}
                    style={[styles.itemRow, { borderColor: theme.colors.borderMuted }]}
                  >
                    <View style={styles.itemTextWrap}>
                      <Text variant="body">{p.question}</Text>
                      <Text variant="caption" color="secondary">
                        {p.options.join(' • ')}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleDeletePoll(p.id, p.question)}
                      hitSlop={8}
                      accessibilityLabel="Delete poll"
                    >
                      <DSIcon
                        name={{ ios: 'trash', android: 'delete', web: 'delete' }}
                        size={18}
                        color={theme.colors.textMuted}
                      />
                    </Pressable>
                  </View>
                ))}
                <Input
                  placeholder="Poll question"
                  value={newPollQuestion}
                  onChangeText={setNewPollQuestion}
                />
                <Input
                  placeholder="Options (comma-separated)"
                  value={newPollOptions}
                  onChangeText={setNewPollOptions}
                />
                <Button title="Add poll" compact variant="outline" onPress={handleAddPoll} />
              </View>

              <View style={styles.sectionBlock}>
                <Text variant="label" style={styles.blockLabel}>
                  Superlatives
                </Text>
                {superlativesList.map((s) => (
                  <View
                    key={s.id}
                    style={[styles.itemRow, { borderColor: theme.colors.borderMuted }]}
                  >
                    <View style={styles.itemTextWrap}>
                      <Text variant="body">{s.category}</Text>
                    </View>
                    <Pressable
                      onPress={() => handleDeleteSuperlative(s.id, s.category)}
                      hitSlop={8}
                      accessibilityLabel="Delete superlative"
                    >
                      <DSIcon
                        name={{ ios: 'trash', android: 'delete', web: 'delete' }}
                        size={18}
                        color={theme.colors.textMuted}
                      />
                    </Pressable>
                  </View>
                ))}
                <Input
                  placeholder="Add superlative category"
                  value={newSuperlative}
                  onChangeText={setNewSuperlative}
                />
                <Button title="Add superlative" compact variant="outline" onPress={handleAddSuperlative} />
              </View>
            </>
          )}
        </View>
      ) : null}

      {myRole && myRole !== 'creator' && userId ? (
        <View style={[styles.leaveSection, { borderTopColor: theme.colors.borderMuted }]}>
          <Text variant="label" color="secondary" style={styles.leaveLabel}>
            Membership
          </Text>
          <Button
            title={leaving ? 'Leaving…' : 'Leave yearbook'}
            variant="outline"
            onPress={() => {
              Alert.alert(
                'Leave yearbook?',
                `You will leave "${yearbook.name}". You can rejoin with an invite code.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Leave',
                    style: 'destructive',
                    onPress: async () => {
                      setLeaving(true);
                      try {
                        await leaveYearbook(id!, userId);
                        router.replace('/(app)/(tabs)');
                      } catch (e) {
                        logger.error('YearbookSettings', 'leave failed', e);
                        Alert.alert('Error', 'Could not leave this yearbook. Try again.');
                      } finally {
                        setLeaving(false);
                      }
                    },
                  },
                ]
              );
            }}
            disabled={leaving}
            style={styles.leaveBtn}
          />
        </View>
      ) : null}
    </Container>
  );
}

const styles = StyleSheet.create({
  tutorialSettingsHint: { lineHeight: 22, marginBottom: 16 },
  sectionTitle: { marginBottom: 12 },
  manageSection: { marginTop: 28, paddingTop: 24, borderTopWidth: 1 },
  manageTitle: { marginBottom: 8 },
  manageHint: { marginBottom: 14, lineHeight: 18 },
  memberCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 10,
  },
  memberHeaderRow: { flexDirection: 'row', alignItems: 'flex-start' },
  memberActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  sectionBlock: { marginTop: 4, gap: 8 },
  blockLabel: { marginBottom: 4 },
  itemRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemTextWrap: { flex: 1 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  smallChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  saveBtn: { marginTop: 16 },
  hint: { marginTop: 24 },
  leaveSection: { marginTop: 32, paddingTop: 24, borderTopWidth: 1 },
  leaveLabel: { marginBottom: 10 },
  leaveBtn: { alignSelf: 'flex-start' },
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
