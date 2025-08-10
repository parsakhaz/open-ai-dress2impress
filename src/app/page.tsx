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
import ThemeWheelModal from '@/app/(app)/components/ui/ThemeWheelModal';

export default function GamePage() {
  const phase = useGameStore((s) => s.phase);
  const theme = useGameStore((s) => s.theme);
  const character = useGameStore((s) => s.character);
  const setPhase = useGameStore((s) => s.setPhase);
  const { showToast, ToastContainer } = useToast();
  
  // Panel visibility states
  const [isAmazonPanelVisible, setAmazonPanelVisible] = useState(false);
  const [isEditPanelVisible, setEditPanelVisible] = useState(false);
  const [isWardrobeOpen, setWardrobeOpen] = useState(false);
  const [isAIConsoleVisible, setAIConsoleVisible] = useState(false);
  
  console.log('🚀 INITIAL RENDER: Page component is executing');

  // Phase-based gating
  const canOpenShopping = phase === 'ShoppingSpree';
  const canOpenEdit = phase === 'StylingRound';
  const canOpenWardrobe = phase === 'StylingRound';
  const shoppingTooltip = canOpenShopping ? 'Search real clothes (S)' : (phase === 'StylingRound' ? 'Shopping is disabled during Styling' : 'Shopping becomes available during Shopping');
  const editTooltip = canOpenEdit ? 'Edit with AI (E)' : 'Editing is available during Styling';
  const wardrobeTooltip = canOpenWardrobe ? 'Your wardrobe (W)' : 'Wardrobe opens during Styling';
  
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

  // Auto-close disallowed panels on phase changes
  useEffect(() => {
    if (phase === 'ShoppingSpree') {
      setEditPanelVisible(false);
      setWardrobeOpen(false);
    } else if (phase === 'StylingRound') {
      setAmazonPanelVisible(false);
    } else {
      // In other phases, close all tool panels
      setAmazonPanelVisible(false);
      setEditPanelVisible(false);
      setWardrobeOpen(false);
    }
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
        if (!canOpenShopping) {
          showToast(shoppingTooltip, 'info');
          return;
        }
        // Open Amazon; close others
        setEditPanelVisible(false);
        setWardrobeOpen(false);
        setAIConsoleVisible(false);
        setAmazonPanelVisible(true);
      } else if (key === 'e') {
        if (!canOpenEdit) {
          showToast(editTooltip, 'info');
          return;
        }
        // Open Edit; close others
        setAmazonPanelVisible(false);
        setWardrobeOpen(false);
        setAIConsoleVisible(false);
        setEditPanelVisible(true);
      } else if (key === 'w') {
        if (!canOpenWardrobe) {
          showToast(wardrobeTooltip, 'info');
          return;
        }
        // Open Wardrobe; close others
        setAmazonPanelVisible(false);
        setEditPanelVisible(false);
        setAIConsoleVisible(false);
        setWardrobeOpen(true);
      } else if (key === 'a') {
        // Toggle AI console; close other panels first
        setAmazonPanelVisible(false);
        setEditPanelVisible(false);
        setWardrobeOpen(false);
        setAIConsoleVisible((v) => !v);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [phase]);
  
  // Guard: if persisted state left us in ThemeSelect without a character, bounce back to CharacterSelect
  useEffect(() => {
    if (phase === 'ThemeSelect' && !character) {
      setPhase('CharacterSelect');
    }
  }, [phase, character, setPhase]);

  // Guard: if persisted state left us in ThemeSelect without a character, bounce back to CharacterSelect
  useEffect(() => {
    if (phase === 'ThemeSelect' && !character) {
      setPhase('CharacterSelect');
    }
  }, [phase, character, setPhase]);

  // Wheel is shown after avatar confirmation (phase is set inside AvatarPanel)

  return (
    <main className="relative w-screen h-screen overflow-hidden">
      {/* Canvas Background - CenterStage takes full viewport */}
      <CenterStage />
      
      {/* Fixed positioned overlay elements */}
      {phase !== 'CharacterSelect' && phase !== 'ThemeSelect' && <TopBar />}
      <HistoryStrip />
      
      {/* Conditional rendering based on phase */}
      {(() => {
        console.log('🎮 GAME PAGE: Current phase is', phase, '| Should show AvatarPanel:', phase === 'CharacterSelect');
        return null;
      })()}
      {phase === 'ThemeSelect' && character ? (
        <ThemeWheelModal open={true} onClose={() => { /* handled by spin */ }} />
      ) : phase === 'CharacterSelect' ? (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-[100svh] flex items-start justify-center p-4 sm:p-6">
            <div className="w-full max-w-6xl my-6">
              <AvatarPanel />
            </div>
          </div>
        </div>
      ) : (
        <ToolsIsland 
          onSearchClick={() => {
            if (!canOpenShopping) { showToast(shoppingTooltip, 'info'); return; }
            setAmazonPanelVisible(true);
          }}
          onEditClick={() => {
            if (!canOpenEdit) { showToast(editTooltip, 'info'); return; }
            setEditPanelVisible(true);
          }}
          onWardrobeClick={() => {
            if (!canOpenWardrobe) { showToast(wardrobeTooltip, 'info'); return; }
            setWardrobeOpen(true);
          }}
          onAIConsoleClick={() => setAIConsoleVisible(!isAIConsoleVisible)}
          searchDisabled={!canOpenShopping}
          editDisabled={!canOpenEdit}
          wardrobeDisabled={!canOpenWardrobe}
          searchTooltip={shoppingTooltip}
          editTooltip={editTooltip}
          wardrobeTooltip={wardrobeTooltip}
        />
      )}
      
      {/* Panel overlays - only render when visible */}
      {isAmazonPanelVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg">
          <div 
            className="fixed inset-0"
            onClick={() => setAmazonPanelVisible(false)}
          />
          <div className="relative w-[96vw] max-w-[1600px] mx-2 h-[96vh]">
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

