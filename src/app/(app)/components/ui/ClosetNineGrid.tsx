"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
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
  const phase = useGameStore((s) => s.phase);
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);
  const [previewActive, setPreviewActive] = useState<boolean>(false);
  const previewCloseTimerRef = useRef<number | null>(null);

  // listen for queue results
  (function useQueueListener() {
    const React = require('react') as typeof import('react');
    React.useEffect(() => {
      const unsub = tryOnQueue.onChange((job) => {
        if (job.status === 'succeeded' && job.images && job.images.length > 0) {
          // Suppress results UI during ShoppingSpree; only surface during Styling
          const currentPhase = useGameStore.getState().phase;
          if (currentPhase === 'ShoppingSpree') return;
          setResults(job.images);
          setTryOnItemId(job.itemId);
          setResultsOpen(true);
        }
      });
      return () => unsub();
    }, []);
  })();

  const slots = useMemo(() => Array.from({ length: 9 }).map((_, i) => wardrobe[i] || null), [wardrobe]);

  const canHover = () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const closePreview = () => {
    setPreviewActive(false);
    window.setTimeout(() => setPreviewItemId(null), 180);
  };

  const openPreview = (id: string) => {
    if (previewItemId === id && previewActive) return;
    if (previewCloseTimerRef.current) {
      window.clearTimeout(previewCloseTimerRef.current);
      previewCloseTimerRef.current = null;
    }
    setPreviewItemId(id);
    setPreviewActive(false);
    // Next frame to enable transition-in
    requestAnimationFrame(() => setPreviewActive(true));
  };

  const schedulePreviewClose = (id: string) => {
    if (previewItemId !== id) return;
    if (previewCloseTimerRef.current) window.clearTimeout(previewCloseTimerRef.current);
    previewCloseTimerRef.current = window.setTimeout(() => {
      closePreview();
      previewCloseTimerRef.current = null;
    }, 120);
  };

  // Close preview on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && previewItemId) closePreview(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [previewItemId]);

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
      <div className="relative h-[60vh] md:h-[70vh] flex items-center justify-center">
        {/* Centered closet background */}
        <img
          src="/FASHN%20ASSETS/Closet.png"
          alt="Closet"
          className="absolute inset-0 m-auto max-w-full max-h-full object-contain pointer-events-none select-none scale-110 translate-y-2 md:translate-y-4"
          />
        {/* Existing grid overlayed on top */}
        <div
          className="relative z-10 grid grid-cols-3 gap-2 md:gap-3 w-[50%] h-[50%] md:w-[45%] md:h-[45%]"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDropIntoGrid}
        >
          {slots.map((item, idx) => (
            <div key={idx} className="relative rounded-xl border border-dashed border-slate-300/70 dark:border-slate-600/50 bg-white/30 dark:bg-white/5 overflow-hidden">
              <div
                className="relative w-full h-full aspect-square flex items-center justify-center"
                onMouseLeave={() => { if (item) schedulePreviewClose(item.id); }}
              >
                {item ? (
                  <>
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="absolute inset-0 w-full h-full object-contain p-2"
                      onMouseEnter={() => { if (canHover()) openPreview(item.id); }}
                    />
                    {phase !== 'ShoppingSpree' && (
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
                    )}
                  </>
                ) : (
                  <div className="text-slate-500 text-xs">Empty</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hover Preview Modal (smaller with smooth animation) */}
      {previewItemId && (() => {
        const item = wardrobe.find((w) => w.id === previewItemId);
        if (!item) return null;
        return (
          <div
            className={`fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center transition-opacity duration-200 ease-out pointer-events-none ${previewActive ? 'opacity-100' : 'opacity-0'}`}
          >
            <div
              className={`relative transition-transform duration-200 ease-out pointer-events-none ${previewActive ? 'scale-100' : 'scale-95'}`}
            >
              <img
                src={item.imageUrl}
                alt={item.name}
                className="max-w-[56vw] max-h-[60vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              />
            </div>
          </div>
        );
      })()}

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
            // Do not change the center image during ShoppingSpree; only queue try-on
            const currentPhase = useGameStore.getState().phase;
            if (currentPhase !== 'ShoppingSpree') {
              await selectImage(base.imageUrl, { type: 'avatar', description: 'Base image selection', addToHistory: false });
            }
            await tryOnQueue.enqueue({ baseImageId: base.imageId ?? null, baseImageUrl: base.imageUrl, item });
          } finally {
            setPickerForItemId(null);
          }
        }}
      />
    </GlassPanel>
  );
}


