export interface Term {
  id: string;
  text: string;
  type: 'word' | 'phrase';
  ipa?: string;
  tags: string[];
  source?: string;
  ownerId: string;
  senses?: TermSense[];
}

export interface TermSense {
  id: string;
  termId: string;
  register: 'general' | 'scrum';
  en: string;
  vi: string;
  note?: string;
  sortOrder: number;
}

export interface Question {
  id: string;
  exam: 'PSM-I' | 'PSPO-I';
  stem: string;
  explanationEn?: string;
  explanationVi?: string;
  tags: string[];
  termRefs: string[];
  ownerId: string;
  options?: QuestionOption[];
}

export interface QuestionOption {
  id: string;
  questionId: string;
  text: string;
  correct: boolean;
  sortOrder: number;
}

export interface LocalProgress {
  itemType: 'term' | 'question';
  itemId: string;
  level: number;
  xp: number;
  nextReview: string | null;
  syncedAt?: string;
}

export interface LookedUpTerm {
  termId: string;
  count: number;
  lastLookedAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}
