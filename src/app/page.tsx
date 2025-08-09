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
  
  console.log('🚀 INITIAL RENDER: Page component is executing');
  
  useEffect(() => {
    console.log('🚀 DRESS TO IMPRESS: Application started');
    console.log('🎯 INITIAL STATE:', { 
      phase, 
      environment: process.env.NODE_ENV,
      userAgent: navigator.userAgent.substring(0, 50) + '...'
    });
    
    // Log environment status
    // Note: Other env vars are not accessible on client side
    
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
    console.log('⌨️  KEYBOARD: Press ESC to close panels, click Phase to cycle');
  }, [phase]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAmazonPanelVisible(false);
        setEditPanelVisible(false);
        setWardrobeOpen(false);
        setAIConsoleVisible(false);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  return (
    <main className="relative w-screen h-screen overflow-hidden">
      {/* Canvas Background - CenterStage takes full viewport */}
      <CenterStage />
      
      {/* Fixed positioned overlay elements */}
      <TopBar />
      <HistoryStrip />
      
      {/* Conditional rendering based on phase */}
      {(() => {
        console.log('🎮 GAME PAGE: Current phase is', phase, '| Should show AvatarPanel:', phase === 'CharacterSelect');
        return null;
      })()}
      {phase === 'CharacterSelect' ? (
        <div className="fixed inset-0 flex items-center justify-center z-30 p-4 bg-black/50">
          <div className="text-center">
            <p className="text-white bg-red-600 p-2 mb-4 rounded font-bold">
              DEBUG: In CharacterSelect Phase - AvatarPanel should be visible!
            </p>
            <AvatarPanel />
          </div>
        </div>
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
        <>
          <div 
            className="fixed inset-0 z-[25] bg-black/20" 
            onClick={() => setAmazonPanelVisible(false)}
          />
          {/* Desktop positioning */}
          <div className="fixed left-24 top-1/2 -translate-y-1/2 z-30 hidden sm:block">
            <AmazonPanel onClose={() => setAmazonPanelVisible(false)} />
          </div>
          {/* Mobile positioning */}
          <div className="fixed inset-4 z-30 flex items-center justify-center sm:hidden">
            <div className="w-full max-w-md max-h-full overflow-auto">
              <AmazonPanel onClose={() => setAmazonPanelVisible(false)} />
            </div>
          </div>
        </>
      )}
      
      {isEditPanelVisible && (
        <>
          <div 
            className="fixed inset-0 z-[25] bg-black/20" 
            onClick={() => setEditPanelVisible(false)}
          />
          {/* Desktop positioning */}
          <div className="fixed left-24 top-1/2 -translate-y-1/2 z-30 hidden sm:block">
            <EditWithAIPanel onClose={() => setEditPanelVisible(false)} />
          </div>
          {/* Mobile positioning */}
          <div className="fixed inset-4 z-30 flex items-center justify-center sm:hidden">
            <div className="w-full max-w-md max-h-full overflow-auto">
              <EditWithAIPanel onClose={() => setEditPanelVisible(false)} />
            </div>
          </div>
        </>
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

