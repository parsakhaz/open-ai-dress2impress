"use client";
import { useGameStore } from '@/lib/state/gameStore';
import { useEffect, useState } from 'react';
import TopBar from '@/app/(app)/components/game/TopBar';
import CenterStage from '@/app/(app)/components/game/CenterStage';
import HistoryStrip from '@/app/(app)/components/game/HistoryStrip';
import ToolsIsland from '@/app/(app)/components/ui/ToolsIsland';
import AIConsole from '@/app/(app)/components/ai/AIConsole';
import AvatarPanel from '@/app/(app)/components/panels/AvatarPanel';
import AmazonPanel from '@/app/(app)/components/panels/AmazonPanel';
import EditWithAIPanel from '@/app/(app)/components/panels/EditWithAIPanel';
import Wardrobe from '@/app/(app)/components/ui/Wardrobe';
import WardrobeModal from '@/app/(app)/components/ui/WardrobeModal';
import WardrobeContent from '@/app/(app)/components/ui/WardrobeContent';
import { DebugPanel } from '@/components/DebugPanel';

export default function GamePage() {
  const phase = useGameStore((s) => s.phase);
  
  // Panel visibility states
  const [isAmazonPanelVisible, setAmazonPanelVisible] = useState(false);
  const [isEditPanelVisible, setEditPanelVisible] = useState(false);
  const [isWardrobeOpen, setWardrobeOpen] = useState(false);
  const [isAIConsoleVisible, setAIConsoleVisible] = useState(false);
  
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
    <main className="relative w-screen h-screen overflow-hidden">
      {/* Canvas Background - CenterStage takes full viewport */}
      <CenterStage />
      
      {/* Fixed positioned overlay elements */}
      <TopBar />
      <HistoryStrip />
      
      {/* Conditional rendering based on phase */}
      {phase === 'CharacterSelect' ? (
        <AvatarPanel />
      ) : (
        <ToolsIsland 
          onSearchClick={() => setAmazonPanelVisible(true)}
          onEditClick={() => setEditPanelVisible(true)}
          onWardrobeClick={() => setWardrobeOpen(true)}
          onAIConsoleClick={() => setAIConsoleVisible(!isAIConsoleVisible)}
        />
      )}
      
      {/* Panel overlays - only render when visible */}
      {isAmazonPanelVisible && (
        <div className="fixed left-20 top-1/2 -translate-y-1/2 z-30">
          <AmazonPanel onClose={() => setAmazonPanelVisible(false)} />
        </div>
      )}
      
      {isEditPanelVisible && (
        <div className="fixed left-20 top-1/2 -translate-y-1/2 z-30">
          <EditWithAIPanel onClose={() => setEditPanelVisible(false)} />
        </div>
      )}
      
      {/* Wardrobe Modal */}
      <WardrobeModal open={isWardrobeOpen} onClose={() => setWardrobeOpen(false)}>
        <WardrobeContent />
      </WardrobeModal>
      
      {/* AI Console - conditionally visible */}
      {isAIConsoleVisible && (
        <div className="fixed bottom-4 right-4 z-30">
          <AIConsole />
        </div>
      )}
      <DebugPanel />
    </main>
  );
}


