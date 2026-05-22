/**
 * Supabase Edge Function — OpenRouter proxy
 *
 * Keeps the OPENROUTER_API_KEY server-side.
 * Client sends: { model, messages, max_tokens? }
 * This function forwards to OpenRouter and streams/returns the response.
 *
 * Deploy:
 *   supabase functions deploy openrouter --no-verify-jwt
 *
 * Set secret (from GitHub Actions or CLI):
 *   supabase secrets set OPENROUTER_API_KEY=sk-or-...
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const ALLOWED_ORIGINS = Deno.env.get('ALLOWED_ORIGINS') ?? '*';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'OPENROUTER_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let body: {
    model?: string;
    messages: Array<{ role: string; content: string }>;
    max_tokens?: number;
  };

  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Default to a capable free multilingual model (good Vietnamese + domain terms).
  // Swap this single line to try another model, e.g. 'openai/gpt-oss-20b:free'.
  const model = body.model ?? 'google/gemini-2.0-flash-exp:free';

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

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
