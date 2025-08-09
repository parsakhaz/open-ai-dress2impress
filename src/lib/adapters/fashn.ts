export async function performTryOn(characterImageUrl: string, clothingImageUrl: string): Promise<string[]> {
  const res = await fetch('/api/tryon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterImageUrl, clothingImageUrl }),
  });
  if (!res.ok) throw new Error('Try-on API failed');
  const data = (await res.json()) as { images: string[] };
  return data.images;
}


