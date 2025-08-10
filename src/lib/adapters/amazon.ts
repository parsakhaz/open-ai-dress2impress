import type { WardrobeItem } from '@/types';
import { api } from '@/lib/api/client';
import type { AmazonSearchRequest } from '@/lib/api/types';

export async function searchAmazon(query: string, options?: Partial<AmazonSearchRequest> & { categoryTag?: 'top' | 'bottom' | 'dress' }): Promise<WardrobeItem[]> {
  const { categoryTag, ...rest } = options || {};
  const data = await api.amazon({ query, ...rest });
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
        category: categoryTag || 'top',
      };
    })
    .filter((p): p is WardrobeItem => p !== null);
}


