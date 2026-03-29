import React, { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useYearbookId } from '@/src/contexts/YearbookIdContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { useYearbookPermissions } from '@/src/hooks/useYearbookPermissions';
import {
  finalizeCompilationAndExport,
  getLatestCompilationForYearbook,
  updateCompilationEditorialDraft,
} from '@/src/services/firestore';
import { Container, Button, Text } from '@/src/components/ui';
import { DeferredFullscreenLoader, DSIcon } from '@/src/design-system';

export default function YearbookEditorScreen() {
  const id = useYearbookId();
  const { userId } = useAuth();
  const router = useRouter();
  const { canModerate, phase } = useYearbookPermissions(id);
  const [loading, setLoading] = useState(false);
  const [compilationId, setCompilationId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const desktopOnlyHint = useMemo(
    () => Platform.OS !== 'web',
    []
  );

  const loadLatest = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const latest = await getLatestCompilationForYearbook(id);
      setCompilationId(latest?.id ?? null);
      setNotes(latest?.editorNotes ?? '');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not load draft');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadLatest();
  }, [id]);

  const handleSaveEditorialDraft = async () => {
    if (!compilationId || !userId) return;
    setLoading(true);
    try {
      await updateCompilationEditorialDraft(compilationId, userId, {
        editorNotes: notes.trim(),
      });
      Alert.alert('Saved', 'Editorial notes saved.');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save edits');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAndExport = async () => {
    if (!compilationId || !userId) return;
    setLoading(true);
    try {
      await finalizeCompilationAndExport(compilationId, userId);
      Alert.alert('Export started', 'Your yearbook is being archived and exported.');
      router.replace({ pathname: '/(app)/yearbook/[id]/settings', params: { id: id ?? '' } });
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not finalize export');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container scroll>
      <DeferredFullscreenLoader active={loading} />
      <Text variant="title">Yearbook editor</Text>
      <Text variant="caption" color="secondary" style={styles.subtitle}>
        Phase: {phase}
      </Text>
      {!canModerate ? (
        <Text variant="body" color="secondary">
          Only creators/admins can use the editorial workspace.
        </Text>
      ) : null}
      {desktopOnlyHint ? (
        <Text variant="body" color="secondary" style={styles.warn}>
          This workflow is optimized for desktop web. You can still review status here.
        </Text>
      ) : null}
      <View style={styles.card}>
        <Text variant="label">Draft controls</Text>
        <Text variant="caption" color="secondary" style={styles.cardHint}>
          Load your latest generated compilation, add editorial notes, then approve export.
        </Text>
        <Button
          title="Reload latest draft"
          variant="outline"
          onPress={loadLatest}
          icon={<DSIcon name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }} size={16} color="#000000" />}
          style={styles.rowBtn}
        />
        <Button
          title={compilationId ? `Compilation: ${compilationId.slice(0, 8)}...` : 'No compilation yet'}
          variant="ghost"
          onPress={() => {}}
          disabled
          style={styles.rowBtn}
        />
        <Button
          title="Save editorial notes"
          variant="outline"
          onPress={handleSaveEditorialDraft}
          disabled={!canModerate || !compilationId}
          style={styles.rowBtn}
        />
        <Button
          title="Approve and export"
          onPress={handleApproveAndExport}
          disabled={!canModerate || !compilationId}
          style={styles.rowBtn}
        />
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginTop: 6, marginBottom: 16 },
  warn: { marginBottom: 14 },
  card: { gap: 10, marginTop: 4 },
  cardHint: { lineHeight: 18 },
  rowBtn: { marginTop: 2 },
});
