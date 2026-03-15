import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useYearbookId } from '@/src/contexts/YearbookIdContext';
import { useYearbook } from '@/src/hooks/useYearbook';
import { updateYearbook } from '@/src/services/firestore';
import { Container, Text, Button, Input } from '@/src/components/ui';

export default function YearbookSettingsScreen() {
  const id = useYearbookId();
  const { yearbook, loading, refresh } = useYearbook(id);
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (yearbook) {
      setDescription(yearbook.description ?? '');
      setDueDate(yearbook.dueDate ?? '');
    }
  }, [yearbook]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await updateYearbook(id, {
        description: description.trim() || undefined,
        dueDate: dueDate.trim() || undefined,
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
      <Input
        label="Due date"
        value={dueDate}
        onChangeText={setDueDate}
        placeholder="e.g. May 15, 2025"
      />
      <Button title="Save changes" onPress={handleSave} loading={saving} style={styles.saveBtn} />
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
});