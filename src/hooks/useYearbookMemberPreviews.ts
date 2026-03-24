import { useState, useEffect } from 'react';
import { getYearbookMembers, getUser } from '@/src/services/firestore';
import { isTutorialYearbook } from '@/src/tutorial/constants';
import { DEMO_PERSONAS, TUTORIAL_HOST } from '@/src/tutorial/personas';

export type YearbookMemberPreview = {
  photoURLs: (string | null)[];
  total: number;
};

const VISIBLE_AVATARS = 5;

/**
 * Loads up to 5 member avatars (most recently joined first) and total member count per yearbook.
 */
export function useYearbookMemberPreviews(yearbookIds: string[]) {
  const [previews, setPreviews] = useState<Record<string, YearbookMemberPreview>>({});
  const key = yearbookIds.slice().sort().join(',');

  useEffect(() => {
    if (yearbookIds.length === 0) {
      setPreviews({});
      return;
    }
    let cancelled = false;
    (async () => {
      const next: Record<string, YearbookMemberPreview> = {};
      await Promise.all(
        yearbookIds.map(async (id) => {
          try {
            if (isTutorialYearbook(id)) {
              const urls: (string | null)[] = [
                TUTORIAL_HOST.photoURL ?? null,
                ...DEMO_PERSONAS.slice(0, VISIBLE_AVATARS - 1).map((p) => p.photoURL ?? null),
              ];
              if (!cancelled) {
                next[id] = {
                  photoURLs: urls,
                  total: 20,
                };
              }
              return;
            }
            const members = await getYearbookMembers(id);
            const sorted = [...members].sort((a, b) => {
              const ta = a.joinedAt instanceof Date ? a.joinedAt.getTime() : 0;
              const tb = b.joinedAt instanceof Date ? b.joinedAt.getTime() : 0;
              return tb - ta;
            });
            const top = sorted.slice(0, VISIBLE_AVATARS);
            const users = await Promise.all(top.map((m) => getUser(m.userId)));
            if (!cancelled) {
              next[id] = {
                photoURLs: users.map((u) => u?.photoURL ?? null),
                total: members.length,
              };
            }
          } catch {
            if (!cancelled) {
              next[id] = { photoURLs: [], total: 0 };
            }
          }
        })
      );
      if (!cancelled) setPreviews(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return previews;
}
