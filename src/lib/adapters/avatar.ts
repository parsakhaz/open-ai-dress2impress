// OpenAI Images Edits adapter for avatar generation

export async function generateAvatarFromSelfie(selfieImageUrl: string): Promise<string[]> {
  const res = await fetch('/api/avatar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageDataUrl: selfieImageUrl }),
  });
  if (!res.ok) throw new Error('Avatar API failed');
  const data = (await res.json()) as { images: string[] };
  return data.images;
}


