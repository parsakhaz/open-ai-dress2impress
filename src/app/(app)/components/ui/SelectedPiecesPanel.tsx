"use client";
import { useEffect, useMemo, useState } from 'react';
import { GlassPanel } from '@/components/GlassPanel';
import { GlassButton } from '@/components/GlassButton';
import { useGameStore } from '@/lib/state/gameStore';
import { getLatestSucceededByItem } from '@/lib/services/tryOnRepo';
import { selectImage } from '@/lib/services/stateActions';
import { tryOnQueue } from '@/lib/services/tryOnQueue';

export default function SelectedPiecesPanel() {
  const wardrobe = useGameStore((s) => s.wardrobe);
  const history = useGameStore((s) => s.history);
  const s = useGameStore.getState();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    console.log('[StylingRound] SelectedPiecesPanel mounted, wardrobe length =', wardrobe.length);
    const id = setTimeout(() => console.log('[StylingRound] wardrobe length (100ms later) =', useGameStore.getState().wardrobe.length), 100);
    return () => clearTimeout(id);
  }, [wardrobe.length]);
  const baseUrl = useMemo(() => {
    const latest = [...history].reverse().find((h) => h.type === 'edit' || h.type === 'tryOn');
    return latest?.imageUrl || s.currentImageUrl || s.character?.avatarUrl || null;
  }, [history, s.currentImageUrl, s.character?.avatarUrl]);

  async function applyItem(itemId: string) {
    const latest = await getLatestSucceededByItem(itemId);
    if (latest?.images && latest.images[0]) {
      await selectImage(latest.images[0], { type: 'tryOn', description: 'Applied from wardrobe', addToHistory: true });
      return;
    }
    if (!baseUrl) return;
    const item = wardrobe.find((w) => w.id === itemId);
    if (!item) return;
    await tryOnQueue.enqueue({ baseImageId: null, baseImageUrl: baseUrl, item });
  }

  return (
    <GlassPanel className="h-full flex flex-col">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Your picks</h3>
      </div>
      <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 gap-3">
        {(!hydrated) && <div className="col-span-2 text-xs text-slate-500">Loading…</div>}
        {wardrobe.map((w) => (
          <button key={w.id} className="group relative rounded-xl overflow-hidden bg-white/20 dark:bg-black/20 border border-white/30 dark:border-white/10 hover:border-accent/50 transition-colors"
            onClick={() => { void applyItem(w.id); }}
            title="Apply to avatar"
          >
            <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
              <img src={w.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover blur-xl opacity-50" />
              <img src={w.imageUrl} alt={w.name} className="relative w-full h-full object-contain" />
            </div>
            <div className="absolute bottom-1 left-1 right-1 text-[11px] text-white/90 truncate">
              {w.name}
            </div>
          </button>
        ))}
      </div>
    </GlassPanel>
  );
}


