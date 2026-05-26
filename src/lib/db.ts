import Dexie, { type Table } from 'dexie';
import type { Term, TermSense, Question, QuestionOption, LocalProgress, LookedUpTerm } from './types';
import { LEGACY_PROGRESS_USER_ID } from './types';

export class KfrDB extends Dexie {
  terms!: Table<Term>;
  termSenses!: Table<TermSense>;
  questions!: Table<Question>;
  questionOptions!: Table<QuestionOption>;
  progressV2!: Table<LocalProgress>;
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
    //
    // NOTE: Dexie does not support changing the primary key of an existing
    // object store, so we cannot rename the key path of `progress` in-place.
    // Instead, we create a new `progressV2` table with the correct composite
    // key and migrate rows there, then drop the old `progress` table in v3.
    this.version(2)
      .stores({
        progress: '[itemType+itemId], itemType, nextReview', // keep old schema unchanged
        progressV2: '[userId+itemType+itemId], userId, itemType, nextReview',
      })
      .upgrade(async (tx) => {
        const old = await tx.table('progress').toArray();
        await tx.table('progressV2').clear();
        if (!old.length) return;
        await tx
          .table('progressV2')
          .bulkAdd(old.map((p) => ({ ...p, userId: LEGACY_PROGRESS_USER_ID })));
      });

    // v3: drop the now-redundant old progress table.
    this.version(3).stores({
      progress: null,
    });
  }
}

export const db = new KfrDB();
