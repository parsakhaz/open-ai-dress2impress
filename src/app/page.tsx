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
import { useToast } from '@/hooks/useToast';

export default function GamePage() {
  const phase = useGameStore((s) => s.phase);
  const { showToast, ToastContainer } = useToast();
  
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
      // Avoid shortcuts while typing
      const active = document.activeElement as HTMLElement | null;
      const isTyping = !!active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
      if (isTyping) return;

      const key = e.key.toLowerCase();

      if (key === 'escape') {
        setAmazonPanelVisible(false);
        setEditPanelVisible(false);
        setWardrobeOpen(false);
        setAIConsoleVisible(false);
        return;
      }

      // Only enable tool shortcuts outside of CharacterSelect
      if (phase === 'CharacterSelect') return;

      if (key === 's') {
        setAmazonPanelVisible(true);
      } else if (key === 'e') {
        setEditPanelVisible(true);
      } else if (key === 'w') {
        setWardrobeOpen(true);
      } else if (key === 'a') {
        setAIConsoleVisible((v) => !v);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [phase]);
  
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
        <div className="fixed inset-0 flex items-center justify-center z-30 p-4 bg-black/30 backdrop-blur-sm">
          <AvatarPanel />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg">
          <div 
            className="fixed inset-0"
            onClick={() => setAmazonPanelVisible(false)}
          />
          <div className="relative max-w-6xl w-full mx-4 max-h-[90vh]">
            <AmazonPanel onClose={() => setAmazonPanelVisible(false)} showToast={showToast} />
          </div>
        </div>
      )}
      
      {isEditPanelVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg">
          <div 
            className="fixed inset-0"
            onClick={() => setEditPanelVisible(false)}
          />
          <div className="relative max-w-4xl w-full mx-4 max-h-[90vh]">
            <EditWithAIPanel onClose={() => setEditPanelVisible(false)} />
          </div>
        </div>
      )}
      
      {/* Wardrobe Modal */}
      <WardrobeModal open={isWardrobeOpen} onClose={() => setWardrobeOpen(false)}>
        <WardrobeContent onClose={() => setWardrobeOpen(false)} />
      </WardrobeModal>
      
      {/* AI Console - conditionally visible */}
      {isAIConsoleVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg">
          <div 
            className="fixed inset-0"
            onClick={() => setAIConsoleVisible(false)}
          />
          <div className="relative max-w-3xl w-full mx-4 max-h-[90vh]">
            <AIConsole onClose={() => setAIConsoleVisible(false)} />
          </div>
        </div>
      )}
      <DebugPanel />
      
      {/* Toast notifications */}
      <ToastContainer />
    </main>
  );
}

