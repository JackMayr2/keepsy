export type CompilationSnapshot = {
  promptIds: string[];
  draftIds: string[];
  pollIds: string[];
  superlativeIds: string[];
  travelIds: string[];
  memberIds: string[];
};

export type PagePlanEntry = {
  pageNumber: number;
  layout: string;
  section: string;
  items: string[];
};

export type YearbookCompilationDoc = {
  id: string;
  yearbookId: string;
  phase: string;
  pagePlan: PagePlanEntry[];
  snapshot: CompilationSnapshot | null;
  editorNotes?: string | null;
  draftPdfUrl?: string | null;
  exportPdfUrl?: string | null;
};

export type PromptDoc = { id: string; text: string; type: string };
export type DraftDoc = {
  id: string;
  promptId: string;
  userId: string;
  content: string;
  photoURL?: string | null;
};
export type PollDoc = { id: string; question: string; options: string[] };
export type SuperlativeDoc = { id: string; category: string; nominations: Record<string, string> };
export type TravelDoc = {
  id: string;
  placeName?: string | null;
  caption?: string | null;
  notes?: string | null;
  photoURL?: string | null;
  photoURLs?: string[] | null;
};
export type UserDoc = { id: string; firstName?: string; lastName?: string };
