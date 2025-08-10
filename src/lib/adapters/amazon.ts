import type { WardrobeItem } from '@/types';
import { api } from '@/lib/api/client';

export async function searchAmazon(query: string): Promise<WardrobeItem[]> {
  const data = await api.amazon({ query });
  return (data.products || [])
    .map((product): WardrobeItem | null => {
      if (!product.asin || !product.product_title || !product.product_photo) {
        return null;
      }
      return {
        id: product.asin,
        name: product.product_title,
        imageUrl: product.product_photo,
        buyLink: product.product_url,
        price: product.product_price,
        source: 'amazon',
        category: 'top',
      };
    })
    .filter((p): p is WardrobeItem => p !== null)
    .slice(0, 8);
}


