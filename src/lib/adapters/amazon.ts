import type { WardrobeItem } from '@/types';

export async function searchAmazon(query: string): Promise<WardrobeItem[]> {
  const res = await fetch('/api/amazon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error('Amazon API failed');
  const data = (await res.json()) as {
    products: {
      asin: string;
      product_title: string;
      product_photo: string;
      product_url: string;
      product_price: string | null;
    }[];
  };
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


