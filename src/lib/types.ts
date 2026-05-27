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

export type QuestionQuality = 'trusted' | 'reference';

export interface Question {
  id: string;
  exam: 'PSM-I' | 'PSPO-I';
  stem: string;
  explanationEn?: string;
  explanationVi?: string;
  tags: string[];
  termRefs: string[];
  ownerId: string;
  source?: string;
  quality: QuestionQuality;
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
  userId: string;
  itemType: 'term' | 'question';
  itemId: string;
  level: number;
  xp: number;
  nextReview: string | null;
  syncedAt?: string;
}

/** Progress payload shape without identity/sync metadata. SRS produces this;
 *  `saveProgress` tags on the userId before persisting. */
export type ProgressInput = Omit<LocalProgress, 'userId' | 'syncedAt'>;

/** Marker used by Dexie v2 upgrade to flag pre-userId rows that need to be
 *  claimed by the next user who logs in. */
export const LEGACY_PROGRESS_USER_ID = '__legacy__';

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
