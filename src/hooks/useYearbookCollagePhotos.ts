import { useState, useEffect } from 'react';
import { getYearbookCollagePhotoUrls, type YearbookCollagePhotos } from '@/src/services/firestore';

const emptyCollage: YearbookCollagePhotos = { urls: [], totalMemories: 0 };

/**
 * Loads up to 4 image URLs per yearbook plus total unique memory count for the home card.
 */
export function useYearbookCollagePhotos(yearbookIds: string[]) {
  const [byId, setById] = useState<Record<string, YearbookCollagePhotos>>({});
  const key = yearbookIds.slice().sort().join(',');

  useEffect(() => {
    if (yearbookIds.length === 0) {
      setById({});
      return;
    }
    let cancelled = false;
    (async () => {
      const next: Record<string, YearbookCollagePhotos> = {};
      await Promise.all(
        yearbookIds.map(async (id) => {
          try {
            const data = await getYearbookCollagePhotoUrls(id, 4);
            if (!cancelled) next[id] = data;
          } catch {
            if (!cancelled) next[id] = emptyCollage;
          }
        })
      );
      if (!cancelled) setById(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return byId;
}
