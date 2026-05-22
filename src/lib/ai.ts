import { supabase } from './supabase';

export interface TranslateResult {
  en: string;
  vi: string;
  note: string;
}

const SYSTEM_PROMPT = `You are a Vietnamese-English expert specializing in Scrum and Agile terminology.
Given a word or phrase (typically from a Scrum context), respond with JSON only — no markdown fences:
{"en": "<concise English definition, 1-2 sentences>", "vi": "<Vietnamese translation/explanation, 1-2 sentences>", "note": "<optional usage tip in Vietnamese, or empty string>"}`;

export async function translateTerm(word: string): Promise<TranslateResult> {
  try {
    return await callModel('google/gemini-2.0-flash-exp:free', word);
  } catch {
    // Rate-limit or error on free model — fall back to cheap paid model
    return await callModel('google/gemini-flash-1.5-8b', word);
  }
}

async function callModel(model: string, word: string): Promise<TranslateResult> {
  const { data, error } = await supabase.functions.invoke('openrouter', {
    body: {
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Translate: "${word}"` },
      ],
      max_tokens: 200,
    },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(String(data.error?.message ?? data.error));

  const content: string = data?.choices?.[0]?.message?.content ?? '';
  try {
    const parsed = JSON.parse(content.trim());
    return {
      en: String(parsed.en ?? word),
      vi: String(parsed.vi ?? word),
      note: String(parsed.note ?? ''),
    };
  } catch {
    return { en: word, vi: content.trim().slice(0, 300), note: '' };
  }
}
