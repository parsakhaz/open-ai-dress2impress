// OpenAI Images Edits adapter for general image editing

export async function editImage(baseImageUrl: string, userInstruction: string): Promise<string[]> {
  const res = await fetch('/api/edit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ baseImageUrl, instruction: userInstruction }),
  });
  if (!res.ok) throw new Error('Edit API failed');
  const data = (await res.json()) as { images: string[] };
  return data.images;
}


