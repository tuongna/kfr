import Dexie, { type Table } from 'dexie';
import type { Term, TermSense, Question, QuestionOption, LocalProgress, LookedUpTerm } from './types';
import { LEGACY_PROGRESS_USER_ID } from './types';

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

    // v2: scope progress per-user so a device shared by multiple Google
    // accounts (or the same account being added later) doesn't blend rows.
    // Old rows are tagged with a legacy marker so the next logged-in user
    // can claim them (upload to Supabase under their id) instead of losing
    // any device-only progress that never synced.
    this.version(2)
      .stores({
        progress: '[userId+itemType+itemId], userId, itemType, nextReview',
      })
      .upgrade(async (tx) => {
        const old = await tx.table('progress').toArray();
        await tx.table('progress').clear();
        if (!old.length) return;
        await tx
          .table('progress')
          .bulkAdd(old.map((p) => ({ ...p, userId: LEGACY_PROGRESS_USER_ID })));
      });
  }
}

export const db = new KfrDB();
