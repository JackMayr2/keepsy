/** Add calendar months (handles month-end). */
export function addMonths(d: Date, months: number): Date {
  const out = new Date(d.getTime());
  const day = out.getDate();
  out.setMonth(out.getMonth() + months);
  if (out.getDate() < day) {
    out.setDate(0);
  }
  return out;
}

/** Local date as `YYYY-MM-DD` (no timezone shift). */
export function toISODateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISODate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Readable label for a stored due date (ISO or legacy free text). */
export function formatDueDateLabel(stored: string): string {
  const trimmed = stored.trim();
  if (!trimmed) return '';
  const iso = parseISODate(trimmed);
  if (iso) {
    return iso.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  return trimmed;
}

/** Best-effort parse for editing (ISO, or Date.parse). */
export function parseDueDateForPicker(stored: string, fallback: Date): Date {
  const t = stored.trim();
  if (!t) return fallback;
  const iso = parseISODate(t);
  if (iso) return iso;
  const ms = Date.parse(t);
  if (!Number.isNaN(ms)) return new Date(ms);
  return fallback;
}
