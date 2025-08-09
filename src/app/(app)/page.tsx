"use client";
import { useGameStore } from '@/lib/state/gameStore';
import { useEffect } from 'react';
import TopBar from '@/app/(app)/components/game/TopBar';
import CenterStage from '@/app/(app)/components/game/CenterStage';
import HistoryStrip from '@/app/(app)/components/game/HistoryStrip';
import ToolsIsland from '@/app/(app)/components/ui/ToolsIsland';
import AIConsole from '@/app/(app)/components/ai/AIConsole';
import AvatarPanel from '@/app/(app)/components/panels/AvatarPanel';
import { DebugPanel } from '@/components/DebugPanel';

export default function GamePage() {
  const phase = useGameStore((s) => s.phase);
  
  useEffect(() => {
    console.log('🚀 DRESS TO IMPRESS: Application started');
    console.log('🎯 INITIAL STATE:', { 
      phase, 
      environment: process.env.NODE_ENV,
      userAgent: navigator.userAgent.substring(0, 50) + '...'
    });
    
    // Log environment status
    const envVars = [
      'NEXT_PUBLIC_VERCEL_URL',
      // Note: Other env vars are not accessible on client side
    ];
    
    console.log('🔧 CLIENT ENVIRONMENT:', {
      nodeEnv: process.env.NODE_ENV,
      // Server-side env vars will be logged on API calls
    });
    
    console.log('📱 BROWSER CAPABILITIES:', {
      webrtc: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      localStorage: typeof Storage !== 'undefined',
      webgl: !!document.createElement('canvas').getContext('webgl'),
    });
    
    console.log('🎮 GAME FLOW: Starting in phase', phase);
    console.log('💡 TIP: Press Ctrl+Shift+D to open debug panel (development only)');
  }, [phase]);
  
  return (
    <main className="container mx-auto p-6">
      <div className="space-y-6">
        <TopBar />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[60vh]">
          <div className="lg:col-span-2 space-y-6">
            <CenterStage />
            <HistoryStrip />
          </div>
          <div className="space-y-6">
            {phase === 'CharacterSelect' ? (
              <AvatarPanel />
            ) : (
              <ToolsIsland />
            )}
            <AIConsole />
          </div>
        </div>
      </div>
      <DebugPanel />
    </main>
  );
}


