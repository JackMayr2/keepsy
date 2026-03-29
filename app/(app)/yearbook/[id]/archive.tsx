import React, { useEffect, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { useYearbookId } from '@/src/contexts/YearbookIdContext';
import { getLatestCompilationForYearbook } from '@/src/services/firestore';
import { Container, Button, Text } from '@/src/components/ui';
import { useYearbook } from '@/src/hooks/useYearbook';
import { DeferredFullscreenLoader } from '@/src/design-system';

export default function YearbookArchiveScreen() {
  const id = useYearbookId();
  const { yearbook, loading } = useYearbook(id);
  const [compilationExportUrl, setCompilationExportUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    getLatestCompilationForYearbook(id)
      .then((comp) => setCompilationExportUrl(comp?.exportPdfUrl ?? null))
      .catch(() => setCompilationExportUrl(null));
  }, [id]);

  const openLink = async (url: string | null) => {
    if (!url) {
      Alert.alert('Not ready', 'This artifact is not available yet.');
      return;
    }
    setBusy(true);
    try {
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert('Could not open', e instanceof Error ? e.message : 'Try again in a minute.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <DeferredFullscreenLoader active />
      </Container>
    );
  }

  return (
    <Container scroll>
      <DeferredFullscreenLoader active={busy} />
      <Text variant="title">Archive & export</Text>
      <Text variant="caption" color="secondary" style={{ marginTop: 8, marginBottom: 16 }}>
        Download or open your archived digital yearbook artifacts.
      </Text>
      <Button
        title="Open archive manifest"
        variant="outline"
        onPress={() => openLink(yearbook?.archiveUrl ?? null)}
      />
      <Button
        title="Open exported PDF"
        style={{ marginTop: 10 }}
        onPress={() => openLink(compilationExportUrl)}
      />
    </Container>
  );
}
