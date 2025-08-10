"use client";
import { useMemo } from 'react';
import { GlassPanel } from '@/components/GlassPanel';
import { GlassButton } from '@/components/GlassButton';
import { useGameStore } from '@/lib/state/gameStore';

interface BaseImagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (base: { imageId?: string | null; imageUrl: string }) => void;
}

export function BaseImagePickerModal({ isOpen, onClose, onSelect }: BaseImagePickerModalProps) {
  const character = useGameStore((s) => s.character);
  const history = useGameStore((s) => s.history);
  const currentImageUrl = useGameStore((s) => s.currentImageUrl);

  const candidates = useMemo(() => {
    const list: Array<{ key: string; label: string; imageUrl: string; imageId?: string | null }> = [];
    if (currentImageUrl) list.push({ key: `current`, label: 'Current Image', imageUrl: currentImageUrl, imageId: null });
    if (character?.avatarUrl) list.push({ key: `avatar`, label: 'Avatar', imageUrl: character.avatarUrl, imageId: null });
    // Recent edits first
    const edits = history
      .filter((h) => h.type === 'edit' || h.type === 'tryOn')
      .slice(-10)
      .reverse();
    for (const h of edits) {
      list.push({ key: `hist_${h.id}`, label: 'Edit History', imageUrl: h.imageUrl, imageId: h.imageId || null });
    }
    return list;
  }, [character, history, currentImageUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="fixed inset-0" onClick={onClose} />
      <GlassPanel variant="modal" className="relative w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 space-y-4 flex flex-col h-full min-h-0">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Select Base Image</h3>
            <GlassButton size="sm" variant="ghost" onClick={onClose} className="w-8 h-8 p-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </GlassButton>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {candidates.map((c) => (
                <button
                  key={c.key}
                  className="group relative rounded-xl overflow-hidden bg-white/20 dark:bg-black/20 border border-white/30 dark:border-white/10 hover:border-accent/50 hover:scale-[1.02] transition-all"
                  onClick={() => onSelect({ imageId: c.imageId ?? null, imageUrl: c.imageUrl })}
                >
                  <div className="relative w-full aspect-[3/4] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
                    <img src={c.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover blur-xl opacity-50" />
                    <img src={c.imageUrl} alt="" className="relative w-full h-full object-contain p-2" />
                  </div>
                  <div className="absolute bottom-2 left-2 rounded bg-black/60 text-white text-xs px-2 py-1">
                    {c.label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}


