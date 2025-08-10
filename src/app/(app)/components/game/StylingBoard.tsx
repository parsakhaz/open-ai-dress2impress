"use client";
import SelectedPiecesPanel from '@/app/(app)/components/ui/SelectedPiecesPanel';
import CenterStage from '@/app/(app)/components/game/CenterStage';
import AIConsole from '@/app/(app)/components/ai/AIConsole';

export default function StylingBoard() {
  return (
    <div className="absolute inset-0 z-10">
      <div className="h-full w-full min-h-0 grid grid-cols-1 lg:grid-cols-[340px_1fr_360px] gap-4 p-4 md:p-6">
        <div className="pointer-events-auto h-full min-h-0 flex flex-col">
          <SelectedPiecesPanel />
        </div>
        <div className="pointer-events-auto h-full min-h-0 flex flex-col">
          <CenterStage />
        </div>
        <div className="pointer-events-auto h-full min-h-0 flex flex-col">
          <AIConsole inline autoRunOnMount showTryOnThumbs />
        </div>
      </div>
    </div>
  );
}


