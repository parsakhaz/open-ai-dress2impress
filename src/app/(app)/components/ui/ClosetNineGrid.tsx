"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { GlassPanel } from '@/components/GlassPanel';
import { GlassButton } from '@/components/GlassButton';
import { useGameStore } from '@/lib/state/gameStore';
import { TryOnResultsModal } from '@/components/TryOnResultsModal';
import { BaseImagePickerModal } from '@/app/(app)/components/modals/BaseImagePickerModal';
import { tryOnQueue } from '@/lib/services/tryOnQueue';
import { selectImage } from '@/lib/services/stateActions';
import { getLatestSucceededByItem } from '@/lib/services/tryOnRepo';
import { MAX_WARDROBE_ITEMS } from '@/lib/constants';

export default function ClosetNineGrid() {
  const wardrobe = useGameStore((s) => s.wardrobe);
  const addToWardrobe = useGameStore((s) => s.addToWardrobe);
  const history = useGameStore((s) => s.history);
  const currentImageUrl = useGameStore((s) => s.currentImageUrl);
  const character = useGameStore((s) => s.character);
  const [pickerForItemId, setPickerForItemId] = useState<string | null>(null);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [tryOnItemId, setTryOnItemId] = useState<string | null>(null);
  const phase = useGameStore((s) => s.phase);
  const isShoppingSpree = phase === 'ShoppingSpree';
  
  // Debug logging
  useEffect(() => {
    console.log('[ClosetNineGrid] Phase:', phase, 'Wardrobe items:', wardrobe.length, wardrobe);
  }, [phase, wardrobe]);
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);
  const [previewActive, setPreviewActive] = useState<boolean>(false);
  const previewCloseTimerRef = useRef<number | null>(null);

  // listen for queue results
  (function useQueueListener() {
    const React = require('react') as typeof import('react');
    React.useEffect(() => {
      const unsub = tryOnQueue.onChange((job) => {
        if (job.status === 'succeeded' && job.images && job.images.length > 0) {
          const currentPhase = useGameStore.getState().phase;
          if (currentPhase === 'StylingRound') {
            void selectImage(job.images[0], { type: 'tryOn', description: 'Try-on result', addToHistory: true });
            return;
          }
          // Suppress results UI during ShoppingSpree; surface elsewhere (e.g., GameBoard center)
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

  const baseUrl = useMemo(() => {
    const latest = [...history].reverse().find((h) => h.type === 'edit' || h.type === 'tryOn');
    return latest?.imageUrl || currentImageUrl || character?.avatarUrl || null;
  }, [history, currentImageUrl, character?.avatarUrl]);

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
    <GlassPanel className="h-full flex flex-col">
      <div className="flex items-center justify-center mb-3">
        <h3 className="text-base font-semibold text-foreground">{phase === 'StylingRound' ? 'Wardrobe' : 'Add clothes here'}</h3>
      </div>
      
      {/* Show empty state if no wardrobe items in StylingRound */}
      {phase === 'StylingRound' && wardrobe.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <svg className="w-16 h-16 mx-auto text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-foreground/60">No items in wardrobe</p>
            <p className="text-sm text-foreground/40">Add items during shopping round</p>
          </div>
        </div>
      )}
      
      {/* Show grid if there are items or in ShoppingSpree */}
      {(wardrobe.length > 0 || phase !== 'StylingRound') && (
        <div className={phase === 'StylingRound' 
          ? "relative flex-1 min-h-0 h-full flex items-center justify-center py-2 mt-4 md:mt-6"
          : `relative h-[60vh] md:h-[70vh] flex items-center justify-center ${isShoppingSpree ? 'mt-14 md:mt-20' : ''}`
        }>
        {/* Centered closet background */}
        <img
          src="/FASHN%20ASSETS/Closet.png"
          alt="Closet"
          aria-hidden
          className={phase === 'StylingRound' 
            ? "absolute inset-0 z-[1] m-auto max-w-full max-h-full object-contain pointer-events-none select-none scale-125 translate-y-6 md:translate-y-8"
            : `absolute inset-0 z-0 m-auto max-w-full max-h-full object-contain pointer-events-none select-none scale-110 ${isShoppingSpree ? 'translate-y-4 md:translate-y-6' : 'translate-y-2 md:translate-y-4'}`
          }
        />
        {/* Existing grid overlayed on top */}
        <div
          className={phase === 'StylingRound' 
            ? "relative z-[2] grid grid-cols-3 gap-3 md:gap-4 w-[75%] h-[75%] md:w-[78%] md:h-[78%]"
            : "relative z-10 grid grid-cols-3 gap-2 md:gap-3 w-[50%] h-[50%] md:w-[45%] md:h-[45%]"
          }
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDropIntoGrid}
        >
          {slots.map((item, idx) => (
            <div key={idx} className={phase === 'StylingRound' 
              ? "relative rounded-2xl border border-border bg-background/80 dark:bg-background/40 overflow-hidden shadow-sm"
              : "relative rounded-xl border border-dashed border-border bg-background overflow-hidden"
            }>
              <div
                className="relative w-full h-full aspect-square flex items-center justify-center"
                onMouseLeave={() => { if (item && phase === 'ShoppingSpree') schedulePreviewClose(item.id); }}
                onClick={() => { if (item && phase === 'StylingRound') { void (async () => {
                  const latest = await getLatestSucceededByItem(item.id);
                  if (latest?.images && latest.images[0]) {
                    await selectImage(latest.images[0], { type: 'tryOn', description: 'Applied from wardrobe', addToHistory: true });
                    return;
                  }
                  if (!baseUrl) return;
                  await tryOnQueue.enqueue({ baseImageId: null, baseImageUrl: baseUrl, item });
                })(); } }}
                title={item && phase === 'StylingRound' ? 'Apply to avatar' : undefined}
                role={item && phase === 'StylingRound' ? 'button' : undefined}
              >
                {item ? (
                  <>
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className={phase === 'StylingRound' 
                        ? "absolute inset-0 w-full h-full object-contain p-3 md:p-4"
                        : "absolute inset-0 w-full h-full object-contain p-2"
                      }
                      onMouseEnter={() => { if (canHover() && phase === 'ShoppingSpree') openPreview(item.id); }}
                    />
                    {/* No Try On button or hover overlay in either phase */}
                  </>
                ) : (
                  <div className="text-foreground/60 text-xs">Empty</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Hover Preview Modal - only show in ShoppingSpree */}
      {phase === 'ShoppingSpree' && previewItemId && (() => {
        const item = wardrobe.find((w) => w.id === previewItemId);
        if (!item) return null;
        return (
          <div
            className={`fixed inset-0 z-[70] bg-[var(--color-overlay)] flex items-center justify-center transition-opacity duration-200 ease-out pointer-events-none ${previewActive ? 'opacity-100' : 'opacity-0'}`}
          >
            <div
              className={`relative transition-transform duration-200 ease-out pointer-events-none ${previewActive ? 'scale-100' : 'scale-95'}`}
            >
              <img
                src={item.imageUrl}
                alt={item.name}
                className="max-w-[56vw] max-h-[60vh] object-contain rounded-2xl shadow-2xl border border-border"
              />
            </div>
          </div>
        );
      })()}

      {/* Try-On Results Modal: suppressed in StylingRound since click applies */}
      {phase !== 'StylingRound' && (
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
      )}

      {/* Base Image Picker */}
      {phase !== 'StylingRound' && (
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
      )}
    </GlassPanel>
  );
}


