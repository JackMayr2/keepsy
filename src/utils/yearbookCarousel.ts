import type { YearbookWithRole } from '@/src/types/yearbook.types';

function parseDueDate(s: string | undefined): number | null {
  if (!s?.trim()) return null;
  const t = Date.parse(s);
  if (!Number.isFinite(t)) return null;
  return t;
}

function createdAtMs(y: YearbookWithRole): number {
  const c = y.createdAt;
  if (c instanceof Date) return c.getTime();
  if (c && typeof c === 'object' && 'seconds' in c && typeof (c as { seconds: number }).seconds === 'number') {
    return (c as { seconds: number }).seconds * 1000;
  }
  return 0;
}

/** True if due date is today or in the future (start of local day). */
function isDueUpcoming(dueMs: number | null): boolean {
  if (dueMs == null) return false;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return dueMs >= start.getTime();
}

/**
 * Carousel order: yearbooks with an upcoming due date first (soonest due first),
 * then the rest by most recently created.
 */
export function sortYearbooksForHomeCarousel(yearbooks: YearbookWithRole[]): YearbookWithRole[] {
  const decorated = yearbooks.map((y) => ({
    y,
    due: parseDueDate(y.dueDate),
  }));

  return [...decorated]
    .sort((a, b) => {
      const aUp = isDueUpcoming(a.due);
      const bUp = isDueUpcoming(b.due);
      if (aUp && !bUp) return -1;
      if (!aUp && bUp) return 1;
      if (aUp && bUp && a.due != null && b.due != null && a.due !== b.due) {
        return a.due - b.due;
      }
      return createdAtMs(b.y) - createdAtMs(a.y);
    })
    .map(({ y }) => y);
}
