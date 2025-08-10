"use client";
import { useState } from 'react';
import { useGameStore } from '@/lib/state/gameStore';
import WardrobeModal from '@/app/(app)/components/ui/WardrobeModal';
import { GlassPanel } from '@/components/GlassPanel';
import { GlassButton } from '@/components/GlassButton';
import { BaseImagePickerModal } from '@/app/(app)/components/modals/BaseImagePickerModal';
import { tryOnQueue } from '@/lib/services/tryOnQueue';
import { TryOnResultsModal } from '@/components/TryOnResultsModal';
import { selectImage } from '@/lib/services/stateActions';
import { getAllImagesByItem, getLatestSucceededByItem } from '@/lib/services/tryOnRepo';

export default function Wardrobe() {
  const wardrobe = useGameStore((s) => s.wardrobe);
  const setCurrentImage = useGameStore((s) => s.setCurrentImage);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerForItemId, setPickerForItemId] = useState<string | null>(null);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [tryOnItemId, setTryOnItemId] = useState<string | null>(null); // Track itemId for try-on results
  const [autoLayering, setAutoLayering] = useState<{ pending: boolean; itemId?: string | null }>({ pending: false, itemId: null });

  async function onTryOnClick(itemId: string) {
    // Prefer aggregated results across all bases
    const imgs = await getAllImagesByItem(itemId);
    if (imgs && imgs.length > 0) {
      setResults(imgs);
      setTryOnItemId(itemId);
      setResultsOpen(true);
      return;
    }
    // Otherwise prompt for base image, then enqueue
    setPickerForItemId(itemId);
  }

  // Hover preview state for desktop-only preview of latest try-on
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [previewById, setPreviewById] = useState<Record<string, { status: 'idle' | 'loading' | 'ready' | 'none' | 'error'; url?: string }>>({});

  function canHover(): boolean {
    return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }

  async function ensurePreview(itemId: string) {
    if (!canHover()) return;
    const cached = previewById[itemId];
    if (cached && cached.status !== 'idle') return;
    setPreviewById((m) => ({ ...m, [itemId]: { status: 'loading' } }));
    try {
      const latest = await getLatestSucceededByItem(itemId);
      const url = latest?.images?.[0];
      if (url) {
        setPreviewById((m) => ({ ...m, [itemId]: { status: 'ready', url } }));
      } else {
        setPreviewById((m) => ({ ...m, [itemId]: { status: 'none' } }));
      }
    } catch {
      setPreviewById((m) => ({ ...m, [itemId]: { status: 'error' } }));
    }
  }

  // Listen for queue completions and show results
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

  // Listen for "run on another base" requests from the TryOnResultsModal
  (function useRunAnotherBaseListener() {
    const React = require('react') as typeof import('react');
    React.useEffect(() => {
      const handler = async (e: Event) => {
        const custom = e as CustomEvent<{ itemId?: string }>;
        const itemId = custom.detail?.itemId;
        if (!itemId) return;
        // Prefer using current image automatically; if absent, open base picker
        const currentImageUrl = useGameStore.getState().currentImageUrl;
        const item = useGameStore.getState().wardrobe.find((w) => w.id === itemId);
        if (!item) return;
        if (currentImageUrl) {
          try {
            setAutoLayering({ pending: true, itemId });
            await selectImage(currentImageUrl, { type: 'avatar', description: 'Base image selection', addToHistory: false });
            await tryOnQueue.enqueue({ baseImageId: null, baseImageUrl: currentImageUrl, item });
          } finally {
            setAutoLayering({ pending: false, itemId: null });
          }
        } else {
          setPickerForItemId(itemId);
        }
      };
      window.addEventListener('TRYON_RUN_ANOTHER_BASE', handler as EventListener);
      return () => window.removeEventListener('TRYON_RUN_ANOTHER_BASE', handler as EventListener);
    }, []);
  })();

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
              <div
                key={w.id}
                className="group relative rounded-lg overflow-hidden bg-white/20 dark:bg-black/20 backdrop-blur-sm border border-white/30 dark:border-white/10 hover:border-accent/50 transition-colors"
                onMouseEnter={() => { setHoveredId(w.id); void ensurePreview(w.id); }}
                onMouseLeave={() => { setHoveredId((id) => (id === w.id ? null : id)); }}
              >
                <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
                  {/* Blurred background */}
                  <img src={w.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover blur-xl opacity-50" />
                  {/* Main image (fit without crop) */}
                  <img src={w.imageUrl} alt={w.name} className="relative w-full h-full object-contain" />
                </div>
                {/* Hover Preview Overlay */}
                {hoveredId === w.id && canHover() && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2">
                    {previewById[w.id]?.status === 'loading' && (
                      <div className="text-white/80 text-xs">Loading preview…</div>
                    )}
                    {previewById[w.id]?.status === 'ready' && previewById[w.id]?.url && (
                      <div className="relative w-full h-full">
                        <img src={previewById[w.id]!.url!} alt="Latest try-on" className="absolute inset-0 w-full h-full object-contain" />
                        <div className="absolute top-2 left-2 text-[10px] px-2 py-1 rounded bg-white/20 text-white">Latest try-on</div>
                      </div>
                    )}
                    {previewById[w.id]?.status === 'none' && (
                      <div className="text-white/80 text-xs">No try-on yet</div>
                    )}
                    {previewById[w.id]?.status === 'error' && (
                      <div className="text-white/80 text-xs">Preview unavailable</div>
                    )}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs font-medium truncate mb-2">{w.name}</p>
                  <div className="flex gap-1">
                    <GlassButton
                      size="sm"
                      variant="secondary"
                      className="flex-1 text-xs"
                      onClick={() => { void onTryOnClick(w.id); }}
                    >
                      Try On
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
                <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
                  {/* Blurred background */}
                  <img src={w.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover blur-xl opacity-50" />
                  {/* Main image (fit without crop) */}
                  <img src={w.imageUrl} alt={w.name} className="relative w-full h-full object-contain p-2" />
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2 line-clamp-2">{w.name}</p>
                  <div className="flex gap-2">
                    <GlassButton
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => { void onTryOnClick(w.id); }}
                    >
                      Try On
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

          {/* Results display removed in favor of background queue + modal */}
        </div>
      </WardrobeModal>

      <TryOnResultsModal
        isOpen={resultsOpen}
        onClose={() => {
          setResultsOpen(false);
          setTryOnItemId(null);
        }}
        itemId={tryOnItemId || undefined}
        results={results}
        onSelect={async (imageUrl) => {
          await selectImage(imageUrl, { type: 'tryOn', description: 'Try-on result', addToHistory: true });
        }}
      />

      <BaseImagePickerModal
        isOpen={!!pickerForItemId}
        onClose={() => setPickerForItemId(null)}
        onSelect={async (base) => {
          const item = wardrobe.find((w) => w.id === pickerForItemId!);
          if (!item) return;
          try {
            // Immediately reflect the chosen base image on the center stage
            await selectImage(base.imageUrl, { type: 'avatar', description: 'Base image selection', addToHistory: false });
            await tryOnQueue.enqueue({ baseImageId: base.imageId ?? null, baseImageUrl: base.imageUrl, item });
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to queue try-on');
          } finally {
            setPickerForItemId(null);
          }
        }}
      />
    </GlassPanel>
  );
}


