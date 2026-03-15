import React, { useState, useEffect } from 'react';
import { Share, Pressable } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useAuth } from '@/src/contexts/AuthContext';
import { YearbookIdProvider } from '@/src/contexts/YearbookIdContext';
import { useYearbook } from '@/src/hooks/useYearbook';
import {
  getMemberRole,
  ensureDefaultPrompts,
  ensureDefaultPolls,
  ensureDefaultSuperlatives,
} from '@/src/services/firestore';
import { logger } from '@/src/utils/logger';
import type { YearbookMemberRole } from '@/src/types/yearbook.types';

function normalizeId(param: string | string[] | undefined): string | undefined {
  if (param == null) return undefined;
  return Array.isArray(param) ? param[0] : param;
}

export default function YearbookDetailLayout() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = normalizeId(params.id);
  const router = useRouter();
  const { userId } = useAuth();
  const { yearbook } = useYearbook(id);
  const [role, setRole] = useState<YearbookMemberRole | null>(null);

  useEffect(() => {
    if (id && userId) {
      getMemberRole(id, userId).then(setRole);
    }
  }, [id, userId]);

  // Seed prompts, polls, and superlatives when opening a yearbook (for existing yearbooks that had none)
  useEffect(() => {
    if (!id) return;
    const seed = async () => {
      try {
        await Promise.all([
          ensureDefaultPrompts(id),
          ensureDefaultPolls(id),
          ensureDefaultSuperlatives(id),
        ]);
      } catch (e) {
        logger.warn('YearbookLayout', 'seed defaults failed', e);
      }
    };
    seed();
  }, [id]);

  const canEdit = role === 'creator' || role === 'admin';
  const inviteMessage = yearbook
    ? `Join "${yearbook.name}" on Keepsy! Use code: ${yearbook.inviteCode}`
    : '';

  const handleShare = () => {
    Share.share({
      message: inviteMessage,
      title: 'Join my yearbook',
    });
  };

  const handleSettings = () => {
    router.push({ pathname: '/(app)/yearbook/[id]/settings', params: { id: id ?? '' } });
  };

  const handleBackToHome = () => {
    router.replace('/(app)');
  };

  const headerLeft = () => (
    <Pressable onPress={handleBackToHome} style={{ padding: 8, marginLeft: 8 }}>
      <SymbolView
        name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
        size={24}
      />
    </Pressable>
  );

  const headerRight = () => (
    <>
      <Pressable onPress={handleShare} style={{ marginRight: 16 }}>
        <SymbolView
          name={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }}
          size={22}
        />
      </Pressable>
      {canEdit && (
        <Pressable onPress={handleSettings}>
          <SymbolView
            name={{ ios: 'gearshape.fill', android: 'settings', web: 'settings' }}
            size={22}
          />
        </Pressable>
      )}
    </>
  );

  return (
    <YearbookIdProvider yearbookId={id}>
      <Stack screenOptions={{ headerLeft, headerRight }}>
        <Stack.Screen
          name="(tabs)"
          options={{
            headerTitle: yearbook?.name ?? 'Yearbook',
            headerShown: true,
            headerBackVisible: false,
          }}
        />
        <Stack.Screen name="settings" options={{ title: 'Yearbook settings' }} />
      </Stack>
    </YearbookIdProvider>
  );
}
