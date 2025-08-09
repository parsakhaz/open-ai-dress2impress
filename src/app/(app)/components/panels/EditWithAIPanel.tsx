"use client";
import { useState } from 'react';
import { editImage } from '@/lib/adapters/edit';
import { GlassPanel } from '@/components/GlassPanel';
import { GlassButton } from '@/components/GlassButton';
import { useGameStore } from '@/lib/state/gameStore';

export default function EditWithAIPanel() {
  const [imageUrl, setImageUrl] = useState('');
  const [instruction, setInstruction] = useState('add a silver necklace');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [variants, setVariants] = useState<string[]>([]);
  const setCurrentImage = useGameStore((s) => s.setCurrentImage);

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
    <GlassPanel>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Edit with AI</h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Base Image URL
            </label>
            <input
              className="w-full px-4 py-3 bg-white/50 dark:bg-black/20 backdrop-blur-sm border border-white/60 dark:border-white/20 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-transparent transition-all"
              placeholder="Paste image URL here..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              suppressHydrationWarning
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Edit Instruction
            </label>
            <input
              className="w-full px-4 py-3 bg-white/50 dark:bg-black/20 backdrop-blur-sm border border-white/60 dark:border-white/20 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-transparent transition-all"
              placeholder="e.g., add a silver necklace, change background to sunset..."
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              suppressHydrationWarning
            />
          </div>

          <GlassButton 
            variant="primary" 
            className="w-full" 
            onClick={onEdit} 
            disabled={loading || !imageUrl.trim() || !instruction.trim()}
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

        {variants.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-slate-900 dark:text-slate-100">AI Edit Results</h4>
            <div className="grid grid-cols-2 gap-3">
              {variants.map((url, i) => (
                <div key={i} className="group relative rounded-lg overflow-hidden bg-white/20 dark:bg-black/20 backdrop-blur-sm border border-white/30 dark:border-white/10 hover:border-accent/50 transition-colors">
                  <img src={url} alt={`AI edit variant ${i + 1}`} className="w-full aspect-square object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GlassButton 
                      size="sm" 
                      variant="primary" 
                      className="w-full"
                      onClick={() => setCurrentImage(url)}
                    >
                      Use This Edit
                    </GlassButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </GlassPanel>
  );
}


