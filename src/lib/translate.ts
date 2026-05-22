import { db } from './db';
import { supabase } from './supabase';
import { translateTerm } from './ai';
import type { Term } from './types';

/**
 * Tokenizes a text stem into clickable HTML spans.
 *
 * Strategy — longest-match-first greedy scan:
 *   1. Check each position against known terms (sorted longest → shortest).
 *      Multi-word phrases ("Product Owner") are matched before their parts.
 *   2. Remaining letter sequences become `.any-word` spans (AI-translatable).
 *   3. Non-letter characters (spaces, punctuation) are emitted as plain text.
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
          `<span class="glossary-term" data-term-id="${term.id}" tabindex="0" role="button">${escHtml(raw)}</span>`
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
          `<span class="any-word" data-word="${escAttr(word)}" tabindex="0" role="button">${escHtml(word)}</span>`
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

/**
 * Returns the term ID for rawText, creating it via AI translation if not cached.
 * Writes new translations to both Supabase (persistent) and Dexie (local cache).
 */
export async function lookupOrTranslate(rawText: string, ownerId: string): Promise<string> {
  const normalized = rawText.trim();

  const existing = await db.terms
    .filter((t) => t.text.toLowerCase() === normalized.toLowerCase())
    .first();
  if (existing) return existing.id;

  const result = await translateTerm(normalized);

  const termId = crypto.randomUUID();
  const senseId = crypto.randomUUID();
  const termType: 'word' | 'phrase' = normalized.includes(' ') ? 'phrase' : 'word';

  await supabase.from('terms').insert({
    id: termId,
    text: normalized,
    type: termType,
    tags: ['ai-dịch'],
    owner_id: ownerId,
  });

  await supabase.from('term_senses').insert({
    id: senseId,
    term_id: termId,
    register: 'general',
    en: result.en,
    vi: result.vi,
    note: result.note || null,
    sort_order: 0,
  });

  await db.terms.put({ id: termId, text: normalized, type: termType, tags: ['ai-dịch'], ownerId });
  await db.termSenses.put({
    id: senseId,
    termId,
    register: 'general',
    en: result.en,
    vi: result.vi,
    note: result.note || undefined,
    sortOrder: 0,
  });

  return termId;
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
