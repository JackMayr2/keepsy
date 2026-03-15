import { useState, useEffect, useCallback } from 'react';
import { getPrompts, ensureDefaultPrompts } from '@/src/services/firestore';
import { logger } from '@/src/utils/logger';
import type { Prompt } from '@/src/types/prompt.types';

export function usePrompts(yearbookId: string | undefined) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!yearbookId) {
      setPrompts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      try {
        await ensureDefaultPrompts(yearbookId);
      } catch (e) {
        logger.warn('usePrompts', 'ensureDefaultPrompts failed', e);
      }
      const list = await getPrompts(yearbookId);
      setPrompts(list);
    } finally {
      setLoading(false);
    }
  }, [yearbookId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { prompts, loading, refresh };
}
