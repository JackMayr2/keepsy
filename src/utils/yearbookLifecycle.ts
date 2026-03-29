import type { Yearbook, YearbookMemberRole, YearbookPhase } from '@/src/types/yearbook.types';

const LOCKED_PHASES: YearbookPhase[] = [
  'locked',
  'review',
  'compiling',
  'editableDraft',
  'approved',
  'archived',
];

export function effectiveYearbookPhase(yearbook: Yearbook | null | undefined): YearbookPhase {
  if (!yearbook) return 'active';
  if (yearbook.phase) return yearbook.phase;

  const due = yearbook.dueDate?.trim();
  if (!due) return 'active';
  const dueAt = Date.parse(due);
  if (!Number.isFinite(dueAt)) return 'active';
  return dueAt <= Date.now() ? 'locked' : 'active';
}

export function isYearbookLockedPhase(phase: YearbookPhase): boolean {
  return LOCKED_PHASES.includes(phase);
}

export function canContributeToYearbook(
  yearbook: Yearbook | null | undefined,
  role: YearbookMemberRole | null | undefined
): boolean {
  const phase = effectiveYearbookPhase(yearbook);
  if (!isYearbookLockedPhase(phase)) return true;
  return role === 'creator' || role === 'admin';
}

export function canModerateYearbook(role: YearbookMemberRole | null | undefined): boolean {
  return role === 'creator' || role === 'admin';
}

export function canFinalizeYearbook(role: YearbookMemberRole | null | undefined): boolean {
  return role === 'creator';
}
