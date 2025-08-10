import { NextRequest } from 'next/server';
import { createHandler } from '@/lib/util/apiRoute';

export const runtime = 'nodejs';
export const maxDuration = 30;

function getOpenAIEnv() {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com';
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  return { OPENAI_API_KEY, OPENAI_BASE_URL };
}

interface EvaluationResult {
  playerScore: number;
  aiScore: number;
  playerThemeScore: number;
  aiThemeScore: number;
  playerOutfitScore: number;
  aiOutfitScore: number;
  winner: 'player' | 'ai';
  reasoning: string;
}

export const POST = createHandler<
  { playerImageUrl: string; aiImageUrl: string; theme: string },
  EvaluationResult
>({
  parse: async (req: NextRequest) => {
    const body = await req.json();
    if (!body.playerImageUrl || !body.aiImageUrl || !body.theme) {
      throw new Error('Missing required fields: playerImageUrl, aiImageUrl, theme');
    }
    return {
      playerImageUrl: body.playerImageUrl,
      aiImageUrl: body.aiImageUrl,
      theme: body.theme,
    };
  },
  handle: async ({ playerImageUrl, aiImageUrl, theme }) => {
    const { OPENAI_API_KEY, OPENAI_BASE_URL } = getOpenAIEnv();
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    
    try {
      const response = await fetch(`${OPENAI_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.3,
          max_tokens: 500,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `You are a fashion expert judge evaluating outfits for a fashion competition. You must compare two looks based on the given theme and provide scores.

Evaluate each outfit on:
1. Theme Adherence (0-10): How well does the outfit match the given theme?
2. Outfit Quality (0-10): Overall style, coordination, and fashion sense

Return JSON with this exact structure:
{
  "playerThemeScore": number (0-10),
  "playerOutfitScore": number (0-10),
  "playerScore": number (average of above, 1 decimal),
  "aiThemeScore": number (0-10),
  "aiOutfitScore": number (0-10),
  "aiScore": number (average of above, 1 decimal),
  "winner": "player" or "ai" (whoever has higher overall score),
  "reasoning": "Brief explanation of scores and winner"
}`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Theme: "${theme}"

Please evaluate these two fashion looks and determine which one better represents the theme and has superior styling.`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: playerImageUrl,
                    detail: 'low'
                  }
                },
                {
                  type: 'text',
                  text: 'Above is Player 1\'s look.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: aiImageUrl,
                    detail: 'low'
                  }
                },
                {
                  type: 'text',
                  text: 'Above is Player 2 (AI)\'s look.'
                }
              ]
            }
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${error}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error('No evaluation content received from OpenAI');
      }

      try {
        const evaluation = JSON.parse(content) as EvaluationResult;
        
        // Validate the response has all required fields
        if (
          typeof evaluation.playerScore !== 'number' ||
          typeof evaluation.aiScore !== 'number' ||
          typeof evaluation.playerThemeScore !== 'number' ||
          typeof evaluation.aiThemeScore !== 'number' ||
          typeof evaluation.playerOutfitScore !== 'number' ||
          typeof evaluation.aiOutfitScore !== 'number' ||
          !['player', 'ai'].includes(evaluation.winner) ||
          typeof evaluation.reasoning !== 'string'
        ) {
          throw new Error('Invalid evaluation format');
        }
        
        return evaluation;
      } catch (parseError) {
        console.error('Failed to parse evaluation:', content);
        throw new Error('Failed to parse evaluation response');
      }
    } finally {
      clearTimeout(timeout);
    }
  },
});
