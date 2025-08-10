import { NextRequest } from 'next/server';
import { createHandler } from '@/lib/util/apiRoute';
import { getServerEnv } from '@/lib/util/env';

export const runtime = 'nodejs';
export const maxDuration = 120;

interface ReqBody { theme: string; baseImageUrl: string }
interface ResBody { instruction: string }

function validate(body: unknown): ReqBody {
  const b = body as Partial<ReqBody>;
  const theme = typeof b?.theme === 'string' && b.theme.trim().length > 0 ? b.theme.trim() : '';
  const baseImageUrl = typeof b?.baseImageUrl === 'string' && b.baseImageUrl.trim().length > 0 ? b.baseImageUrl.trim() : '';
  if (!theme) throw Object.assign(new Error('Theme is required'), { statusCode: 400 });
  if (!/^https?:|^data:/.test(baseImageUrl)) throw Object.assign(new Error('baseImageUrl must be http(s) or data URL'), { statusCode: 400 });
  return { theme, baseImageUrl };
}

export const POST = createHandler<ReqBody, ResBody>({
  parse: async (req: NextRequest) => validate(await req.json()),
  handle: async ({ theme }) => {
    const { OPENAI_API_KEY, OPENAI_BASE_URL } = getServerEnv();

    const sys = `You are a senior fashion stylist creating one short edit instruction for an image-edit model. Respond JSON only with key: instruction. Keep identity/pose/background. Focus on stylish, cohesive accessorizing aligned with the theme.`;
    const examples = `EXAMPLES\nTheme: "Summer rooftop party" → {"instruction":"add translucent amber sunglasses, gold chain, tan leather watch, soft peach makeup, white low-top sneakers; warm dusk vibe"}\nTheme: "90s streetwear" → {"instruction":"add black beanie, silver hoop earrings, chunky chain, retro tinted shades, scuffed white sneakers; cool film look"}\nTheme: "Tech gala" → {"instruction":"sleek side-part hair, subtle eyeliner, thin silver necklace, black patent heels, minimal chrome watch; cool studio light"}`;
    const user = `CONTEXT\nTheme: ${theme}\nAllowed edits: hair color/style; hats/caps/beanies; sunglasses/eyewear; makeup (blush, lip, liner, shadow, highlight); watches; wristbands; rings; necklaces; earrings; belts; bags; scarves; socks/tights; shoes/sneakers/boots; subtle garment color accents.\nConstraints: preserve identity and pose; keep white background; realistic lighting/shadows.\nOutput format: EXACT JSON → {"instruction": string}. Length 80–180 chars. No commentary.`;

    const body = {
      model: 'gpt-5-mini',
      temperature: 0.5,
      max_tokens: 140,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
        { role: 'user', content: examples },
        { role: 'user', content: 'Now generate for the current theme only.' },
      ],
    } as const;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const res = await fetch(`${OPENAI_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify(body),
        signal: controller.signal as any,
      });
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || '';
      let instruction = '';
      try {
        const parsed = JSON.parse(text);
        instruction = String(parsed?.instruction || '').trim();
      } catch {
        instruction = '';
      }
      if (!instruction) {
        instruction = 'add matte black sunglasses, thin silver chain, minimalist watch, white sneakers; soft neutral makeup';
      }
      if (instruction.length > 180) instruction = instruction.slice(0, 177) + '…';
      return { instruction };
    } finally {
      clearTimeout(timer);
    }
  },
});


