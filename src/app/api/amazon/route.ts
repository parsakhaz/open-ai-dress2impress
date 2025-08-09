import { NextRequest } from 'next/server';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;

interface RapidProduct {
  asin: string;
  product_title: string;
  product_photo: string;
  product_url: string;
  product_price: string | null;
}

export async function POST(req: NextRequest) {
  try {
    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST) {
      return new Response('RapidAPI credentials not set', { status: 500 });
    }
    const { query } = (await req.json()) as { query: string };
    if (!query) return new Response('Missing query', { status: 400 });

    const url = `https://${RAPIDAPI_HOST}/search?query=${encodeURIComponent(query)}&page=1&country=US&sort_by=RELEVANCE&category_id=fashion`;
    const res = await fetch(url, {
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST,
      },
    });
    if (!res.ok) {
      const text = await res.text();
      return new Response(`RapidAPI error: ${res.status} ${text}`, { status: 500 });
    }
    const data = (await res.json()) as { data?: { products?: RapidProduct[] } };
    const products = data.data?.products ?? [];
    return Response.json({ products });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return new Response(message, { status: 500 });
  }
}


