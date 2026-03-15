export type YearbookMemberRole = 'creator' | 'admin' | 'member';

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
  description?: string;
  dueDate?: string;
  aiVisualUrl?: string;
  inviteCode: string;
  createdBy: string;
  createdAt: Date | { seconds: number; nanoseconds: number };
}

export interface YearbookWithRole extends Yearbook {
  role: YearbookMemberRole;
}
