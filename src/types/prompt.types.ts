export type PromptType = 'text' | 'photo';

export interface Prompt {
  id: string;
  yearbookId: string;
  text: string;
  type: PromptType;
  order: number;
  isDefault: boolean;
}

export type DraftStatus = 'draft' | 'submitted';

export interface Draft {
  id: string;
  yearbookId: string;
  promptId: string;
  userId: string;
  content: string;
  photoURL?: string;
  status: DraftStatus;
  updatedAt: Date | { seconds: number; nanoseconds: number };
}
