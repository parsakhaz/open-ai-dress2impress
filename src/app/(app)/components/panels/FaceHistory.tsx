"use client";
import { useEffect, useMemo, useState } from 'react';
import { getRecentFaces, deleteFace, pinFace, renameFace } from '@/lib/data/faceRepo';
import { getImage } from '@/lib/data/imageRepo';
import { GlassPanel } from '@/components/GlassPanel';
import { GlassButton } from '@/components/GlassButton';
import type { FaceRecord } from '@/types';

interface FaceHistoryProps {
  onSelect: (sel: { imageId: string; dataUrl: string }) => void;
  compact?: boolean;
}

export default function FaceHistory({ onSelect, compact = false }: FaceHistoryProps) {
  const [faces, setFaces] = useState<FaceRecord[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const list = await getRecentFaces(50);
    setFaces(list);
    const pairs = await Promise.all(
      list.map(async (f) => [f.imageId, (await getImage(f.imageId)) || ''] as const)
    );
    setImages(Object.fromEntries(pairs.filter(([, data]) => !!data)));
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const sorted = useMemo(() => {
    const pinned = faces.filter((f) => f.pinned).sort((a, b) => b.createdAt - a.createdAt);
    const recent = faces.filter((f) => !f.pinned).sort((a, b) => b.createdAt - a.createdAt);
    return [...pinned, ...recent];
  }, [faces]);

  if (compact) {
    return (
      <div className="flex gap-2 overflow-x-auto py-2">
        {sorted.map((f) => (
          <button
            key={f.id}
            className="relative w-20 h-24 rounded-lg overflow-hidden border border-white/10 hover:border-white/30"
            onClick={() => {
              const img = images[f.imageId];
              if (!img) return;
              onSelect({ imageId: f.imageId, dataUrl: img });
            }}
            title={f.label || 'Saved face'}
          >
            <img src={images[f.imageId]} alt="" className="w-full h-full object-cover" />
            {f.pinned && (
              <div className="absolute top-1 right-1 text-yellow-300">★</div>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <GlassPanel className="w-72 h-full overflow-hidden flex flex-col">
      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
        <div className="text-sm font-medium">Face history</div>
        <div className="text-[11px] text-white/60">{sorted.length}</div>
      </div>
      <div className="flex-1 overflow-auto p-3 grid grid-cols-2 gap-3">
        {loading && <div className="col-span-2 text-center text-white/60 text-sm">Loading…</div>}
        {!loading && sorted.length === 0 && (
          <div className="col-span-2 text-center text-white/60 text-sm">No faces yet</div>
        )}
        {sorted.map((f) => (
          <div key={f.id} className="group relative">
            <button
              className="block w-full aspect-[3/4] rounded-xl overflow-hidden border border-white/10 hover:border-white/30"
              onClick={() => {
                const img = images[f.imageId];
                if (!img) return;
                onSelect({ imageId: f.imageId, dataUrl: img });
              }}
              title={f.label || 'Use this face'}
            >
              <img src={images[f.imageId]} alt="" className="w-full h-full object-cover" />
            </button>
            <div className="mt-1 flex items-center justify-between">
              <div className="text-[11px] truncate text-white/80">
                {f.label || 'Saved face'}
              </div>
              <div className="flex gap-2">
                <button
                  className="text-[11px] text-white/70 hover:text-white"
                  onClick={async () => {
                    await pinFace(f.id, !f.pinned);
                    void load();
                  }}
                  title={f.pinned ? 'Unpin' : 'Pin'}
                >
                  {f.pinned ? '★' : '☆'}
                </button>
                <button
                  className="text-[11px] text-red-300 hover:text-red-200"
                  onClick={async () => {
                    await deleteFace(f.id);
                    void load();
                  }}
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}


