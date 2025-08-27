// Server-side helpers for the AI player that call the same backends as the human
import { typedFetch } from '@/lib/util/http';
import type { Category } from './types';
import type { Product } from './types';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export async function searchRapid(query: string, category: Category): Promise<Product[]> {
  const RAPIDAPI_KEY = requireEnv('RAPIDAPI_KEY');
  const RAPIDAPI_HOST = requireEnv('RAPIDAPI_HOST');
  const params = new URLSearchParams({ query, page: '1', country: 'US', sort_by: 'RELEVANCE', product_condition: 'ALL', is_prime: 'false', deals_and_discounts: 'NONE' });
  const url = `https://${RAPIDAPI_HOST}/search?${params.toString()}`;
  const res = await typedFetch<{ data?: { products?: { asin: string; product_title: string; product_photo: string; product_url: string }[] } }>(url, {
    headers: { 'x-rapidapi-key': RAPIDAPI_KEY, 'x-rapidapi-host': RAPIDAPI_HOST },
  }, { apiName: 'RapidAPI' });
  const seen = new Set<string>();
  const products = (res.data?.products || [])
    .filter((p) => !!p.asin && !!p.product_title && !!p.product_photo)
    .filter((p) => (seen.has(p.asin) ? false : (seen.add(p.asin), true)))
    .map((p) => ({ id: p.asin, title: p.product_title, image: p.product_photo, url: p.product_url, category, provider: 'rapidapi' as const }));
  return products;
}

function baseUrl(): string {
  const envUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
  if (envUrl) return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  const port = process.env.APP_PORT || process.env.PORT || '3000';
  const base = `http://localhost:${port}`;
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

export async function tryOnFashn(avatarUrl: string, clothingImageUrl: string): Promise<string[]> {
  // Call our Next route to reuse concurrency/retry policies (absolute URL)
  const res = await typedFetch<{ images: string[] }>(`${baseUrl()}/api/tryon`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterImageUrl: avatarUrl, clothingImageUrl }),
  }, { apiName: 'FASHN' });
  return res.images || [];
}

export async function tryOnFashnData(modelDataUrl: string, garmentDataUrl: string): Promise<string[]> {
  const res = await typedFetch<{ images: string[] }>(`${baseUrl()}/api/tryon`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterImageUrl: modelDataUrl, clothingImageUrl: garmentDataUrl }),
  }, { apiName: 'FASHN' });
  return res.images || [];
}


