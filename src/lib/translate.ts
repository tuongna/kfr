import { db } from './db';
import { supabase } from './supabase';
import { translateTerm, type OnAttempt } from './ai';
import type { Term } from './types';

// Punctuation that breaks a phrase: a slider/range cannot span across these.
const PUNCT_BOUNDARY = /[.,;:!?]/;

export interface WordSpan {
  text: string;
  start: number;
  end: number;
  /** Index of the punctuation-delimited segment this word belongs to. */
  segment: number;
}

/**
 * Splits a sentence into word spans with character offsets and segment ids.
 * Words inside the same segment can be combined into a phrase; punctuation
 * marks segment boundaries that the n-gram slider must never cross.
 */
export function tokenizeWords(sentence: string): WordSpan[] {
  const out: WordSpan[] = [];
  let segment = 0;
  let i = 0;
  while (i < sentence.length) {
    const ch = sentence[i];
    if (isLetter(ch)) {
      let j = i + 1;
      while (j < sentence.length && isLetter(sentence[j])) j++;
      out.push({ text: sentence.slice(i, j), start: i, end: j, segment });
      i = j;
    } else {
      if (PUNCT_BOUNDARY.test(ch)) segment++;
      i++;
    }
  }
  return out;
}

/**
 * Tokenizes a text stem into clickable HTML spans.
 *
 * Strategy — longest-match-first greedy scan:
 *   1. Check each position against known terms (sorted longest → shortest).
 *      Multi-word phrases ("Product Owner") are matched before their parts.
 *   2. Remaining letter sequences become `.any-word` spans (AI-translatable).
 *   3. Non-letter characters (spaces, punctuation) are emitted as plain text.
 *
 * Each interactive span carries `data-char-idx` (start offset in the original
 * sentence) so callers can derive the n-gram window for the slider popup.
 */
export function tokenizeStem(stem: string, knownTerms: Term[]): string {
  const sorted = [...knownTerms].sort((a, b) => b.text.length - a.text.length);
  const out: string[] = [];
  let i = 0;

  while (i < stem.length) {
    let matched = false;

    for (const term of sorted) {
      const t = term.text;
      if (i + t.length > stem.length) continue;
      if (stem.slice(i, i + t.length).toLowerCase() !== t.toLowerCase()) continue;
      // Require word boundaries so "Sprint" doesn't match inside "Sprinting"
      const before = i === 0 || !isLetter(stem[i - 1]);
      const after = i + t.length >= stem.length || !isLetter(stem[i + t.length]);
      if (before && after) {
        const raw = stem.slice(i, i + t.length);
        out.push(
          `<span class="glossary-term" data-term-id="${term.id}" data-char-idx="${i}" tabindex="0" role="button">${escHtml(raw)}</span>`
        );
        i += t.length;
        matched = true;
        break;
      }
    }

    if (matched) continue;

    if (isLetter(stem[i])) {
      let j = i + 1;
      while (j < stem.length && isLetter(stem[j])) j++;
      const word = stem.slice(i, j);
      if (word.length >= 2) {
        out.push(
          `<span class="any-word" data-word="${escAttr(word)}" data-char-idx="${i}" tabindex="0" role="button">${escHtml(word)}</span>`
        );
      } else {
        out.push(escHtml(word));
      }
      i = j;
    } else {
      out.push(escHtml(stem[i]));
      i++;
    }
  }

  return out.join('');
}

export interface NgramSuggestion {
  text: string;
  /** Existing term id if this n-gram is in the glossary, else null. */
  termId: string | null;
  length: number;
}

/**
 * Returns n-gram suggestions starting at the clicked word.
 *
 * - Always includes the clicked word as the 1-gram (even if not in glossary).
 * - Includes 2..maxLen grams ONLY if they exist in the glossary.
 * - Stops at the next punctuation boundary (the n-gram never spans across).
 * - Sorted by length ASC, matching the UX described in chat:
 *   "item đầu tiên là từ đó, item thứ 2 là cụm từ có thể có..."
 */
export async function suggestNgrams(
  sentence: string,
  charIdx: number,
  maxLen = 4
): Promise<NgramSuggestion[]> {
  const words = tokenizeWords(sentence);
  const startIdx = words.findIndex((w) => w.start === charIdx);
  if (startIdx === -1) return [];

  const segment = words[startIdx].segment;
  const window: WordSpan[] = [];
  for (let i = startIdx; i < words.length && window.length < maxLen; i++) {
    if (words[i].segment !== segment) break;
    window.push(words[i]);
  }

  const results: NgramSuggestion[] = [];
  for (let n = 1; n <= window.length; n++) {
    const text = sentence.slice(window[0].start, window[n - 1].end);
    const term = await db.terms.filter((t) => t.text.toLowerCase() === text.toLowerCase()).first();
    if (term || n === 1) {
      results.push({ text, termId: term?.id ?? null, length: n });
    }
  }
  return results;
}

/**
 * Returns the term ID for rawText, creating it via AI translation if not cached.
 * Writes new translations to both Supabase (persistent) and Dexie (local cache).
 *
 * When `context` is `'scrum'` and the term already exists in cache but has no
 * Scrum-specific sense, re-translates to try to enrich it (non-fatal: if the AI
 * doesn't identify it as a Scrum term, the existing general sense is kept as-is).
 */
export async function lookupOrTranslate(
  rawText: string,
  ownerId: string,
  onAttempt?: OnAttempt,
  context: 'general' | 'scrum' = 'general',
): Promise<string> {
  const normalized = rawText.trim();

  const existing = await db.terms
    .filter((t) => t.text.toLowerCase() === normalized.toLowerCase())
    .first();

  if (existing) {
    // In Scrum context, check whether a Scrum-specific sense already exists.
    // If not, re-translate to attempt enrichment (only the scrum sense is added;
    // the existing general sense is never replaced).
    if (context === 'scrum') {
      const scrumSenseCount = await db.termSenses
        .where('termId')
        .equals(existing.id)
        .filter((s) => s.register === 'scrum')
        .count();

      if (scrumSenseCount === 0) {
        await enrichScrumSense(existing.id, normalized, ownerId, onAttempt);
      }
    }
    return existing.id;
  }

  const { result, model } = await translateTerm(normalized, onAttempt);

  // Author tag: model id stripped of any ':free' suffix so the chip stays clean.
  const modelTag = model.replace(/:free$/, '');
  const termTags = ['ai-dịch', modelTag];

  const termId = crypto.randomUUID();
  const senseId = crypto.randomUUID();
  const termType: 'word' | 'phrase' = normalized.includes(' ') ? 'phrase' : 'word';

  const { error: termError } = await supabase.from('terms').insert({
    id: termId,
    text: normalized,
    type: termType,
    tags: termTags,
    owner_id: ownerId,
  });
  if (termError) throw new Error(`Không lưu được term: ${termError.message}`);

  const sensePayloadBase = {
    id: senseId,
    term_id: termId,
    register: 'general',
    en: result.en,
    vi: result.vi,
    sort_order: 0,
  };

  // Backward compatibility: some deployments may not have run migration 003 (note column).
  // PGRST204 = "Column not found in schema cache" — stable PostgREST error code.
  let { error: senseError } = await supabase.from('term_senses').insert({
    ...sensePayloadBase,
    note: result.note || null,
  });
  if (senseError?.code === 'PGRST204' || senseError?.message?.includes("'note' column")) {
    ({ error: senseError } = await supabase.from('term_senses').insert(sensePayloadBase));
  }
  if (senseError) throw new Error(`Không lưu được nghĩa: ${senseError.message}`);

  await db.terms.put({ id: termId, text: normalized, type: termType, tags: termTags, ownerId });
  await db.termSenses.put({
    id: senseId,
    termId,
    register: 'general',
    en: result.en,
    vi: result.vi,
    note: result.note || undefined,
    sortOrder: 0,
  });

  // When AI identifies a Scrum term, also persist a scrum-specific sense (sort_order: 1 so it
  // appears AFTER general by default; TermPopup re-sorts by context).
  if (result.isScrumTerm && result.scrumEn) {
    const scrumSenseId = crypto.randomUUID();
    const scrumPayload = {
      id: scrumSenseId,
      term_id: termId,
      register: 'scrum',
      en: result.scrumEn,
      vi: result.scrumVi ?? '',
      sort_order: 1,
    };

    let { error: scrumErr } = await supabase.from('term_senses').insert({
      ...scrumPayload,
      note: null,
    });
    if (scrumErr?.code === 'PGRST204' || scrumErr?.message?.includes("'note' column")) {
      ({ error: scrumErr } = await supabase.from('term_senses').insert(scrumPayload));
    }
    // Scrum sense failure is non-fatal — general sense already saved.
    if (!scrumErr) {
      await db.termSenses.put({
        id: scrumSenseId,
        termId,
        register: 'scrum',
        en: result.scrumEn,
        vi: result.scrumVi ?? '',
        sortOrder: 1,
      });
    }
  }

  return termId;
}

/**
 * Re-translates `text` and, if the AI identifies it as a Scrum term, inserts the
 * Scrum sense into Supabase and Dexie for `termId`. The existing general sense is
 * never modified. Errors are swallowed so the caller always gets a termId back.
 */
async function enrichScrumSense(
  termId: string,
  text: string,
  ownerId: string,
  onAttempt?: OnAttempt,
): Promise<void> {
  let result: import('./ai').TranslateResult;
  try {
    ({ result } = await translateTerm(text, onAttempt));
  } catch {
    // All models failed — keep existing general sense, no Scrum enrichment.
    return;
  }

  if (!result.isScrumTerm || !result.scrumEn) return;

  const scrumSenseId = crypto.randomUUID();
  const scrumPayload = {
    id: scrumSenseId,
    term_id: termId,
    register: 'scrum',
    en: result.scrumEn,
    vi: result.scrumVi ?? '',
    sort_order: 1,
  };

  let { error: scrumErr } = await supabase.from('term_senses').insert({
    ...scrumPayload,
    note: null,
  });
  if (scrumErr?.code === 'PGRST204' || scrumErr?.message?.includes("'note' column")) {
    ({ error: scrumErr } = await supabase.from('term_senses').insert(scrumPayload));
  }

  if (!scrumErr) {
    await db.termSenses.put({
      id: scrumSenseId,
      termId,
      register: 'scrum',
      en: result.scrumEn,
      vi: result.scrumVi ?? '',
      sortOrder: 1,
    });
  }
  // Ignore scrumErr — non-fatal; the term still opens with its general sense.
}

function isLetter(ch: string): boolean {
  return /[a-zA-Z]/.test(ch);
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
