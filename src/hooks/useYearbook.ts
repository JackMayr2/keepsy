import { useState, useEffect, useCallback } from 'react';
import { getYearbook } from '@/src/services/firestore';
import { logger } from '@/src/utils/logger';
import type { Yearbook } from '@/src/types/yearbook.types';

export function useYearbook(yearbookId: string | undefined) {
  const [yearbook, setYearbook] = useState<Yearbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!yearbookId) {
      setYearbook(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const yb = await getYearbook(yearbookId);
      setYearbook(yb);
    } catch (e) {
      logger.error('useYearbook', 'getYearbook failed', e);
      setError(e instanceof Error ? e : new Error('Failed to load yearbook'));
    } finally {
      setLoading(false);
    }
  }, [yearbookId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { yearbook, loading, error, refresh };
}
