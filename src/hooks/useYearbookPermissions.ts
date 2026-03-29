import { useEffect, useState } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { getMemberRole } from '@/src/services/firestore';
import { useYearbook } from '@/src/hooks/useYearbook';
import type { YearbookMemberRole } from '@/src/types/yearbook.types';
import {
  canContributeToYearbook,
  canFinalizeYearbook,
  canModerateYearbook,
  effectiveYearbookPhase,
} from '@/src/utils/yearbookLifecycle';

export function useYearbookPermissions(yearbookId: string | undefined) {
  const { userId } = useAuth();
  const { yearbook, loading, refresh } = useYearbook(yearbookId);
  const [role, setRole] = useState<YearbookMemberRole | null>(null);

  useEffect(() => {
    if (!yearbookId || !userId) {
      setRole(null);
      return;
    }
    getMemberRole(yearbookId, userId).then(setRole).catch(() => setRole(null));
  }, [yearbookId, userId]);

  const phase = effectiveYearbookPhase(yearbook);
  const canContribute = canContributeToYearbook(yearbook, role);
  const canModerate = canModerateYearbook(role);
  const canFinalize = canFinalizeYearbook(role);

  return {
    yearbook,
    loading,
    refresh,
    role,
    phase,
    canContribute,
    canModerate,
    canFinalize,
  };
}
