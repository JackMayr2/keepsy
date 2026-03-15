export interface Poll {
  id: string;
  yearbookId: string;
  question: string;
  options: string[];
  endAt?: Date | { seconds: number; nanoseconds: number };
}

export interface PollVote {
  pollId: string;
  userId: string;
  optionIndex: number;
}
