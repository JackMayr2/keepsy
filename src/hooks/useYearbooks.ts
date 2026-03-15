import { useState, useEffect, useCallback } from 'react';
import { getYearbooksForUser } from '@/src/services/firestore';
import { logger } from '@/src/utils/logger';
import type { YearbookWithRole } from '@/src/types/yearbook.types';

export function useYearbooks(userId: string | null) {
  const [yearbooks, setYearbooks] = useState<YearbookWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setYearbooks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await getYearbooksForUser(userId);
      setYearbooks(list);
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to load yearbooks');
      const code = (e as { code?: string })?.code;
      logger.error('useYearbooks', 'getYearbooksForUser failed', e);
      // Permission denied often means rules block the query; show empty state so user can continue
      if (code === 'permission-denied') {
        logger.info('useYearbooks', 'Treating permission-denied as empty list');
        setYearbooks([]);
        setError(null);
      } else {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { yearbooks, loading, error, refresh };
}
