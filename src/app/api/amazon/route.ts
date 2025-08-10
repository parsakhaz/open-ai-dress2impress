import { NextRequest } from 'next/server';
import { createHandler } from '@/lib/util/apiRoute';
import { guards } from '@/lib/util/validation';
import { getServerEnv } from '@/lib/util/env';
import { typedFetch } from '@/lib/util/http';

interface RapidProduct {
  asin: string;
  product_title: string;
  product_photo: string;
  product_url: string;
  product_price: string | null;
}

export const POST = createHandler<{ query: string }, { products: RapidProduct[] }>({
  parse: async (req: NextRequest) => guards.amazon(await req.json()),
  handle: async ({ query }) => {
    const { RAPIDAPI_KEY, RAPIDAPI_HOST } = getServerEnv();
    const url = `https://${RAPIDAPI_HOST}/search?query=${encodeURIComponent(query)}&page=1&country=US&sort_by=RELEVANCE&category_id=fashion`;
    const data = await typedFetch<{ data?: { products?: RapidProduct[] } }>(
      url,
      { headers: { 'x-rapidapi-key': RAPIDAPI_KEY, 'x-rapidapi-host': RAPIDAPI_HOST } },
      { apiName: 'RapidAPI' }
    );
    return { products: data.data?.products ?? [] };
  },
});

