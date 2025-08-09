"use client";
import { useState } from 'react';
import { searchAmazon } from '@/lib/adapters/amazon';
import type { WardrobeItem } from '@/types';
import { useGameStore } from '@/lib/state/gameStore';
import { GlassPanel } from '@/components/GlassPanel';
import { GlassButton } from '@/components/GlassButton';

export default function AmazonPanel() {
  const [query, setQuery] = useState('black leather jacket');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<WardrobeItem[]>([]);
  const addToWardrobe = useGameStore((s) => s.addToWardrobe);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const items = await searchAmazon(query);
      setResults(items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassPanel>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Amazon Shopping</h3>
        
        <form onSubmit={onSearch} className="flex gap-3">
          <div className="relative flex-1">
            <input
              className="w-full px-4 py-3 bg-white/50 dark:bg-black/20 backdrop-blur-sm border border-white/60 dark:border-white/20 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-transparent transition-all"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Amazon fashion..."
              suppressHydrationWarning
            />
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <GlassButton 
            type="submit" 
            variant="primary" 
            disabled={loading}
            className="px-6"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Searching…
              </span>
            ) : (
              'Search'
            )}
          </GlassButton>
        </form>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
            {error}
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-slate-900 dark:text-slate-100">
              Found {results.length} {results.length === 1 ? 'item' : 'items'}
            </h4>
            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {results.map((r) => (
                <div key={r.id} className="group relative rounded-lg overflow-hidden bg-white/20 dark:bg-black/20 backdrop-blur-sm border border-white/30 dark:border-white/10 hover:border-accent/50 transition-colors">
                  <img src={r.imageUrl} alt={r.name} className="w-full aspect-square object-cover" />
                  <div className="p-3">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2 line-clamp-2">{r.name}</p>
                    {r.price && (
                      <p className="text-xs text-accent font-semibold mb-2">{r.price}</p>
                    )}
                    <GlassButton 
                      size="sm" 
                      variant="secondary" 
                      className="w-full"
                      onClick={() => addToWardrobe(r)}
                    >
                      Add to Wardrobe
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


