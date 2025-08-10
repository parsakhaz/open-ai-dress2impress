"use client";
import { useState, useEffect } from 'react';
import { editImage } from '@/lib/adapters/edit';
import { GlassPanel } from '@/components/GlassPanel';
import { GlassButton } from '@/components/GlassButton';
import { useGameStore } from '@/lib/state/gameStore';
import { useToast } from '@/hooks/useToast';
import { selectImage } from '@/lib/services/stateActions';
import { BaseImagePickerModal } from '@/app/(app)/components/modals/BaseImagePickerModal';

interface EditWithAIPanelProps {
  onClose?: () => void;
}

export default function EditWithAIPanel({ onClose }: EditWithAIPanelProps = {}) {
  const phase = useGameStore((s) => s.phase);
  const accessorizeUsed = useGameStore((s) => s.accessorizeUsed);
  const setAccessorizeUsed = useGameStore((s) => s.setAccessorizeUsed);
  const currentImageUrl = useGameStore((s) => s.currentImageUrl);
  const character = useGameStore((s) => s.character);
  const setPhase = useGameStore((s) => s.setPhase);
  const { showToast } = useToast();
  const setRunwayBaseImageUrl = useGameStore((s) => s.setRunwayBaseImageUrl);

  const [imageUrl, setImageUrl] = useState(currentImageUrl || '');
  const [instruction, setInstruction] = useState('add a silver necklace');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [variants, setVariants] = useState<string[]>([]);
  const [isBasePickerOpen, setBasePickerOpen] = useState(false);
  const [showEditSelector, setShowEditSelector] = useState(false);
  const [selectedEditIndex, setSelectedEditIndex] = useState<number | null>(null);
  const [showFullscreenPreview, setShowFullscreenPreview] = useState(false);
  const [previewEditIndex, setPreviewEditIndex] = useState(0);

  // Handle Escape key to close modal
  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape' && onClose && !loading) onClose();
    }
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose, loading]);

  // Defensive close if phase changes to a disallowed state
  useEffect(() => {
    if (phase !== 'Accessorize') {
      onClose?.();
    }
  }, [phase, onClose]);

  // Prefill base url from current image when available
  useEffect(() => {
    if (!imageUrl && (currentImageUrl || character?.avatarUrl)) {
      setImageUrl(currentImageUrl || character?.avatarUrl || '');
    }
  }, [currentImageUrl, character?.avatarUrl]);

  async function onEdit() {
    if (phase === 'Accessorize' && accessorizeUsed) {
      showToast('Only one edit in Accessorize. Pick from your 4 results.', 'warning', 2200);
      return;
    }
    setLoading(true);
    setError(null);
    showToast('Generating 4 options (30–100s)…', 'info', 2600);
    try {
      const urls = await editImage(imageUrl, instruction);
      setVariants(urls);
      setSelectedEditIndex(null);
      setShowEditSelector(true);
      if (phase === 'Accessorize') {
        setAccessorizeUsed(true);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Edit failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
    <GlassPanel 
      variant="modal" 
      className="relative w-full max-h-[90vh] overflow-hidden"
    >
      <div className="space-y-6 flex flex-col h-full min-h-0">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">{phase === 'Accessorize' ? 'Accessorize' : 'Edit with AI'}</h2>
          {onClose && !loading && (
            <GlassButton
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="w-8 h-8 p-0 flex items-center justify-center hover:bg-foreground/10"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </GlassButton>
          )}
        </div>
        <p className="text-sm text-foreground/70">
          {phase === 'Accessorize'
            ? 'One AI edit for finishing touches (30–100s). Combine multiple instructions (e.g., silver necklace, hoop earrings, black belt, sunglasses). You’ll receive 4 options.'
            : 'Editing typically takes ~30–100s. Tip: combine multiple changes in one request (e.g., add jewelry, a hat, sunglasses, a watch, and shoes).'}
        </p>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Base Image
            </label>
            <div className="flex items-center gap-3">
              {imageUrl ? (
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-background border border-border">
                  <img src={imageUrl} alt="Base" className="w-full h-full object-cover" />
                </div>
              ) : null}
              {/*
              <input
                className="w-full px-4 py-3 bg-white/50 dark:bg-black/20 backdrop-blur-sm border border-white/60 dark:border-white/20 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-transparent transition-all"
                placeholder="Paste image URL here..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                suppressHydrationWarning
              />
              */}
              <GlassButton
                variant={imageUrl ? 'ghost' : 'primary'}
                onClick={() => setBasePickerOpen(true)}
                title={imageUrl ? 'Change base image' : 'Choose base image'}
              >
                {imageUrl ? 'Change' : 'Choose base image'}
              </GlassButton>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Edit Instruction
            </label>
            <input
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:opacity-60 focus:outline-none focus:ring-2 focus:ring-foreground/30 focus:border-transparent transition-all"
              placeholder="e.g., add jewelry, a hat, sunglasses, a wrist watch, and shoes (combine multiple changes in one ask)"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              suppressHydrationWarning
            />
            <div className="mt-1 text-xs text-foreground/60">You can combine multiple changes in one request, separated by commas. Example: add jewelry, a hat, sunglasses, a wrist watch, and shoes.</div>
          </div>

          <GlassButton 
            variant="primary" 
            className="w-full" 
            onClick={onEdit} 
            disabled={loading || !imageUrl || !instruction.trim() || (phase === 'Accessorize' && accessorizeUsed)}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Editing with AI…
              </span>
            ) : (
              phase === 'Accessorize' ? (accessorizeUsed ? 'Edit used' : 'Generate 4 options (30–100s)') : 'Edit with AI'
            )}
          </GlassButton>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-foreground/10 border border-foreground/20 text-foreground text-sm">
            {error}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto">
          {variants.length > 0 && !showEditSelector && (
            <div className="text-center space-y-4">
              <div className="text-center">
                <h4 className="text-lg font-semibold text-foreground">AI Edit Results</h4>
                <p className="text-foreground/70 text-sm">Click below to view and select your edit</p>
              </div>
              <GlassButton 
                variant="primary" 
                className="w-full"
                onClick={() => setShowEditSelector(true)}
              >
                View & Select Edit
              </GlassButton>
            </div>
          )}

          {variants.length === 0 && !loading && !error && (
            <div className="text-center py-12">
              <div className="text-foreground/60 space-y-2">
                <svg className="w-16 h-16 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <p className="text-lg">Ready to transform your image!</p>
                <p className="text-sm">Add an image URL and describe your edit</p>
              </div>
            </div>
          )}
        </div>
      </div>
      {isBasePickerOpen && (
        <BaseImagePickerModal
          isOpen={isBasePickerOpen}
          onClose={() => setBasePickerOpen(false)}
          onSelect={(base) => {
            setImageUrl(base.imageUrl);
            setBasePickerOpen(false);
          }}
        />
      )}
    </GlassPanel>

    {/* Fullscreen Edit Selector Modal */}
      {showEditSelector && variants.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-[var(--color-overlay)] overflow-y-auto"
          onClick={() => {
            setShowEditSelector(false);
            setSelectedEditIndex(null);
          }}
        >
        <div className="min-h-[100svh] flex items-start justify-center p-4">
          <div
            className="w-full max-w-6xl mx-auto my-6 flex flex-col max-h-[90svh] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              aria-label="Close"
              title="Close"
              className="absolute top-2 right-2 w-10 h-10 bg-foreground/10 hover:bg-foreground/20 rounded-full flex items-center justify-center text-foreground text-xl transition-colors"
              onClick={() => {
                setShowEditSelector(false);
                setSelectedEditIndex(null);
              }}
            >
              ×
            </button>
            <div className="text-center text-foreground mb-6">
              <h2 className="text-3xl font-bold mb-2">Choose Your Edit</h2>
              <p className="text-foreground/80">Select the best AI edit</p>
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6 max-h-[70vh] overflow-y-auto">
              {variants.map((url, index) => (
                <div key={index} className="group relative">
                  <div className={`relative rounded-2xl overflow-hidden bg-background border border-border shadow-2xl hover:shadow-3xl transition-all duration-300 cursor-pointer ${
                    selectedEditIndex === index ? 'ring-4 ring-foreground scale-105' : 'hover:scale-105'
                  }`}>
                    <div className="relative w-full aspect-[3/4] bg-gradient-to-br from-slate-100 to-slate-200">
                      <img 
                        src={url} 
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover blur-xl opacity-60"
                      />
                      <img 
                        src={url} 
                        alt={`Edit option ${index + 1}`} 
                        className="relative w-full h-full object-contain"
                      />
                    </div>
                    <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />



                    {selectedEditIndex === index && (
                      <div className="absolute top-3 right-3 bg-foreground text-background px-2 py-1 rounded-full text-xs font-semibold">
                        PREVIEWING
                      </div>
                    )}

                    <div 
                      className="absolute inset-0 cursor-pointer"
                      onClick={() => {
                        setPreviewEditIndex(index);
                        setSelectedEditIndex(index);
                        setShowFullscreenPreview(true);
                      }}
                    />
                  </div>

                  <div className="absolute top-3 left-3 w-8 h-8 bg-foreground/60 text-background rounded-full flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-center gap-4">
              <GlassButton 
                variant="secondary" 
                className="px-6 py-3 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm border-white/30"
                onClick={() => {
                  setShowEditSelector(false);
                  setSelectedEditIndex(null);
                }}
              >
                ← Back to Editor
              </GlassButton>
              {selectedEditIndex !== null && (
                <GlassButton 
                  variant="secondary" 
                  className="px-6 py-3 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm border-white/30"
                  onClick={() => setSelectedEditIndex(null)}
                >
                  Clear Selection
                </GlassButton>
              )}
              {!(phase === 'Accessorize' && accessorizeUsed) && (
                <GlassButton 
                  variant="secondary" 
                  className="px-6 py-3 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm border-white/30"
                  onClick={() => {
                    setShowEditSelector(false);
                    setSelectedEditIndex(null);
                    setVariants([]);
                  }}
                >
                  🔄 Run New Edit
                </GlassButton>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Fullscreen Edit Preview Modal */}
      {showFullscreenPreview && variants.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-[var(--color-overlay)] overflow-y-auto"
          onClick={() => setShowFullscreenPreview(false)}
        >
        <div className="min-h-[100svh] flex items-start justify-center p-4">
          <div className="w-full max-w-5xl mx-auto my-6 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 md:p-6 pt-8 md:pt-12">
              <div className="text-foreground">
                <h3 className="text-xl md:text-2xl font-bold">Edit Preview</h3>
                <p className="text-foreground/80 text-sm md:text-base">
                  {previewEditIndex + 1} of {variants.length}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg shadow-lg transition-colors"
                  onClick={async () => {
                    const chosen = variants[previewEditIndex];
                    await selectImage(chosen, { type: 'edit', description: instruction || 'AI edit', addToHistory: true });
                    setRunwayBaseImageUrl(chosen);
                    if (phase === 'Accessorize') {
                      showToast('Accessories locked in—heading to runway.', 'success', 2200);
                      setPhase('WalkoutAndEval');
                      onClose?.();
                    }
                  }}
                >
                  ✓ Use This Edit
                </button>
                <button
                  onClick={() => setShowFullscreenPreview(false)}
                  className="w-10 h-10 md:w-12 md:h-12 bg-foreground/10 hover:bg-foreground/20 rounded-full flex items-center justify-center text-foreground text-xl md:text-2xl transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-4 md:p-6">
              <div className="relative max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl w-full">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-slate-100 to-slate-200">
                  <img
                    src={variants[previewEditIndex]}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40"
                  />
                  <img
                    src={variants[previewEditIndex]}
                    alt={`Edit option ${previewEditIndex + 1}`}
                    className="relative w-full h-auto max-h-[60vh] md:max-h-[70vh] object-contain"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center p-4 md:p-6">
              <button
                onClick={() => setPreviewEditIndex(previewEditIndex > 0 ? previewEditIndex - 1 : variants.length - 1)}
                className="flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 bg-foreground/10 hover:bg-foreground/20 text-foreground rounded-xl transition-colors"
              >
                ← Previous
              </button>

              <button
                onClick={() => setPreviewEditIndex(previewEditIndex < variants.length - 1 ? previewEditIndex + 1 : 0)}
                className="flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 bg-foreground/10 hover:bg-foreground/20 text-foreground rounded-xl transition-colors"
              >
                Next →
              </button>
            </div>

            <div className="flex justify-center gap-2 md:gap-4 p-4 md:p-6">
              {variants.map((url, index) => (
                <button
                  key={index}
                  onClick={() => setPreviewEditIndex(index)}
                  className={`w-12 h-12 md:w-16 md:h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    index === previewEditIndex 
                      ? 'border-foreground' 
                      : 'border-border hover:border-foreground/60'
                  }`}
                >
                  <div className="relative w-full h-full bg-muted">
                    <img
                      src={url}
                      alt={`Edit ${index + 1}`}
                      className="w-full h-full object-contain p-1"
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}


