"use client";
import { useState } from 'react';
import { useGameStore } from '@/lib/state/gameStore';
import { performTryOn } from '@/lib/adapters/fashn';
import { GlassButton } from '@/components/GlassButton';
import { TryOnResultsModal } from '@/components/TryOnResultsModal';
import { selectImage } from '@/lib/services/stateActions';

interface WardrobeContentProps {
  onClose?: () => void;
}

export default function WardrobeContent({ onClose }: WardrobeContentProps = {}) {
  const wardrobe = useGameStore((s) => s.wardrobe);
  const character = useGameStore((s) => s.character);
  const currentImageUrl = useGameStore((s) => s.currentImageUrl);
  const history = useGameStore((s) => s.history);
  const setCurrentImage = useGameStore((s) => s.setCurrentImage);
  const addToHistory = useGameStore((s) => s.addToHistory);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [variants, setVariants] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showTryOnModal, setShowTryOnModal] = useState(false);

  async function tryOn(itemImageUrl: string) {
    const mostRecentImage = currentImageUrl || history[history.length - 1]?.imageUrl || character?.avatarUrl;
    if (!mostRecentImage) {
      setError('No base image found. Select an avatar or choose a recent image first.');
      return;
    }
    setError(null);
    setLoadingId(itemImageUrl);
    try {
      const urls = await performTryOn(mostRecentImage, itemImageUrl);
      setVariants(urls);
      if (urls.length > 0) {
        setShowTryOnModal(true);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Try-on failed');
    } finally {
      setLoadingId(null);
    }
  }

  if (wardrobe.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500 dark:text-slate-400">
        <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <h3 className="text-lg font-medium mb-2">Your wardrobe is empty</h3>
        <p className="text-sm">Add items from shopping to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {wardrobe.map((item) => (
          <div key={item.id} className="group relative rounded-lg overflow-hidden bg-white/20 dark:bg-black/20 backdrop-blur-sm border border-white/30 dark:border-white/10 hover:border-accent/50 transition-colors">
            <div className="relative w-full aspect-square overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
              {/* Blurred background */}
              <img src={item.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover blur-xl opacity-50" />
              {/* Main image */}
              <img src={item.imageUrl} alt={item.name} className="relative w-full h-full object-contain p-2" />
            </div>
            <div className="p-3">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2 line-clamp-2">{item.name}</p>
              <div className="flex gap-2">
                <GlassButton
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => tryOn(item.imageUrl)}
                  disabled={loadingId === item.imageUrl}
                >
                  {loadingId === item.imageUrl ? 'Trying…' : 'Try On'}
                </GlassButton>
                <GlassButton
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await selectImage(item.imageUrl, { type: 'tryOn', description: `Direct use: ${item.name}`, addToHistory: true });
                  }}
                  title="Use directly"
                >
                  Use
                </GlassButton>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Try-On Results Modal */}
      <TryOnResultsModal
        isOpen={showTryOnModal}
        onClose={() => setShowTryOnModal(false)}
        results={variants}
        onSelect={async (imageUrl) => {
          await selectImage(imageUrl, { type: 'tryOn', description: 'Try-on result', addToHistory: true });
          onClose?.();
        }}
      />
    </div>
  );
}