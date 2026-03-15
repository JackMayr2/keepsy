export interface Travel {
  id: string;
  yearbookId: string;
  userId: string;
  photoURL?: string;
  placeName?: string;
  notes?: string;
  taggedUserIds: string[];
  createdAt: Date | { seconds: number; nanoseconds: number };
}
