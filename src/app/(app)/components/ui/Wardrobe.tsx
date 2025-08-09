"use client";
import { useState } from 'react';
import { useGameStore } from '@/lib/state/gameStore';
import WardrobeModal from '@/app/(app)/components/ui/WardrobeModal';
import { performTryOn } from '@/lib/adapters/fashn';

export default function Wardrobe() {
  const wardrobe = useGameStore((s) => s.wardrobe);
  const character = useGameStore((s) => s.character);
  const setCurrentImage = useGameStore((s) => s.setCurrentImage);
  const [open, setOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [variants, setVariants] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function tryOn(itemImageUrl: string) {
    if (!character?.avatarUrl) {
      setError('Select an avatar first.');
      return;
    }
    setError(null);
    setLoadingId(itemImageUrl);
    try {
      const urls = await performTryOn(character.avatarUrl, itemImageUrl);
      setVariants(urls);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Try-on failed');
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="border rounded p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">Wardrobe</div>
        <button className="px-2 py-1 text-xs border rounded" onClick={() => setOpen(true)}>
          Open
        </button>
      </div>
      <WardrobeModal open={open} onClose={() => setOpen(false)}>
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {wardrobe.map((w) => (
            <div key={w.id} className="border rounded overflow-hidden">
              <img src={w.imageUrl} alt={w.name} className="w-full h-40 object-cover" />
              <div className="p-2 text-sm line-clamp-2">{w.name}</div>
              <div className="p-2 flex gap-2">
                <button
                  className="px-2 py-1 text-xs border rounded"
                  onClick={() => tryOn(w.imageUrl)}
                  disabled={loadingId === w.imageUrl}
                >
                  {loadingId === w.imageUrl ? 'Trying…' : 'Try On'}
                </button>
                <button
                  className="px-2 py-1 text-xs border rounded"
                  onClick={() => setCurrentImage(w.imageUrl)}
                >
                  Set as Current
                </button>
              </div>
            </div>
          ))}
        </div>
        {variants.length > 0 && (
          <div className="mt-4">
            <div className="font-medium mb-2">Variants</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {variants.map((u, i) => (
                <div key={i} className="border rounded overflow-hidden">
                  <img src={u} alt={`variant ${i + 1}`} className="w-full h-40 object-cover" />
                  <div className="p-2">
                    <button className="px-2 py-1 text-xs border rounded" onClick={() => setCurrentImage(u)}>
                      Use This
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </WardrobeModal>
    </div>
  );
}


