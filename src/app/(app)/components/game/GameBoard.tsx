"use client";
import GenerateSidebar from '@/app/(app)/components/ui/GenerateSidebar';
import ClosetNineGrid from '@/app/(app)/components/ui/ClosetNineGrid';
import AIConsole from '@/app/(app)/components/ai/AIConsole';
import { useToast } from '@/hooks/useToast';

export default function GameBoard() {
  const { showToast } = useToast();
  return (
    <div className="absolute inset-0 z-20 bg-background/95 backdrop-blur-sm">
      <div className="h-full w-full min-h-0 grid grid-cols-1 lg:grid-cols-[340px_1fr_360px] gap-4 p-4 md:p-6 max-w-[1800px] mx-auto">
        <div className="pointer-events-auto h-full min-h-0 flex flex-col max-h-[85vh]">
          <GenerateSidebar showToast={showToast} className="h-full" />
        </div>
        <div className="pointer-events-auto h-full min-h-0 flex flex-col max-h-[85vh]">
          <ClosetNineGrid />
        </div>
        <div className="pointer-events-auto h-full min-h-0 flex flex-col max-h-[85vh]">
          <AIConsole inline autoRunOnMount showTryOnThumbs={false} />
        </div>
      </div>
    </div>
  );
}


