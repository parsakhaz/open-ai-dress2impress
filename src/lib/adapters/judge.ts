// OpenAI Chat Completions adapter for judging

const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.NEXT_PUBLIC_OPENAI_BASE_URL || 'https://api.openai.com';

interface JudgeResult {
  scores: {
    human: { theme: number; style: number; coordination: number; total: number };
    ai: { theme: number; style: number; coordination: number; total: number };
  };
  verdict: { winner: 'human' | 'ai'; justification: string };
}

const SYSTEM_PROMPT = (theme: string) => `You are a world-renowned fashion judge. You will be shown a series of frames from two 5-second videos of two contestants for the theme: "${theme}".

Evaluate each contestant on:
1. Theme Adherence (How well it fits the theme)
2. Style & Creativity (How original and stylish it is)
3. Outfit Coordination (How well the pieces work together)

Your response MUST be a single, valid JSON object and nothing else, with the following structure:
{
  "scores": {
    "human": { "theme": number, "style": number, "coordination": number, "total": number },
    "ai": { "theme": number, "style": number, "coordination": number, "total": number }
  },
  "verdict": {
    "winner": "human" | "ai",
    "justification": "A sharp, concise, and decisive paragraph explaining your reasoning and crowning the winner."
  }
}`;

export async function judgeFinalVideos(
  theme: string,
  humanFrameUrls: string[],
  aiFrameUrls: string[],
): Promise<JudgeResult> {
  if (!OPENAI_API_KEY) throw new Error('OpenAI API key not set');

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${OPENAI_API_KEY}`,
  } as const;

  // Using a vision-capable chat model like gpt-4o or gpt-4.1
  const res = await fetch(`${OPENAI_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT(theme) },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Evaluate the two contestants based on the provided frames.' },
            ...humanFrameUrls.map((url) => ({ type: 'image_url', image_url: { url } })),
            ...aiFrameUrls.map((url) => ({ type: 'image_url', image_url: { url } })),
          ],
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) throw new Error('OpenAI judge call failed');
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Judge returned no content');
  let parsed: JudgeResult;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Judge returned non-JSON content');
  }
  return parsed;
}


