import Dexie, { type Table } from 'dexie';
import type { Term, TermSense, Question, QuestionOption, LocalProgress, LookedUpTerm } from './types';

export class KfrDB extends Dexie {
  terms!: Table<Term>;
  termSenses!: Table<TermSense>;
  questions!: Table<Question>;
  questionOptions!: Table<QuestionOption>;
  progress!: Table<LocalProgress>;
  lookedUpTerms!: Table<LookedUpTerm>;

  constructor() {
    super('kfr-db');
    this.version(1).stores({
      terms: 'id, text, type, *tags',
      termSenses: 'id, termId, register',
      questions: 'id, exam, *tags',
      questionOptions: 'id, questionId, correct',
      progress: '[itemType+itemId], itemType, nextReview',
      lookedUpTerms: 'termId, lastLookedAt',
    });
  }
}

export const db = new KfrDB();
