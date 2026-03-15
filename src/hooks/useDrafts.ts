import { useState, useEffect, useCallback } from 'react';
import { getDraftsForUser } from '@/src/services/firestore';
import type { Draft } from '@/src/types/prompt.types';

export function useDrafts(userId: string | null, yearbookId?: string) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setDrafts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await getDraftsForUser(userId, yearbookId);
      setDrafts(list);
    } finally {
      setLoading(false);
    }
  }, [userId, yearbookId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { drafts, loading, refresh };
}
