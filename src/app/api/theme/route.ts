import { NextRequest } from 'next/server';
import { createHandler } from '@/lib/util/apiRoute';
import { withTimeout } from '@/lib/util/http';

export const runtime = 'nodejs';
export const maxDuration = 120;

function parseThemes(text: string): string[] {
  try {
    const json = JSON.parse(text);
    if (Array.isArray(json)) {
      return json.map((s) => String(s)).filter((s) => s.length > 0).slice(0, 15);
    }
    if (Array.isArray(json?.themes)) {
      return json.themes.map((s: unknown) => String(s)).filter((s: string) => s.length > 0).slice(0, 15);
    }
  } catch {}
  // Fallback: split by newline or comma
  const lines = text
    .split(/\r?\n|,/) 
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return lines.slice(0, 15);
}

// Read only the minimal OpenAI env required for this endpoint, so missing
// unrelated keys (e.g., RAPIDAPI_KEY) do not break theme generation.
function getOpenAIEnv() {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com';
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  return { OPENAI_API_KEY, OPENAI_BASE_URL };
}

export const POST = createHandler<{ context?: string }, { themes: string[] }>({
  parse: async (req: NextRequest) => {
    try {
      const body = await req.json();
      return { context: typeof body?.context === 'string' ? body.context : undefined };
    } catch {
      return { context: undefined };
    }
  },
  handle: async ({ context }) => {
    // Only require OpenAI credentials here
    const { OPENAI_API_KEY, OPENAI_BASE_URL } = getOpenAIEnv();
    const controller = new AbortController();
    const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => {
      controller.abort();
      reject(new Error('Timeout'));
    }, 5000));

    const fetchPromise = fetch(`${OPENAI_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        temperature: 0.9,
        max_tokens: 256,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You generate fun, varied, fashion game themes. Return JSON: {"themes": string[15]} only.' },
          { role: 'user', content: `Generate exactly 15 short fashion outfit challenge themes for a game. Keep each under 35 characters, punchy, diverse across streetwear, vintage, formal, seasonal, color-based, and occasion-based. ${context ? `Context: ${context}` : ''}` },
        ],
      }),
      signal: controller.signal,
    });

    let themes: string[] = [];
    try {
      const res = await Promise.race([fetchPromise, timeoutPromise]);
      if ((res as Response).ok) {
        const data = await (res as Response).json();
        const raw = data?.choices?.[0]?.message?.content || '';
        const parsed = (() => {
          try {
            const obj = JSON.parse(raw);
            return obj?.themes;
          } catch {
            return undefined;
          }
        })();
        if (Array.isArray(parsed)) {
          themes = parsed.map((s: unknown) => String(s)).filter((s: string) => s.length > 0).slice(0, 15);
        }
      }
    } catch {}

    if (themes.length < 15) {
      const fallback = [
        'Streetwear Night Out',
        'Cozy Coffee Date',
        'Vintage Thrift Haul',
        'Monochrome Minimalist',
        'Bold Color Pop',
        'Parisian Chic',
        'Y2K Remix',
        'Black-Tie Twist',
        'Festival Ready',
        'Beach Day Cool',
        'Smart Casual Friday',
        'Winter Layers',
        'Athleisure Luxe',
        'Denim on Denim',
        'All-Black Everything',
      ];
      themes = fallback;
    }
    return { themes };
  },
});


