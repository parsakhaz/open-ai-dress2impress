import { NextRequest } from 'next/server';
import { createHandler } from '@/lib/util/apiRoute';
import { guards } from '@/lib/util/validation';
import { getServerEnv } from '@/lib/util/env';
import { typedFetch, withTimeout } from '@/lib/util/http';
import type { AmazonSearchRequest } from '@/lib/api/types';

interface RapidProduct {
  asin: string;
  product_title: string;
  product_photo: string;
  product_url: string;
  product_price: string | null;
}

export const POST = createHandler<AmazonSearchRequest, { products: RapidProduct[] }>({
  parse: async (req: NextRequest) => await req.json(),
  handle: async ({ query, categoryId, page = 1, country = 'US', sort_by = 'RELEVANCE', product_condition = 'ALL', is_prime = false, deals_and_discounts = 'NONE', category, min_price, max_price, brand, seller_id, four_stars_and_up, language, additional_filters, fields }) => {
    const { RAPIDAPI_KEY, RAPIDAPI_HOST } = getServerEnv();
    let endpoint: string;
    if (categoryId) {
      endpoint = `products-by-category?category_id=${encodeURIComponent(categoryId)}&page=${page}&country=${country}&sort_by=${sort_by}&product_condition=${product_condition}&is_prime=${is_prime}&deals_and_discounts=${deals_and_discounts}`;
    } else if (query) {
      // Normalize user query: append "clothes" if not present to steer toward apparel
      const normalized = String(query).trim();
      const hasClothes = /(^|\b)clothes(\b|$)/i.test(normalized);
      const finalQuery = hasClothes || normalized.length === 0 ? normalized : `${normalized} clothes`;
      // Mirror Amazon's own search behavior
      const params = new URLSearchParams({
        query: finalQuery,
        page: String(page),
        country,
        sort_by,
        product_condition,
        is_prime: String(is_prime),
        deals_and_discounts,
      });
      if (category) params.set('category', category);
      if (min_price) params.set('min_price', String(min_price));
      if (max_price) params.set('max_price', String(max_price));
      if (brand) params.set('brand', brand);
      if (seller_id) params.set('seller_id', seller_id);
      if (four_stars_and_up !== undefined) params.set('four_stars_and_up', String(four_stars_and_up));
      if (language) params.set('language', language);
      if (additional_filters) params.set('additional_filters', additional_filters);
      if (fields) params.set('fields', fields);
      endpoint = `search?${params.toString()}`;
    } else {
      throw new Error('Either query or categoryId must be provided');
    }

    const url = `https://${RAPIDAPI_HOST}/${endpoint}`;
    const data = await withTimeout(
      typedFetch<{ data?: { products?: RapidProduct[] } }>(
        url,
        { headers: { 'x-rapidapi-key': RAPIDAPI_KEY, 'x-rapidapi-host': RAPIDAPI_HOST } },
        { apiName: 'RapidAPI' }
      ),
      15_000,
      'RapidAPI search timed out'
    );
    const products = data.data?.products ?? [];
    return { products };
  },
});

