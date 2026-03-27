import React, { useState, useEffect } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import { YearbookIdProvider } from '@/src/contexts/YearbookIdContext';
import { YearbookNavProvider } from '@/src/contexts/YearbookNavContext';
import { DSIcon, NavFadeBar, NavIconButton } from '@/src/design-system';
import { useYearbook } from '@/src/hooks/useYearbook';
import {
  getMemberRole,
  ensureDefaultPrompts,
  ensureDefaultPolls,
  ensureDefaultSuperlatives,
} from '@/src/services/firestore';
import { buildYearbookInviteShareMessage } from '@/src/config/keepsyLinks';
import { logger } from '@/src/utils/logger';
import type { YearbookMemberRole } from '@/src/types/yearbook.types';
import { isTutorialYearbook } from '@/src/tutorial/constants';

const HEADER_CONTENT_HEIGHT = 44;

function normalizeId(param: string | string[] | undefined): string | undefined {
  if (param == null) return undefined;
  return Array.isArray(param) ? param[0] : param;
}

export default function YearbookDetailLayout() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = normalizeId(params.id);
  const router = useRouter();
  const { userId } = useAuth();
  const { theme } = useTheme();
  const { yearbook } = useYearbook(id);
  const [role, setRole] = useState<YearbookMemberRole | null>(null);

  useEffect(() => {
    if (id && userId) {
      getMemberRole(id, userId).then(setRole);
    }
  }, [id, userId]);

  // Seed prompts, polls, and superlatives when opening a yearbook (for existing yearbooks that had none)
  useEffect(() => {
    if (!id || isTutorialYearbook(id)) return;
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

  const canEdit = (role === 'creator' || role === 'admin') && !yearbook?.isTutorial;
  const inviteMessage =
    yearbook != null ? buildYearbookInviteShareMessage(yearbook.name, yearbook.inviteCode) : '';

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

  const iconTint = theme.colors.text;
  const insets = useSafeAreaInsets();
  const headerHeight = insets.top + HEADER_CONTENT_HEIGHT;
  const title = yearbook?.name ?? 'Yearbook';

  const customHeader = () => (
    <View style={[styles.customHeader, { height: headerHeight }]} pointerEvents="box-none">
      <NavFadeBar edge="top" bleed={56} />
      <View style={[styles.customHeaderInner, { paddingTop: insets.top }]}>
        <View style={styles.customHeaderRow}>
        <View style={[styles.headerSide, styles.headerSideLeft]}>
          <NavIconButton
            accessibilityLabel="Back to home"
            onPress={handleBackToHome}
            icon={<DSIcon name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={20} color={iconTint} />}
          />
        </View>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={[styles.headerSide, styles.headerSideRight]}>
          <View style={styles.headerRightRow}>
            <NavIconButton
              accessibilityLabel="Share yearbook"
              onPress={handleShare}
              icon={<DSIcon name={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }} size={18} color={iconTint} />}
            />
            {canEdit && (
              <NavIconButton
                accessibilityLabel="Yearbook settings"
                onPress={handleSettings}
                icon={<DSIcon name={{ ios: 'slider.horizontal.3', android: 'tune', web: 'tune' }} size={18} color={iconTint} />}
              />
            )}
          </View>
        </View>
      </View>
      </View>
    </View>
  );

  return (
    <YearbookIdProvider yearbookId={id}>
      <YearbookNavProvider>
      <Stack
        screenOptions={{
          header: customHeader,
          headerShown: true,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: true }} />
        <Stack.Screen name="settings" options={{ title: 'Yearbook settings' }} />
      </Stack>
      </YearbookNavProvider>
    </YearbookIdProvider>
  );
}

const styles = StyleSheet.create({
  customHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  customHeaderInner: {},
  customHeaderRow: {
    height: HEADER_CONTENT_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  headerSide: {
    width: 104,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSideLeft: {
    justifyContent: 'flex-start',
  },
  headerSideRight: {
    justifyContent: 'flex-end',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 'auto',
  },
});
