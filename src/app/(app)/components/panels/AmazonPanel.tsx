"use client";
import { useState, useEffect, useMemo } from 'react';
import { searchAmazon } from '@/lib/adapters/amazon';
import type { WardrobeItem } from '@/types';
import { useGameStore } from '@/lib/state/gameStore';
import { GlassPanel } from '@/components/GlassPanel';
import { GlassButton } from '@/components/GlassButton';
import { tryOnQueue } from '@/lib/services/tryOnQueue';

interface AmazonPanelProps {
  onClose?: () => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const MAX_WARDROBE_ITEMS = 8;

export default function AmazonPanel({ onClose, showToast }: AmazonPanelProps = {}) {
  const [query, setQuery] = useState('black leather jacket');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<WardrobeItem[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const addToWardrobe = useGameStore((s) => s.addToWardrobe);
  const removeFromWardrobe = useGameStore((s) => s.removeFromWardrobe);
  const wardrobe = useGameStore((s) => s.wardrobe);

  // Calculate items per page based on screen size
  const itemsPerPage = 8; // Reduced for testing, shows pagination buttons sooner
  
  // Calculate paginated results
  const paginatedResults = useMemo(() => {
    const start = currentPage * itemsPerPage;
    const end = start + itemsPerPage;
    return results.slice(start, end);
  }, [results, currentPage, itemsPerPage]);
  
  const totalPages = Math.ceil(results.length / itemsPerPage);

  // Handle Escape key to close modal
  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape' && onClose) onClose();
    }
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const toggleWardrobe = async (item: WardrobeItem) => {
    const inWardrobe = wardrobe.some((w) => w.id === item.id);
    if (inWardrobe) {
      removeFromWardrobe(item.id);
      showToast?.('Removed item from wardrobe.', 'info');
    } else {
      if (wardrobe.length >= MAX_WARDROBE_ITEMS) {
        showToast?.(`You can only add up to ${MAX_WARDROBE_ITEMS} items. Remove something to add more.`, 'info');
        return;
      }
      addToWardrobe(item);
      showToast?.('Added item to wardrobe. 👗', 'success');
      // Auto-enqueue try-on with latest edit image if available, else fall back to current/character
      try {
        const s = useGameStore.getState();
        const history = s.history;
        const latestEdit = [...history].reverse().find((h) => h.type === 'edit' || h.type === 'tryOn');
        const baseUrl = latestEdit?.imageUrl || s.currentImageUrl || s.character?.avatarUrl;
        const baseId = latestEdit?.imageId || null;
        if (baseUrl) {
          await tryOnQueue.enqueue({ baseImageId: baseId, baseImageUrl: baseUrl, item });
          showToast?.('Queued try-on with latest image', 'info');
        }
      } catch (e) {
        // Non-blocking; swallow errors but notify
        showToast?.('Failed to auto-queue try-on', 'error');
      }
    }
  };

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCurrentPage(0); // Reset to first page on new search
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
    <GlassPanel 
      variant="modal" 
      className="relative w-full h-full overflow-hidden"
    >
      <div className="h-full flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Amazon Shopping</h2>
            <div className="text-sm text-slate-600 dark:text-slate-400">Selected {wardrobe.length}/{MAX_WARDROBE_ITEMS} • Max 8 items</div>
          </div>
          {onClose && (
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

        <div className="flex-1 flex flex-col">
          {results.length > 0 && (
            <div className="flex-1 flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Found {results.length} {results.length === 1 ? 'item' : 'items'}
                </h4>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Page {currentPage + 1} of {totalPages}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {paginatedResults.map((r) => (
                  <div
                    key={r.id}
                    className="group relative rounded-xl overflow-hidden bg-white/20 dark:bg-black/20 backdrop-blur-sm border border-white/30 dark:border-white/10 hover:border-accent/50 hover:scale-105 transition-all duration-200 cursor-pointer"
                    role="button"
                    tabIndex={0}
                    title="Click to add or remove"
                    onClick={() => { void toggleWardrobe(r); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        void toggleWardrobe(r);
                      }
                    }}
                  >
                    <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
                      {/* Blurred background */}
                      <img src={r.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover blur-xl opacity-50" />
                      {/* Main image (no crop) */}
                      <img src={r.imageUrl} alt={r.name} className="relative w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                      {/* In-wardrobe badge */}
                      {wardrobe.some((w) => w.id === r.id) && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow">
                          Added
                        </div>
                      )}
                      {/* Info icon + hover metadata */}
                      <div className="absolute bottom-2 left-2 group/inf">
                        <div className="w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs">i</div>
                        <div className="pointer-events-none absolute left-0 bottom-8 opacity-0 group-hover/inf:opacity-100 transition-opacity duration-200">
                          <div className="max-w-[240px] rounded-lg bg-black/80 text-white text-xs p-2 shadow-lg border border-white/10">
                            <div className="font-semibold mb-1 line-clamp-3">{r.name}</div>
                            {r.price && <div className="opacity-80">{r.price}</div>}
                          </div>
                        </div>
                      </div>

                    </div>
                    {/* No below-card metadata; image fills card. Name/price available via info icon hover. */}
                  </div>
                ))}
              </div>
              
              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 pt-4">
                  <GlassButton
                    size="sm"
                    variant="ghost"
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className="flex items-center justify-center w-12 h-10"
                    title="Previous page"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </GlassButton>
                  
                  <span className="text-sm text-slate-600 dark:text-slate-400 px-6 font-medium">
                    {currentPage + 1} / {totalPages}
                  </span>
                  
                  <GlassButton
                    size="sm"
                    variant="ghost"
                    onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage === totalPages - 1}
                    className="flex items-center justify-center w-12 h-10"
                    title="Next page"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </GlassButton>
                </div>
              )}
            </div>
          )}
          
          {results.length === 0 && !loading && !error && (
            <div className="text-center py-12">
              <div className="text-slate-400 dark:text-slate-500 space-y-2">
                <svg className="w-16 h-16 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-lg">Search for clothes to start shopping!</p>
                <p className="text-sm">Try searching for "black dress", "sneakers", or "jacket"</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </GlassPanel>
  );
}


