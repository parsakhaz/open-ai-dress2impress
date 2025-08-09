"use client";
import { useGameStore } from '@/lib/state/gameStore';

export default function CenterStage() {
  const currentImageUrl = useGameStore((s) => s.currentImageUrl);
  return (
    <div className="flex items-center justify-center min-h-[420px] bg-neutral-100 rounded relative">
      {currentImageUrl ? (
        <img src={currentImageUrl} alt="Current" className="max-h-[520px] max-w-full object-contain" />
      ) : (
        <div className="text-neutral-500">Center Stage</div>
      )}
    </div>
  );
}


