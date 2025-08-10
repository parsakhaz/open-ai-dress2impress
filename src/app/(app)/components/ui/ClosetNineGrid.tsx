"use client";
import { useMemo, useState } from 'react';
import { GlassPanel } from '@/components/GlassPanel';
import { GlassButton } from '@/components/GlassButton';
import { useGameStore } from '@/lib/state/gameStore';
import { TryOnResultsModal } from '@/components/TryOnResultsModal';
import { BaseImagePickerModal } from '@/app/(app)/components/modals/BaseImagePickerModal';
import { tryOnQueue } from '@/lib/services/tryOnQueue';
import { selectImage } from '@/lib/services/stateActions';
import { MAX_WARDROBE_ITEMS } from '@/lib/constants';

export default function ClosetNineGrid() {
  const wardrobe = useGameStore((s) => s.wardrobe);
  const addToWardrobe = useGameStore((s) => s.addToWardrobe);
  const [pickerForItemId, setPickerForItemId] = useState<string | null>(null);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [tryOnItemId, setTryOnItemId] = useState<string | null>(null);

  // listen for queue results
  (function useQueueListener() {
    const React = require('react') as typeof import('react');
    React.useEffect(() => {
      const unsub = tryOnQueue.onChange((job) => {
        if (job.status === 'succeeded' && job.images && job.images.length > 0) {
          setResults(job.images);
          setTryOnItemId(job.itemId);
          setResultsOpen(true);
        }
      });
      return () => unsub();
    }, []);
  })();

  const slots = useMemo(() => Array.from({ length: 9 }).map((_, i) => wardrobe[i] || null), [wardrobe]);

  const onDropIntoGrid = (e: React.DragEvent<HTMLDivElement>) => {
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      const item = JSON.parse(raw);
      if (!item?.id) return;
      if (wardrobe.some((w) => w.id === item.id)) return; // already exists
      if (wardrobe.length >= MAX_WARDROBE_ITEMS) return; // respect cap
      addToWardrobe(item);
    } catch {}
  };

  return (
    <GlassPanel className="h-full">
      <div className="flex items-center justify-center mb-3">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Add clothes here</h3>
      </div>
      <div
        className="grid grid-cols-3 gap-4 md:gap-5 h-[60vh] md:h-[70vh]"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDropIntoGrid}
      >
        {slots.map((item, idx) => (
          <div key={idx} className="relative rounded-xl border border-dashed border-slate-300/70 dark:border-slate-600/50 bg-white/30 dark:bg-white/5 overflow-hidden">
            <div className="relative w-full h-full aspect-square flex items-center justify-center">
              {item ? (
                <>
                  <img src={item.imageUrl} alt={item.name} className="absolute inset-0 w-full h-full object-contain p-2" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-2 left-2 right-2 flex gap-2">
                      <GlassButton
                        size="sm"
                        variant="secondary"
                        className="flex-1"
                        onClick={() => setPickerForItemId(item.id)}
                      >
                        Try On
                      </GlassButton>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-slate-500 text-xs">Empty</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Try-On Results Modal */}
      <TryOnResultsModal
        isOpen={resultsOpen}
        onClose={() => { setResultsOpen(false); setTryOnItemId(null); }}
        itemId={tryOnItemId || undefined}
        results={results}
        onSelect={async (imageUrl) => {
          await selectImage(imageUrl, { type: 'tryOn', description: 'Try-on result', addToHistory: true });
        }}
        onRequestChangeBase={(id) => { setPickerForItemId(id); }}
      />

      {/* Base Image Picker */}
      <BaseImagePickerModal
        isOpen={!!pickerForItemId}
        onClose={() => setPickerForItemId(null)}
        onSelect={async (base) => {
          const item = wardrobe.find((w) => w.id === pickerForItemId!);
          if (!item) return;
          try {
            await selectImage(base.imageUrl, { type: 'avatar', description: 'Base image selection', addToHistory: false });
            await tryOnQueue.enqueue({ baseImageId: base.imageId ?? null, baseImageUrl: base.imageUrl, item });
          } finally {
            setPickerForItemId(null);
          }
        }}
      />
    </GlassPanel>
  );
}


