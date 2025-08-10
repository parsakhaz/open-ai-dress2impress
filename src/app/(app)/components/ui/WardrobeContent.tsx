"use client";
import { useState } from 'react';
import { useGameStore } from '@/lib/state/gameStore';
import { GlassButton } from '@/components/GlassButton';
import { selectImage } from '@/lib/services/stateActions';
import { BaseImagePickerModal } from '@/app/(app)/components/modals/BaseImagePickerModal';
import { tryOnQueue } from '@/lib/services/tryOnQueue';

interface WardrobeContentProps {
  onClose?: () => void;
}

export default function WardrobeContent({ onClose }: WardrobeContentProps = {}) {
  const wardrobe = useGameStore((s) => s.wardrobe);
  const [error, setError] = useState<string | null>(null);
  const [showBasePicker, setShowBasePicker] = useState<string | null>(null); // itemId when picking

  async function onPickBaseAndEnqueue(itemId: string, itemImageUrl: string) {
    setShowBasePicker(itemId);
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
                  onClick={() => onPickBaseAndEnqueue(item.id, item.imageUrl)}
                >
                  Try On
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

      {/* Base Image Picker for enqueueing background try-on */}
      <BaseImagePickerModal
        isOpen={!!showBasePicker}
        onClose={() => setShowBasePicker(null)}
        onSelect={async (base) => {
          const item = wardrobe.find((w) => w.id === showBasePicker!);
          if (!item) return;
          try {
            await tryOnQueue.enqueue({ baseImageId: base.imageId ?? null, baseImageUrl: base.imageUrl, item });
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to queue try-on');
          } finally {
            setShowBasePicker(null);
          }
        }}
      />
    </div>
  );
}