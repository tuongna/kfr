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

// Translation model fallback chain — tried in order by translateTerm() and auditTermSenses().
//
// Order: free tier first (3 models), then paid tier (3 models).
// Iteration happens CLIENT-SIDE so the UI can show progressive status per attempt.
//
// Tier 1 — Free (primary, no cost):
//   openai/gpt-oss-120b:free                  120B
//   nvidia/nemotron-3-super-120b-a12b:free    120B
//   meta-llama/llama-3.3-70b-instruct:free    70B
//
// Tier 2 — Paid (reliable fallback when free quotas exhausted):
//   anthropic/claude-haiku-4-5    best JSON instruction-following  (~$0.0006/call)
//   openai/gpt-4o-mini            solid all-rounder                (~$0.0003/call)
//   google/gemini-2.0-flash-001   cheapest paid                    (~$0.0001/call)
export const MODELS = [
  'openai/gpt-oss-120b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'anthropic/claude-haiku-4-5',
  'openai/gpt-4o-mini',
  'google/gemini-2.0-flash-001',
];

/** Human-readable display names for each model in the fallback chain. */
export const MODEL_DISPLAY: Record<string, string> = {
  'openai/gpt-oss-120b:free': 'GPT-OSS 120B',
  'nvidia/nemotron-3-super-120b-a12b:free': 'Nemotron 120B',
  'meta-llama/llama-3.3-70b-instruct:free': 'Llama 3.3 70B',
  'anthropic/claude-haiku-4-5': 'Claude Haiku',
  'openai/gpt-4o-mini': 'GPT-4o mini',
  'google/gemini-2.0-flash-001': 'Gemini Flash',
};

/** Per-model network timeout. If a model doesn't respond in time, fall through to the next. */
export const PER_MODEL_TIMEOUT_MS = 15_000;

/** Single attempt to call one model. Emitted via the onAttempt callback. */
export interface ModelAttempt {
  model: string;
  status: 'trying' | 'failed' | 'succeeded';
  error?: string;
}

export type OnAttempt = (attempt: ModelAttempt) => void;

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

// Audit uses the same model chain as translation — ensures always-working fallback.
// (Previously used separate AUDIT_MODELS that had stale/broken endpoints.)

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
}

CRITICAL RULE — empty or blank fields:
If any "en" or "vi" field in the input senses is an empty string or contains only whitespace,
that sense is BROKEN and UNUSABLE. You MUST:
  - Set overall quality to "poor" (never "good" or "fair" when any field is empty).
  - Set enOk to false (if en is empty) and/or viOk to false (if vi is empty).
  - Provide a COMPLETE, meaningful corrected value in suggestedEn / suggestedVi — never leave them empty.
  - Set reason to explain that the field was empty and provide a correction.`;

/**
 * Audits existing term senses by iterating the shared MODELS chain client-side.
 * Mirrors translateTerm(): tries each model in order, fires onAttempt callbacks so
 * the UI can show the same real-time fallback progress as during translation.
 */
export async function auditTermSenses(
  termText: string,
  senses: { register: string; en: string; vi: string }[],
  onAttempt?: OnAttempt,
): Promise<AuditResult> {
  const errors: string[] = [];
  const userMessage = JSON.stringify({ term: termText, senses });

  for (const model of MODELS) {
    onAttempt?.({ model, status: 'trying' });

    const invokePromise = supabase.functions.invoke<ProxyEnvelope>('openrouter', {
      body: {
        models: [model],
        messages: [
          { role: 'system', content: AUDIT_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 600,
      },
    });

    const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) =>
      setTimeout(
        () =>
          resolve({
            data: null,
            error: { message: `Timeout sau ${PER_MODEL_TIMEOUT_MS / 1000}s` },
          }),
        PER_MODEL_TIMEOUT_MS
      )
    );

    const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

    if (error) {
      const msg = (error as { message: string }).message;
      onAttempt?.({ model, status: 'failed', error: msg });
      errors.push(`${model}: ${msg}`);
      continue;
    }
    if (!data || data.errors?.length) {
      const msg = stripModelPrefix(data?.errors?.[0] ?? 'empty response', model);
      onAttempt?.({ model, status: 'failed', error: msg });
      errors.push(`${model}: ${msg}`);
      continue;
    }

    const content: string = data.data?.choices?.[0]?.message?.content ?? '';
    try {
      const parsed = JSON.parse(extractJson(content)) as Partial<AuditResult>;
      const actualModel = data.model ?? model;
      onAttempt?.({ model: actualModel, status: 'succeeded' });
      return {
        quality: (parsed.quality as AuditResult['quality']) ?? 'fair',
        senseReviews: parsed.senseReviews ?? [],
        missingScrumSense: Boolean(parsed.missingScrumSense),
        suggestedScrumEn: String(parsed.suggestedScrumEn ?? ''),
        suggestedScrumVi: String(parsed.suggestedScrumVi ?? ''),
      };
    } catch {
      const msg = `Invalid JSON: ${content.slice(0, 60)}`;
      onAttempt?.({ model, status: 'failed', error: msg });
      errors.push(`${model}: ${msg}`);
    }
  }

  throw new Error(`Tất cả model đều thất bại (audit):\n${errors.join('\n')}`);
}

export interface TranslateOutcome {
  result: TranslateResult;
  /** The model that actually produced the translation (id from OpenRouter response). */
  model: string;
}

/**
 * Translates a term by iterating MODELS client-side. Each attempt fires onAttempt
 * so the UI can show real-time fallback progress. Throws when ALL models fail.
 *
 * Cleans up the model id in the tag by stripping the ':free' suffix is the caller's
 * responsibility (see translate.ts → lookupOrTranslate).
 */
export async function translateTerm(
  word: string,
  onAttempt?: OnAttempt,
): Promise<TranslateOutcome> {
  const errors: string[] = [];

  for (const model of MODELS) {
    onAttempt?.({ model, status: 'trying' });

    // Race the edge-function call against a per-model timeout so the UI never hangs
    // indefinitely on a slow or unresponsive free-tier model.
    const invokePromise = supabase.functions.invoke<ProxyEnvelope>('openrouter', {
      body: {
        models: [model],
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Translate: "${word}"` },
        ],
        max_tokens: 350,
      },
    });

    const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) =>
      setTimeout(
        () =>
          resolve({
            data: null,
            error: { message: `Timeout sau ${PER_MODEL_TIMEOUT_MS / 1000}s` },
          }),
        PER_MODEL_TIMEOUT_MS
      )
    );

    const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

    if (error) {
      const msg = error.message;
      onAttempt?.({ model, status: 'failed', error: msg });
      errors.push(`${model}: ${msg}`);
      continue;
    }
    if (!data || data.errors?.length) {
      const msg = stripModelPrefix(data?.errors?.[0] ?? 'empty response', model);
      onAttempt?.({ model, status: 'failed', error: msg });
      errors.push(`${model}: ${msg}`);
      continue;
    }

    const content: string = data.data?.choices?.[0]?.message?.content ?? '';
    try {
      const parsed = JSON.parse(extractJson(content)) as Partial<TranslateResult>;
      const actualModel = data.model ?? model;
      onAttempt?.({ model: actualModel, status: 'succeeded' });
      return {
        result: {
          en: String(parsed.en ?? word),
          vi: String(parsed.vi ?? word),
          note: String(parsed.note ?? ''),
          isScrumTerm: Boolean(parsed.isScrumTerm),
          scrumEn: parsed.scrumEn ? String(parsed.scrumEn) : undefined,
          scrumVi: parsed.scrumVi ? String(parsed.scrumVi) : undefined,
        },
        model: actualModel,
      };
    } catch {
      const msg = `Invalid JSON: ${content.slice(0, 60)}`;
      onAttempt?.({ model, status: 'failed', error: msg });
      errors.push(`${model}: ${msg}`);
    }
  }

  throw new Error(`Tất cả model đều thất bại:\n${errors.join('\n')}`);
}

function stripModelPrefix(errMsg: string, model: string): string {
  const prefix = `${model}: `;
  return errMsg.startsWith(prefix) ? errMsg.slice(prefix.length) : errMsg;
}

/**
 * Extracts a JSON object from a model response. Handles cases where models
 * (notably Claude Haiku) wrap the JSON in markdown code fences despite being
 * told not to, or prepend/append explanatory prose.
 */
function extractJson(content: string): string {
  const trimmed = content.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/i);
  if (fenceMatch) return fenceMatch[1].trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}
