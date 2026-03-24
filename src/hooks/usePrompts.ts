import { useState, useEffect, useCallback } from 'react';
import { getPrompts, ensureDefaultPrompts, getDraftsForUser } from '@/src/services/firestore';
import { logger } from '@/src/utils/logger';
import type { Draft, Prompt } from '@/src/types/prompt.types';

export function usePrompts(yearbookId: string | undefined, userId?: string | null) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [myDraftsByPromptId, setMyDraftsByPromptId] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!yearbookId) {
      setPrompts([]);
      setMyDraftsByPromptId({});
      if (!silent) setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    try {
      try {
        await ensureDefaultPrompts(yearbookId);
      } catch (e) {
        logger.warn('usePrompts', 'ensureDefaultPrompts failed', e);
      }
      const list = await getPrompts(yearbookId);
      setPrompts(list);

      if (userId) {
        try {
          const drafts = await getDraftsForUser(userId, yearbookId);
          const map: Record<string, Draft> = {};
          for (const d of drafts) {
            map[d.promptId] = d;
          }
          setMyDraftsByPromptId(map);
        } catch (e) {
          logger.warn('usePrompts', 'getDraftsForUser failed', e);
          setMyDraftsByPromptId({});
        }
      } else {
        setMyDraftsByPromptId({});
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [yearbookId, userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { prompts, loading, refresh, myDraftsByPromptId };
}
