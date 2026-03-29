export type YearbookMemberRole = 'creator' | 'admin' | 'member';
export type YearbookPhase =
  | 'active'
  | 'locked'
  | 'review'
  | 'compiling'
  | 'editableDraft'
  | 'approved'
  | 'archived';
export type YearbookCompileStatus = 'idle' | 'queued' | 'running' | 'succeeded' | 'failed';
export type YearbookPrintStatus = 'idle' | 'queued' | 'running' | 'ready' | 'failed';
export type YearbookType =
  | 'college'
  | 'workplace'
  | 'family'
  | 'friends'
  | 'holiday'
  | 'sports-team'
  | 'club-org'
  | 'travel'
  | 'wedding'
  | 'other';

export interface YearbookMember {
  id: string;
  yearbookId: string;
  userId: string;
  role: YearbookMemberRole;
  joinedAt: Date | { seconds: number; nanoseconds: number };
}

export interface Yearbook {
  id: string;
  name: string;
  type?: YearbookType;
  description?: string;
  dueDate?: string;
  aiVisualUrl?: string;
  inviteCode: string;
  createdBy: string;
  createdAt: Date | { seconds: number; nanoseconds: number };
  phase?: YearbookPhase;
  lockedAt?: Date | { seconds: number; nanoseconds: number } | null;
  lockedBy?: string | null;
  reviewCompletedAt?: Date | { seconds: number; nanoseconds: number } | null;
  reviewCompletedBy?: string | null;
  compileStatus?: YearbookCompileStatus;
  printStatus?: YearbookPrintStatus;
  archiveUrl?: string | null;
  editorDraftUrl?: string | null;
  selectedThemeId?: string | null;
  /** Interactive demo yearbook — other real users’ activity is hidden in the client. */
  isTutorial?: boolean;
}

export interface YearbookWithRole extends Yearbook {
  role: YearbookMemberRole;
}

export interface YearbookCompilation {
  id: string;
  yearbookId: string;
  phase: YearbookPhase;
  createdAt: Date | { seconds: number; nanoseconds: number };
  createdBy: string;
  selectedThemeId?: string | null;
  sectionOrder: string[];
  compileStatus: YearbookCompileStatus;
  printStatus: YearbookPrintStatus;
  pagePlan: Array<{
    pageNumber: number;
    layout: string;
    section: string;
    items: string[];
  }>;
  editorNotes?: string | null;
  draftPdfUrl?: string | null;
  exportPdfUrl?: string | null;
  archiveUrl?: string | null;
  printPackageUrl?: string | null;
}
