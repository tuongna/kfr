import { supabase } from './supabase';
import { db } from './db';
import type { Term, TermSense, Question, QuestionOption } from './types';

// Network-first: always fetch from Supabase so new content is picked up
// immediately. Falls back to the existing Dexie cache when offline.
export async function syncContent(): Promise<void> {
  try {
    await Promise.all([syncTerms(), syncQuestions()]);
  } catch {
    // Offline or transient network error — use cached data silently.
    // Throw only if there is no local cache at all (first-time load offline).
    const hasCache = (await db.questions.count()) > 0 || (await db.terms.count()) > 0;
    if (!hasCache) throw new Error('No internet connection and no local cache available.');
  }
}

async function syncTerms(): Promise<void> {
  const { data, error } = await supabase.from('terms').select('*, term_senses(*)');

  if (error) throw error;
  // Guard: never wipe local cache when server returns empty (e.g. expired token
  // causes RLS to return [] instead of error — clearing Dexie would erase all
  // user-translated terms that are safely stored in the DB).
  if (!data?.length) return;

  const terms: Term[] = data.map((t) => ({
    id: t.id,
    text: t.text,
    type: t.type,
    ipa: t.ipa ?? undefined,
    tags: t.tags ?? [],
    source: t.source ?? undefined,
    ownerId: t.owner_id,
  }));

  const senses: TermSense[] = data.flatMap((t) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((t.term_senses as any[]) ?? []).map((s) => ({
      id: s.id,
      termId: s.term_id,
      register: s.register,
      en: s.en,
      vi: s.vi,
      note: s.note ?? undefined,
      sortOrder: s.sort_order ?? 0,
    }))
  );

  await db.transaction('rw', db.terms, db.termSenses, async () => {
    await db.terms.clear();
    await db.termSenses.clear();
    await db.terms.bulkPut(terms);
    await db.termSenses.bulkPut(senses);
  });
}

/** How many question rows to pull per network request. */
const QUESTIONS_PAGE_SIZE = 30;

async function syncQuestions(): Promise<void> {
  // Ask the server for the grand total first. This is a cheap head request and
  // gives us the real number of questions (used to drive pagination); it is the
  // total across ALL pages, never just one patch.
  const { count, error: countError } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true });

  if (countError) throw countError;

  if (!count) {
    // Only clear local cache when the session is confirmed valid.
    // An expired/invalid token can silently cause RLS to return [] — in that
    // case keep local data rather than erasing it.
    // A valid session returning [] means RLS correctly blocked this user,
    // so stale cached questions must be evicted.
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      await db.transaction('rw', db.questions, db.questionOptions, async () => {
        await db.questions.clear();
        await db.questionOptions.clear();
      });
    }
    return;
  }

  // Pull the rows in fixed-size patches so no single request has to carry the
  // whole table (lighter on the network and avoids timeouts on large datasets).
  // We accumulate every patch, then commit once so the local cache is replaced
  // atomically — a mid-sync failure leaves the previous cache intact.
  const questions: Question[] = [];
  const options: QuestionOption[] = [];

  for (let offset = 0; offset < count; offset += QUESTIONS_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('questions')
      .select('*, question_options(*)')
      .order('id', { ascending: true })
      .range(offset, offset + QUESTIONS_PAGE_SIZE - 1);

    if (error) throw error;
    if (!data?.length) break;

    for (const q of data) {
      questions.push({
        id: q.id,
        exam: q.exam,
        stem: q.stem,
        explanationEn: q.explanation_en ?? undefined,
        explanationVi: q.explanation_vi ?? undefined,
        tags: q.tags ?? [],
        termRefs: q.term_refs ?? [],
        ownerId: q.owner_id,
        source: q.source ?? undefined,
        quality: q.quality === 'trusted' ? 'trusted' : 'reference',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const o of (q.question_options as any[]) ?? []) {
        options.push({
          id: o.id,
          questionId: o.question_id,
          text: o.text,
          correct: o.correct,
          sortOrder: o.sort_order ?? 0,
        });
      }
    }
  }

  await db.transaction('rw', db.questions, db.questionOptions, async () => {
    await db.questions.clear();
    await db.questionOptions.clear();
    await db.questions.bulkPut(questions);
    await db.questionOptions.bulkPut(options);
  });
}
