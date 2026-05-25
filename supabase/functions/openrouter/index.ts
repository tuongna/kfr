/**
 * Supabase Edge Function — OpenRouter proxy
 *
 * Keeps the OPENROUTER_API_KEY server-side.
 * Client sends: { models?: string[], model?: string, messages, max_tokens? }
 * - `models` (preferred): list of model ids tried in order; first 2xx wins.
 * - `model` (legacy): single model id, equivalent to `models: [model]`.
 *
 * Always returns a 200 with `{ data?, model?, errors? }`. The proxy never
 * forwards OpenRouter's non-2xx status, because supabase-js v2 treats
 * non-2xx as an opaque "Failed to send a request" error that hides the
 * upstream message.
 *
 * Deploy:
 *   supabase functions deploy openrouter --no-verify-jwt
 *
 * Set secret:
 *   supabase secrets set OPENROUTER_API_KEY=sk-or-...
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const ALLOWED_ORIGINS = Deno.env.get('ALLOWED_ORIGINS') ?? '*';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // Supabase JS client sends x-client-info and may send apikey from browser
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_FALLBACK_MODELS = [
  // Prefer broadly available models; project can override with OPENROUTER_DEFAULT_MODELS
  'openai/gpt-4o-mini',
  'anthropic/claude-3.5-haiku',
  'meta-llama/llama-3.1-8b-instruct',
];

function parseDefaultModelsFromEnv(): string[] {
  const raw = Deno.env.get('OPENROUTER_DEFAULT_MODELS')?.trim();
  if (!raw) return DEFAULT_FALLBACK_MODELS;

  const parsed = raw
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);

  return parsed.length ? parsed : DEFAULT_FALLBACK_MODELS;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ errors: ['Method not allowed'] }, 200);
  }

  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) {
    return json({ errors: ['OPENROUTER_API_KEY not configured on edge function'] }, 200);
  }

  let body: {
    model?: string;
    models?: string[];
    messages: Array<{ role: string; content: string }>;
    max_tokens?: number;
  };

  try {
    body = await req.json();
  } catch {
    return json({ errors: ['Invalid JSON body'] }, 200);
  }

  const requested =
    (Array.isArray(body.models) && body.models.length ? body.models : null) ??
    (body.model ? [body.model] : []);

  // Always append service defaults so one bad client model does not hard-fail translation.
  const candidates = [...new Set([...requested, ...parseDefaultModelsFromEnv()])];

  const errors: string[] = [];

  for (const model of candidates) {
    try {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': Deno.env.get('SITE_URL') ?? 'https://tuongna.github.io',
          'X-Title': 'KfR Scrum Learning',
        },
        body: JSON.stringify({
          model,
          messages: body.messages,
          max_tokens: body.max_tokens ?? 512,
        }),
      });

      const raw = await response.text();
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        // OpenRouter is expected to always return JSON
      }

      if (!response.ok) {
        const msg =
          (parsed &&
            typeof parsed === 'object' &&
            (parsed as { error?: { message?: string } }).error?.message) ||
          raw.slice(0, 200) ||
          `HTTP ${response.status}`;
        errors.push(`${model}: ${msg}`);
        continue;
      }

      return json({ data: parsed, model }, 200);
    } catch (e) {
      errors.push(`${model}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return json({ errors }, 200);
});

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
