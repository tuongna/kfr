import { supabase } from './supabase';

export interface TranslateResult {
  en: string;
  vi: string;
  note: string;
  /** Scrum-specific English definition, present only when this is a Scrum term. */
  scrumEn?: string;
  /** Scrum-specific Vietnamese explanation. */
  scrumVi?: string;
  /** True when AI identified this as a Scrum/Agile domain term. */
  isScrumTerm?: boolean;
}

const SYSTEM_PROMPT = `You are a Vietnamese-English bilingual expert specializing in Scrum and Agile.
Given a word or phrase (usually from a PSM / PSPO exam context), respond with JSON ONLY — no markdown fences, no extra keys:
{
  "en": "<General-context English definition, 1–2 concise sentences>",
  "vi": "<General-context Vietnamese translation/explanation, 1–2 sentences>",
  "note": "<Optional usage tip in Vietnamese; empty string if none>",
  "isScrumTerm": <true | false>,
  "scrumEn": "<Scrum-specific English definition if isScrumTerm=true, else empty string. Be precise: distinguish formal Scrum events (time-boxed, mandatory) from ongoing activities or roles.>",
  "scrumVi": "<Scrum-specific Vietnamese explanation if isScrumTerm=true, else empty string>"
}

Guidance for Scrum definitions:
- Formal Scrum events (Sprint, Sprint Planning, Daily Scrum, Sprint Review, Sprint Retrospective) are time-boxed and mandatory — say so explicitly.
- Product Backlog is an ordered list of everything known to improve the product; Product Backlog Refinement is an ongoing activity (NOT a formal event).
- Distinguish Scrum roles: Product Owner (maximizes value), Scrum Master (serves team & org), Developers (create the Increment).
- "Increment" must always mention the Definition of Done.
- Keep scrumEn ≤ 2 sentences and scrumVi ≤ 2 sentences.`;

// Tried in order by the edge function. Keep this list current to avoid dead endpoints.
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
      max_tokens: 350,
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
      isScrumTerm: Boolean(parsed.isScrumTerm),
      scrumEn: parsed.scrumEn ? String(parsed.scrumEn) : undefined,
      scrumVi: parsed.scrumVi ? String(parsed.scrumVi) : undefined,
    };
  } catch {
    return { en: word, vi: content.trim().slice(0, 300), note: '' };
  }
}
