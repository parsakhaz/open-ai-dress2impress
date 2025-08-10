"use client";
import { useState, useEffect } from 'react';
import { editImage } from '@/lib/adapters/edit';
import { GlassPanel } from '@/components/GlassPanel';
import { GlassButton } from '@/components/GlassButton';
import { useGameStore } from '@/lib/state/gameStore';
import { selectImage } from '@/lib/services/stateActions';
import { BaseImagePickerModal } from '@/app/(app)/components/modals/BaseImagePickerModal';

interface EditWithAIPanelProps {
  onClose?: () => void;
}

export default function EditWithAIPanel({ onClose }: EditWithAIPanelProps = {}) {
  const phase = useGameStore((s) => s.phase);
  const currentImageUrl = useGameStore((s) => s.currentImageUrl);
  const character = useGameStore((s) => s.character);

  const [imageUrl, setImageUrl] = useState(currentImageUrl || '');
  const [instruction, setInstruction] = useState('add a silver necklace');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [variants, setVariants] = useState<string[]>([]);
  const [isBasePickerOpen, setBasePickerOpen] = useState(false);

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
    if (phase !== 'StylingRound' && onClose) {
      onClose();
    }
  }, [phase, onClose]);

  // Prefill base url from current image when available
  useEffect(() => {
    if (!imageUrl && (currentImageUrl || character?.avatarUrl)) {
      setImageUrl(currentImageUrl || character?.avatarUrl || '');
    }
  }, [currentImageUrl, character?.avatarUrl]);

  async function onEdit() {
    setLoading(true);
    setError(null);
    try {
      const urls = await editImage(imageUrl, instruction);
      setVariants(urls);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Edit failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassPanel 
      variant="modal" 
      className="relative w-full max-h-[90vh] overflow-hidden"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Edit with AI</h2>
          {onClose && !loading && (
            <GlassButton
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="w-8 h-8 p-0 flex items-center justify-center hover:bg-white/20"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </GlassButton>
          )}
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Note: Editing is blocking and typically takes about 20–30 seconds. Closing is disabled while an edit is running. Tip: For best flow, do edits after choosing your top + bottom combo as a final step.
        </p>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Base Image
            </label>
            <div className="flex items-center gap-3">
              {imageUrl ? (
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-white/20 dark:bg-black/20 border border-white/30 dark:border-white/10">
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
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Edit Instruction
            </label>
            <input
              className="w-full px-4 py-3 bg-white/50 dark:bg-black/20 backdrop-blur-sm border border-white/60 dark:border-white/20 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-transparent transition-all"
              placeholder="e.g., add sunglasses, a silver chain, and a fancy belt (you can combine multiple edits in one ask)"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              suppressHydrationWarning
            />
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">You can combine multiple edits in one ask, separated by commas.</div>
          </div>

          <GlassButton 
            variant="primary" 
            className="w-full" 
            onClick={onEdit} 
            disabled={loading || !imageUrl || !instruction.trim()}
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
              'Edit with AI'
            )}
          </GlassButton>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="overflow-auto max-h-[calc(90vh-20rem)]">
          {variants.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">AI Edit Results</h4>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Click to use the edited version
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {variants.map((url, i) => (
                  <div key={i} className="group relative rounded-xl overflow-hidden bg-white/20 dark:bg-black/20 backdrop-blur-sm border border-white/30 dark:border-white/10 hover:border-accent/50 hover:scale-105 transition-all duration-200">
                    <div className="aspect-square overflow-hidden">
                      <img src={url} alt={`AI edit variant ${i + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <GlassButton 
                        size="sm" 
                        variant="primary" 
                        className="w-full"
                        onClick={async () => {
                          await selectImage(url, { type: 'edit', description: instruction || 'AI edit', addToHistory: true });
                        }}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Use This Edit
                        </div>
                      </GlassButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {variants.length === 0 && !loading && !error && (
            <div className="text-center py-12">
              <div className="text-slate-400 dark:text-slate-500 space-y-2">
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
  );
}


