"use client";
import { useState } from 'react';
import { editImage } from '@/lib/adapters/edit';

export default function EditWithAIPanel() {
  const [imageUrl, setImageUrl] = useState('');
  const [instruction, setInstruction] = useState('add a silver necklace');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [variants, setVariants] = useState<string[]>([]);

  async function onEdit() {
    setLoading(true);
    setError(null);
    try {
      const urls = await editImage(imageUrl, instruction);
      setVariants(urls);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Edit failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border rounded p-3 bg-white">
      <div className="flex gap-2 mb-3">
        <input
          className="border rounded px-2 py-1 flex-1"
          placeholder="Base image URL"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          suppressHydrationWarning
        />
        <input
          className="border rounded px-2 py-1 flex-1"
          placeholder="Instruction"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          suppressHydrationWarning
        />
        <button className="px-3 py-1 bg-black text-white rounded" onClick={onEdit} disabled={loading}>
          {loading ? 'Editing…' : 'Edit with AI'}
        </button>
      </div>
      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {variants.map((url, i) => (
          <img key={i} src={url} alt={`variant ${i + 1}`} className="w-full h-40 object-cover border rounded" />
        ))}
      </div>
    </div>
  );
}


