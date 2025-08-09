export async function generateWalkoutVideo(finalImageURL: string): Promise<string> {
  const res = await fetch('/api/video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl: finalImageURL }),
  });
  if (!res.ok) throw new Error('Video API failed');
  const data = (await res.json()) as { url: string };
  return data.url;
}


