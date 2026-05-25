import { supabase } from './supabase';

export interface TranslateResult {
  en: string;
  vi: string;
  note: string;
}

const SYSTEM_PROMPT = `You are a Vietnamese-English expert specializing in Scrum and Agile terminology.
Given a word or phrase (typically from a Scrum context), respond with JSON only — no markdown fences:
{"en": "<concise English definition, 1-2 sentences>", "vi": "<Vietnamese translation/explanation, 1-2 sentences>", "note": "<optional usage tip in Vietnamese, or empty string>"}`;

// Tried in order by the edge function. Keep this list current to avoid dead endpoints.
// gpt-oss-20b:free is capable enough for glossary-style EN↔VI translation.
const MODELS = [
  'openai/gpt-oss-20b:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'qwen/qwen-2.5-7b-instruct:free',
];

interface OpenRouterChoice {
  message?: { content?: string };
}
interface OpenRouterResponse {
  choices?: OpenRouterChoice[];
}
interface ProxyEnvelope {
  data?: OpenRouterResponse;
  model?: string;
  errors?: string[];
}

export async function translateTerm(word: string): Promise<TranslateResult> {
  const { data, error } = await supabase.functions.invoke<ProxyEnvelope>('openrouter', {
    body: {
      models: MODELS,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Translate: "${word}"` },
      ],
      max_tokens: 200,
    },
  });

  if (error) throw new Error(`Edge function not reachable: ${error.message}`);
  if (!data) throw new Error('Edge function returned empty response');
  if (data.errors?.length) throw new Error(data.errors.join(' | '));

  const content: string = data.data?.choices?.[0]?.message?.content ?? '';
  try {
    const parsed = JSON.parse(content.trim()) as Partial<TranslateResult>;
    return {
      en: String(parsed.en ?? word),
      vi: String(parsed.vi ?? word),
      note: String(parsed.note ?? ''),
    };
  } catch {
    return { en: word, vi: content.trim().slice(0, 300), note: '' };
  }
}
