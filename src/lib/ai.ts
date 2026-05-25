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
// Translation model fallback chain — tried in order by the edge function.
//
// Tier 1 — Free 120B (primary, high quality when quota available):
//   openai/gpt-oss-120b:free, nvidia/nemotron-3-super-120b-a12b:free
//
// Tier 2 — Paid (reliable fallback when free quotas are exhausted; ~$0.0001–0.0006/call):
//   anthropic/claude-haiku-4-5   — best instruction-following & structured JSON (~$0.0006)
//   google/gemini-2.0-flash-001  — cheapest paid option, strong multilingual (~$0.0001)
//   openai/gpt-4o-mini           — solid all-rounder (~$0.0003)
//
// Tier 3 — Free 70B (last resort when both tiers above are unavailable):
//   meta-llama/llama-3.3-70b-instruct:free
const MODELS = [
  // Tier 1 — free 120B
  'openai/gpt-oss-120b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  // Tier 2 — paid (requires OpenRouter account with credit)
  'anthropic/claude-haiku-4-5',
  'google/gemini-2.0-flash-001',
  'openai/gpt-4o-mini',
  // Tier 3 — free 70B fallback
  'meta-llama/llama-3.3-70b-instruct:free',
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

export interface AuditResult {
  quality: 'good' | 'fair' | 'poor';
  senseReviews: {
    register: 'general' | 'scrum';
    enOk: boolean;
    viOk: boolean;
    suggestedEn: string;
    suggestedVi: string;
    reason: string;
  }[];
  missingScrumSense: boolean;
  suggestedScrumEn: string;
  suggestedScrumVi: string;
}

const AUDIT_MODELS = [
  'deepseek/deepseek-chat-v3-0324:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemini-flash-1.5',
];

const AUDIT_SYSTEM_PROMPT = `You are a senior bilingual Scrum/Agile editor reviewing flashcard definitions.
Check accuracy against the Scrum Guide 2020, Vietnamese naturalness, and distinguish events from activities.
For each sense provided, evaluate the English and Vietnamese definitions.
Respond with JSON ONLY — no markdown fences, no extra keys:
{
  "quality": "good" | "fair" | "poor",
  "senseReviews": [
    {
      "register": "general" | "scrum",
      "enOk": true | false,
      "viOk": true | false,
      "suggestedEn": "<corrected English or empty string if enOk>",
      "suggestedVi": "<corrected Vietnamese or empty string if viOk>",
      "reason": "<brief explanation of issues, or empty string if both ok>"
    }
  ],
  "missingScrumSense": true | false,
  "suggestedScrumEn": "<Scrum-specific English definition if missingScrumSense, else empty string>",
  "suggestedScrumVi": "<Scrum-specific Vietnamese definition if missingScrumSense, else empty string>"
}`;

export async function auditTermSenses(
  termText: string,
  senses: { register: string; en: string; vi: string }[]
): Promise<AuditResult> {
  const { data, error } = await supabase.functions.invoke<ProxyEnvelope>('openrouter', {
    body: {
      models: AUDIT_MODELS,
      messages: [
        { role: 'system', content: AUDIT_SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify({ term: termText, senses }) },
      ],
      max_tokens: 600,
    },
  });

  if (error) throw new Error(`Edge function not reachable: ${error.message}`);
  if (!data) throw new Error('Edge function returned empty response');
  if (data.errors?.length) throw new Error(data.errors.join(' | '));

  const content: string = data.data?.choices?.[0]?.message?.content ?? '';
  const parsed = JSON.parse(content.trim()) as Partial<AuditResult>;
  return {
    quality: (parsed.quality as AuditResult['quality']) ?? 'fair',
    senseReviews: parsed.senseReviews ?? [],
    missingScrumSense: Boolean(parsed.missingScrumSense),
    suggestedScrumEn: String(parsed.suggestedScrumEn ?? ''),
    suggestedScrumVi: String(parsed.suggestedScrumVi ?? ''),
  };
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
