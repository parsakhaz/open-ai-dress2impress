'use client';

import { useGameStore } from '@/lib/state/gameStore';
import { useEditWithAI } from '@/hooks/useEditWithAI';
import { useEffect, useRef, useState } from 'react';

export default function UserAccessorizePane() {
  const phase = useGameStore((s) => s.phase);
  const theme = useGameStore((s) => s.theme);
  const character = useGameStore((s) => s.character);
  const currentImageUrl = useGameStore((s) => s.currentImageUrl);
  const runwayBaseImageUrl = useGameStore((s) => s.runwayBaseImageUrl);

  const baseImageUrl = runwayBaseImageUrl || currentImageUrl || character?.avatarUrl || null;
  const { instruction, setInstruction, variants, loading, error, canGenerate, generate, chooseVariant } = useEditWithAI(baseImageUrl, phase);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [hoveredUrl, setHoveredUrl] = useState<string | null>(null);
  // Allow page shortcut (E) to focus the input via a global event
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail === 'FOCUS_ACCESSORIZE_INPUT') inputRef.current?.focus();
    };
    window.addEventListener('ACCESSORIZE_EVT' as any, handler as any);
    return () => window.removeEventListener('ACCESSORIZE_EVT' as any, handler as any);
  }, []);

  return (
    <div className="pointer-events-auto h-full min-h-0 flex flex-col">
      <div className="h-full max-h-[85vh] rounded-3xl bg-white/80 dark:bg-white/10 backdrop-blur-md border border-foreground/10 shadow-xl p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-foreground/10 text-foreground text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Player: You
          </div>
          <div className="text-foreground/70 text-sm">Theme: <span className="font-medium text-foreground">{theme}</span></div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
          {/* Base preview */}
          <div className="rounded-2xl overflow-hidden bg-background/50 backdrop-blur-sm flex items-center justify-center p-2">
            {baseImageUrl ? (
              <img src={baseImageUrl} alt="Your look" className="max-w-full max-h-[55vh] object-contain rounded-xl shadow-lg" />
            ) : (
              <div className="text-foreground/60 text-sm">Choose a look before editing</div>
            )}
          </div>

          {/* Controls */}
          <div className="space-y-3">
            <input
              ref={inputRef}
              type="text"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Describe finishing touches (e.g., add gold chain and amber sunglasses)"
              maxLength={200}
              className="w-full px-3 py-2 rounded-lg border border-foreground/20 bg-background text-foreground placeholder-foreground/50"
            />
            <div className="flex items-center gap-3">
              <button
                disabled={!canGenerate || loading}
                onClick={generate}
                className={`px-4 py-2 rounded-lg font-semibold ${!canGenerate || loading ? 'bg-foreground/15 text-foreground/60' : 'bg-foreground text-background hover:opacity-90'}`}
              >
                {loading ? 'Generating…' : 'Generate 4 options (30–100s)'}
              </button>
              {error && <div className="text-sm text-red-500">{error}</div>}
            </div>
          </div>

          {/* Variants grid */}
          {variants.length > 0 && (
            <div className="grid grid-cols-2 gap-3 relative">
              {variants.map((u) => (
                <button
                  key={u}
                  onClick={async () => { await chooseVariant(u); setSelectedUrl(u); }}
                  onMouseEnter={() => setHoveredUrl(u)}
                  onMouseLeave={() => setHoveredUrl(null)}
                  className={`relative rounded-xl overflow-hidden border transition shadow-sm ${
                    selectedUrl === u ? 'border-green-500 ring-2 ring-green-500' : 'border-foreground/15 hover:border-foreground/40'
                  }`}
                >
                  <div className="relative w-full aspect-[3/4] bg-gradient-to-br from-slate-100 to-slate-200">
                    <img src={u} alt="" className="absolute inset-0 w-full h-full object-cover blur-xl opacity-50" />
                    <img src={u} alt="Variant" className="relative w-full h-full object-contain" />
                  </div>
                  {selectedUrl === u && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center">
                      ✓
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
          
          {/* Hover preview overlay */}
          {hoveredUrl && (
            <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-8 bg-black/40 transition-opacity duration-200">
              <div className="relative w-full max-w-2xl h-full max-h-[80vh] bg-black/90 rounded-2xl shadow-2xl pointer-events-auto overflow-hidden transition-transform duration-200 scale-100">
                <button
                  onClick={() => setHoveredUrl(null)}
                  className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur hover:bg-white/20 transition-colors flex items-center justify-center text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <img 
                  src={hoveredUrl} 
                  alt="Preview" 
                  className="w-full h-full object-contain p-4"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


