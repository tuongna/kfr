import { supabase } from './supabase';
import { db } from './db';
import type { Term, TermSense, Question, QuestionOption } from './types';

const CACHE_KEY = 'content_cached_at';
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

export async function syncContent(force = false): Promise<void> {
  const cachedAt = localStorage.getItem(CACHE_KEY);
  const isStale = !cachedAt || Date.now() - parseInt(cachedAt) > CACHE_TTL_MS;
  if (!force && !isStale) return;

  await Promise.all([syncTerms(), syncQuestions()]);
  localStorage.setItem(CACHE_KEY, Date.now().toString());
}

async function syncTerms(): Promise<void> {
  const { data, error } = await supabase.from('terms').select('*, term_senses(*)');

  if (error) throw error;
  if (!data) return;

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

async function syncQuestions(): Promise<void> {
  const { data, error } = await supabase.from('questions').select('*, question_options(*)');

  if (error) throw error;
  if (!data) return;

  const questions: Question[] = data.map((q) => ({
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
  }));

  const options: QuestionOption[] = data.flatMap((q) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((q.question_options as any[]) ?? []).map((o) => ({
      id: o.id,
      questionId: o.question_id,
      text: o.text,
      correct: o.correct,
      sortOrder: o.sort_order ?? 0,
    }))
  );

  await db.transaction('rw', db.questions, db.questionOptions, async () => {
    await db.questions.clear();
    await db.questionOptions.clear();
    await db.questions.bulkPut(questions);
    await db.questionOptions.bulkPut(options);
  });
}
