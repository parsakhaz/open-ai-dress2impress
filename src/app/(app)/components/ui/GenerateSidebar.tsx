"use client";
import { useEffect, useMemo, useState } from 'react';
import { GlassPanel } from '@/components/GlassPanel';
import { GlassButton } from '@/components/GlassButton';
import { searchAmazon } from '@/lib/adapters/amazon';
import type { WardrobeItem } from '@/types';
import { useGameStore } from '@/lib/state/gameStore';
import { tryOnQueue } from '@/lib/services/tryOnQueue';
import { MAX_WARDROBE_ITEMS } from '@/lib/constants';

interface GenerateSidebarProps {
  className?: string;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function GenerateSidebar({ className = '', showToast }: GenerateSidebarProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<WardrobeItem[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const addToWardrobe = useGameStore((s) => s.addToWardrobe);
  const removeFromWardrobe = useGameStore((s) => s.removeFromWardrobe);
  const wardrobe = useGameStore((s) => s.wardrobe);
  const phase = useGameStore((s) => s.phase);

  // Responsive items per page based on viewport height; grid is fixed to 2 columns
  useEffect(() => {
    const calc = () => {
      const h = typeof window !== 'undefined' ? window.innerHeight : 900;
      // rows tuned to roughly fill the card minus header/form/pagination
      if (h < 700) return 10;      // 5 rows * 2 cols
      if (h < 850) return 12;      // 6 rows * 2 cols
      if (h < 1000) return 14;     // 7 rows * 2 cols
      return 16;                   // 8 rows * 2 cols
    };
    const apply = () => setItemsPerPage(calc());
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);
  const paginatedResults = useMemo(() => {
    const start = currentPage * itemsPerPage;
    const end = start + itemsPerPage;
    return results.slice(start, end);
  }, [results, currentPage, itemsPerPage]);
  const totalPages = Math.ceil(results.length / itemsPerPage);

  useEffect(() => { setCurrentPage(0); }, [results.length]);
  useEffect(() => { setCurrentPage(0); }, [itemsPerPage]);

  const toggleWardrobe = async (item: WardrobeItem) => {
    if (phase !== 'ShoppingSpree') {
      showToast?.('Shopping is unavailable now', 'info');
      return;
    }
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
      } catch {
        showToast?.('Failed to auto-queue try-on', 'error');
      }
    }
  };

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (phase !== 'ShoppingSpree') {
      showToast?.('Shopping is disabled during this round', 'info');
      return;
    }
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
    <GlassPanel className={`h-full flex flex-col overflow-hidden ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">GENERATE CLOTHES & ACCESSORIES</h3>
      </div>

      <form onSubmit={onSearch} className="mb-3">
        <div className="relative">
          <input
            className="w-full px-3 py-2 bg-white/50 dark:bg-black/20 backdrop-blur-sm border border-white/60 dark:border-white/20 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-transparent transition-all"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe what you want to wear…"
            suppressHydrationWarning
            disabled={phase !== 'ShoppingSpree'}
          />
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <GlassButton type="submit" variant="primary" disabled={loading || phase !== 'ShoppingSpree'} className="w-full mt-3">
          {loading ? 'Searching…' : 'Generate'}
        </GlassButton>
      </form>

      {error && (
        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-xs mb-2">
          {error}
        </div>
      )}

      <div className="flex-1 min-h-0 max-h-full overflow-y-auto pr-1">
        {results.length > itemsPerPage && (
          <div className="flex items-center justify-center gap-2 py-2">
            <GlassButton size="sm" variant="ghost" onClick={() => setCurrentPage(Math.max(0, currentPage - 1))} disabled={currentPage === 0}>Prev</GlassButton>
            <span className="text-xs text-slate-500">{currentPage + 1} / {totalPages}</span>
            <GlassButton size="sm" variant="ghost" onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))} disabled={currentPage === totalPages - 1}>Next</GlassButton>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {paginatedResults.map((r) => (
            <div
              key={r.id}
              className="group relative rounded-xl overflow-hidden bg-white/20 dark:bg-black/20 backdrop-blur-sm border border-white/30 dark:border-white/10 hover:border-accent/50 transition-all duration-200"
              draggable={phase === 'ShoppingSpree'}
              onDragStart={(e) => {
                try { e.dataTransfer.setData('application/json', JSON.stringify(r)); } catch {}
              }}
            >
              <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
                <img src={r.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover blur-xl opacity-50" />
                <img src={r.imageUrl} alt={r.name} className="relative w-full h-full object-contain" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/40 flex items-end p-2">
                  <GlassButton
                    variant="secondary"
                    className="w-full !bg-black !text-white"
                    onClick={() => { void toggleWardrobe(r); }}
                    disabled={phase !== 'ShoppingSpree'}
                  >
                    {wardrobe.some((w) => w.id === r.id) ? 'Remove from closet' : 'Add to closet'}
                  </GlassButton>
                </div>
              </div>
            </div>
          ))}
        </div>

        {results.length > itemsPerPage && (
          <div className="flex items-center justify-center gap-2 py-3">
            <GlassButton size="sm" variant="ghost" onClick={() => setCurrentPage(Math.max(0, currentPage - 1))} disabled={currentPage === 0}>Prev</GlassButton>
            <span className="text-xs text-slate-500">{currentPage + 1} / {totalPages}</span>
            <GlassButton size="sm" variant="ghost" onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))} disabled={currentPage === totalPages - 1}>Next</GlassButton>
          </div>
        )}
      </div>
    </GlassPanel>
  );
}


