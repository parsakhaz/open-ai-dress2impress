"use client";
import { useState } from 'react';
import { useGameStore } from '@/lib/state/gameStore';
import WardrobeModal from '@/app/(app)/components/ui/WardrobeModal';
import { performTryOn } from '@/lib/adapters/fashn';
import { GlassPanel } from '@/components/GlassPanel';
import { GlassButton } from '@/components/GlassButton';

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
    <GlassPanel>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Wardrobe
            <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
              ({wardrobe.length} {wardrobe.length === 1 ? 'item' : 'items'})
            </span>
          </h3>
          <GlassButton size="sm" onClick={() => setOpen(true)}>
            {wardrobe.length > 0 ? 'View All' : 'Browse'}
          </GlassButton>
        </div>

        {wardrobe.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <p className="text-sm">Your wardrobe is empty</p>
            <p className="text-xs mt-1">Add items from shopping to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {wardrobe.slice(0, 4).map((w) => (
              <div key={w.id} className="group relative rounded-lg overflow-hidden bg-white/20 dark:bg-black/20 backdrop-blur-sm border border-white/30 dark:border-white/10 hover:border-accent/50 transition-colors">
                <img src={w.imageUrl} alt={w.name} className="w-full aspect-square object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs font-medium truncate mb-2">{w.name}</p>
                  <div className="flex gap-1">
                    <GlassButton
                      size="sm"
                      variant="secondary"
                      className="flex-1 text-xs"
                      onClick={() => tryOn(w.imageUrl)}
                      disabled={loadingId === w.imageUrl}
                    >
                      {loadingId === w.imageUrl ? 'Trying…' : 'Try On'}
                    </GlassButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <WardrobeModal open={open} onClose={() => setOpen(false)}>
        <div className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {wardrobe.map((w) => (
              <div key={w.id} className="group relative rounded-lg overflow-hidden bg-white/20 dark:bg-black/20 backdrop-blur-sm border border-white/30 dark:border-white/10 hover:border-accent/50 transition-colors">
                <img src={w.imageUrl} alt={w.name} className="w-full aspect-square object-cover" />
                <div className="p-3">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2 line-clamp-2">{w.name}</p>
                  <div className="flex gap-2">
                    <GlassButton
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => tryOn(w.imageUrl)}
                      disabled={loadingId === w.imageUrl}
                    >
                      {loadingId === w.imageUrl ? 'Trying…' : 'Try On'}
                    </GlassButton>
                    <GlassButton
                      size="sm"
                      variant="ghost"
                      onClick={() => setCurrentImage(w.imageUrl)}
                    >
                      Use
                    </GlassButton>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {variants.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Try-On Results</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {variants.map((u, i) => (
                  <div key={i} className="group relative rounded-lg overflow-hidden bg-white/20 dark:bg-black/20 backdrop-blur-sm border border-white/30 dark:border-white/10 hover:border-accent/50 transition-colors">
                    <img src={u} alt={`Variant ${i + 1}`} className="w-full aspect-square object-cover" />
                    <div className="p-3">
                      <GlassButton 
                        size="sm" 
                        variant="primary"
                        className="w-full"
                        onClick={() => setCurrentImage(u)}
                      >
                        Use This
                      </GlassButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </WardrobeModal>
    </GlassPanel>
  );
}


