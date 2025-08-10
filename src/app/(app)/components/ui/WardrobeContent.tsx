"use client";
import { useState } from 'react';
import { useGameStore } from '@/lib/state/gameStore';
import { GlassButton } from '@/components/GlassButton';
import { TryOnResultsModal } from '@/components/TryOnResultsModal';
import { selectImage } from '@/lib/services/stateActions';
import { BaseImagePickerModal } from '@/app/(app)/components/modals/BaseImagePickerModal';
import { tryOnQueue } from '@/lib/services/tryOnQueue';
import { getAllImagesByItem, getLatestSucceededByItem } from '@/lib/services/tryOnRepo';

interface WardrobeContentProps {
  onClose?: () => void;
}

export default function WardrobeContent({ onClose }: WardrobeContentProps = {}) {
  const wardrobe = useGameStore((s) => s.wardrobe);
  const [error, setError] = useState<string | null>(null);
  const [showBasePicker, setShowBasePicker] = useState<string | null>(null); // itemId when picking
  const [showTryOnModal, setShowTryOnModal] = useState(false);
  const [variants, setVariants] = useState<string[]>([]);
  const [tryOnItemId, setTryOnItemId] = useState<string | null>(null); // Track itemId for try-on results
  const [autoLayering, setAutoLayering] = useState<{ pending: boolean; itemId?: string | null }>({ pending: false, itemId: null });

  async function onPickBaseAndEnqueue(itemId: string, itemImageUrl: string) {
    // Prefer aggregated results across all bases
    const imgs = await getAllImagesByItem(itemId);
    if (imgs && imgs.length > 0) {
      setVariants(imgs);
      setTryOnItemId(itemId);
      setShowTryOnModal(true);
      return;
    }
    setShowBasePicker(itemId);
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

  // Listen for background job completions and open results modal
  // We keep it simple: show modal for the latest completed job
  // and let the user apply a result image, which updates the avatar/home via selectImage
  // eslint-disable-next-line react-hooks/rules-of-hooks
  (function useQueueListener() {
    const React = require('react') as typeof import('react');
    React.useEffect(() => {
      const unsub = tryOnQueue.onChange((job) => {
        if (job.status === 'succeeded' && job.images && job.images.length > 0) {
          // Defensive: if this ever renders during ShoppingSpree, suppress results UI
          const currentPhase = require('@/lib/state/gameStore').useGameStore.getState().phase as string;
          if (currentPhase === 'ShoppingSpree') return;
          setVariants(job.images);
          setTryOnItemId(job.itemId);
          setShowTryOnModal(true);
        }
      });
      return () => unsub();
    }, []);
  })();

  // Listen for "run on another base" requests from the TryOnResultsModal (fallback)
  (function useRunAnotherBaseListener() {
    const React = require('react') as typeof import('react');
    React.useEffect(() => {
      const handler = async (e: Event) => {
        const custom = e as CustomEvent<{ itemId?: string }>;
        const itemId = custom.detail?.itemId;
        if (!itemId) return;
        setShowBasePicker(itemId);
      };
      window.addEventListener('TRYON_RUN_ANOTHER_BASE', handler as EventListener);
      return () => window.removeEventListener('TRYON_RUN_ANOTHER_BASE', handler as EventListener);
    }, []);
  })();

  if (wardrobe.length === 0) {
    return (
      <div className="text-center py-16 text-foreground/60">
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
        <div className="p-3 rounded-lg bg-foreground/10 border border-foreground/20 text-foreground text-sm">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {wardrobe.map((item) => (
          <div
            key={item.id}
            className="group relative rounded-lg overflow-hidden bg-background border border-border hover:border-foreground/50 transition-colors"
            onMouseEnter={() => { setHoveredId(item.id); void ensurePreview(item.id); }}
            onMouseLeave={() => { setHoveredId((id) => (id === item.id ? null : id)); }}
          >
            <div className="relative w-full aspect-square overflow-hidden bg-muted">
              {/* Blurred background */}
              <img src={item.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover blur-xl opacity-50" />
              {/* Main image */}
              <img src={item.imageUrl} alt={item.name} className="relative w-full h-full object-contain p-2" />
              {/* Hover Preview Overlay */}
              {hoveredId === item.id && canHover() && (
                <div className="absolute inset-0 bg-foreground/60 flex items-center justify-center p-2">
                  {previewById[item.id]?.status === 'loading' && (
                    <div className="text-background/90 text-xs">Loading preview…</div>
                  )}
                  {previewById[item.id]?.status === 'ready' && previewById[item.id]?.url && (
                    <div className="relative w-full h-full">
                      <img src={previewById[item.id]!.url!} alt="Latest try-on" className="absolute inset-0 w-full h-full object-contain" />
                      <div className="absolute top-2 left-2 text-[10px] px-2 py-1 rounded bg-foreground/20 text-background">Latest try-on</div>
                    </div>
                  )}
                  {previewById[item.id]?.status === 'none' && (
                    <div className="text-background/90 text-xs">No try-on yet</div>
                  )}
                  {previewById[item.id]?.status === 'error' && (
                    <div className="text-background/90 text-xs">Preview unavailable</div>
                  )}
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="text-sm font-medium text-foreground mb-2 line-clamp-2">{item.name}</p>
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
            // Keep current center image; don't switch to base avatar immediately
            await tryOnQueue.enqueue({ baseImageId: base.imageId ?? null, baseImageUrl: base.imageUrl, item });
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to queue try-on');
          } finally {
            setShowBasePicker(null);
          }
        }}
      />

      {/* Try-On Results Modal (opens when a background job completes) */}
      <TryOnResultsModal
        isOpen={showTryOnModal}
        onClose={() => {
          setShowTryOnModal(false);
          setTryOnItemId(null);
        }}
        itemId={tryOnItemId || undefined}
        results={variants}
        onSelect={async (imageUrl) => {
          await selectImage(imageUrl, { type: 'tryOn', description: 'Try-on result', addToHistory: true });
          onClose?.();
        }}
        onRequestChangeBase={(id) => {
          setShowTryOnModal(false);
          setShowBasePicker(id);
        }}
      />
    </div>
  );
}