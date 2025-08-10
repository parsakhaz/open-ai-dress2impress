"use client";
import ClosetNineGrid from '@/app/(app)/components/ui/ClosetNineGrid';
import CenterStage from '@/app/(app)/components/game/CenterStage';
import AIConsole from '@/app/(app)/components/ai/AIConsole';
import { useGameStore } from '@/lib/state/gameStore';
import { useMemo } from 'react';
import { GlassButton } from '@/components/GlassButton';

export default function StylingBoard() {
  const aiLog = useGameStore((s) => s.aiLog);
  const setPhase = useGameStore((s) => s.setPhase);
  
  // Check if ChatGPT is done
  const isChatGPTDone = useMemo(() => {
    return aiLog.some(event => {
      // Check for the DONE phase in AI events
      return (event as any).phase === 'DONE' || 
             event.content?.includes('ChatGPT is done thinking');
    });
  }, [aiLog]);

  const proceedToAccessorize = () => {
    setPhase('Accessorize');
  };

  return (
    <div className="absolute inset-0 z-20 bg-background/95 backdrop-blur-sm">
      <div className="h-full w-full min-h-0 grid grid-cols-1 lg:grid-cols-[420px_1fr_360px] gap-4 p-4 md:p-6 max-w-[1800px] mx-auto">
        <div className="pointer-events-auto h-full min-h-0 flex flex-col max-h-[85vh]">
          <ClosetNineGrid />
        </div>
        <div className="pointer-events-auto h-full min-h-0 flex flex-col max-h-[85vh] relative">
          <CenterStage />
        </div>
        <div className="pointer-events-auto h-full min-h-0 flex flex-col max-h-[85vh]">
          <AIConsole inline autoRunOnMount showTryOnThumbs />
        </div>
      </div>
      
      {/* Proceed button when ChatGPT is done */}
      {isChatGPTDone && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
          <GlassButton
            variant="primary"
            size="lg"
            onClick={proceedToAccessorize}
            className="px-8 py-3 font-semibold shadow-xl"
          >
            Proceed to Accessorize →
          </GlassButton>
          <p className="text-xs text-foreground/60 text-center mt-2">
            Skip the timer and continue!
          </p>
        </div>
      )}
    </div>
  );
}


