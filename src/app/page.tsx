"use client";
import { useGameStore } from '@/lib/state/gameStore';
import { useEffect, useState } from 'react';
import { Confetti } from '@/components/Confetti';
import TopBar from '@/app/(app)/components/game/TopBar';
import CenterStage from '@/app/(app)/components/game/CenterStage';
import HistoryStrip from '@/app/(app)/components/game/HistoryStrip';
import AIConsole from '@/app/(app)/components/ai/AIConsole';
import GameBoard from '@/app/(app)/components/game/GameBoard';
import StylingBoard from '@/app/(app)/components/game/StylingBoard';
import AvatarPanel from '@/app/(app)/components/panels/AvatarPanel';
import EditWithAIPanel from '@/app/(app)/components/panels/EditWithAIPanel';
import WardrobeModal from '@/app/(app)/components/ui/WardrobeModal';
import WardrobeContent from '@/app/(app)/components/ui/WardrobeContent';
import { DebugPanel } from '@/components/DebugPanel';
import { useToast } from '@/hooks/useToast';
import ThemeDrawModal from '@/app/(app)/components/ui/ThemeDrawModal';
import UrgencyVignette from '@/app/(app)/components/game/UrgencyVignette';
import { generateWalkoutVideo } from '@/lib/adapters/video';
import { useDebugStore } from '@/lib/state/debugStore';
import { canUseShopping, canUseEdit, canOpenWardrobe, shoppingTooltipFor, editTooltipFor, wardrobeTooltipFor } from '@/lib/constants/phasePermissions';

export default function GamePage() {
  const phase = useGameStore((s) => s.phase);
  const theme = useGameStore((s) => s.theme);
  const character = useGameStore((s) => s.character);
  const currentImageUrl = useGameStore((s) => s.currentImageUrl);
  const runwayBaseImageUrl = useGameStore((s) => s.runwayBaseImageUrl);
  const setPhase = useGameStore((s) => s.setPhase);
  const resetGame = useGameStore((s) => s.resetGame);
  const persistedRunwayUrl = useGameStore((s) => s.runwayUrl);
  const setPersistedRunwayUrl = useGameStore((s) => s.setRunwayUrl);
  const { showToast, ToastContainer } = useToast();
  
  // Panel visibility states
  const [isEditPanelVisible, setEditPanelVisible] = useState(false);
  const [isWardrobeOpen, setWardrobeOpen] = useState(false);
  const [isAIConsoleVisible, setAIConsoleVisible] = useState(false);

  // Global confetti triggers (left and right side bursts)
  const [leftConfettiTrigger, setLeftConfettiTrigger] = useState(false);
  const [rightConfettiTrigger, setRightConfettiTrigger] = useState(false);
  const [leftSource, setLeftSource] = useState<{ x: number; y: number; w: number; h: number } | undefined>(undefined);
  const [rightSource, setRightSource] = useState<{ x: number; y: number; w: number; h: number } | undefined>(undefined);

  // Runway (final walk) state
  const [runwayLoading, setRunwayLoading] = useState(false);
  const [runwayUrl, setRunwayUrl] = useState<string | null>(null);
  const [runwayError, setRunwayError] = useState<string | null>(null);
  const [runwayStarted, setRunwayStarted] = useState(false);
  const [runwayElapsed, setRunwayElapsed] = useState(0); // seconds
  const progressToastKeysRef = (function useOnceRef() {
    const React = require('react') as typeof import('react');
    const ref = React.useRef<Set<string>>(new Set());
    return ref;
  })();
  
  console.log('🚀 INITIAL RENDER: Page component is executing');

  // Phase-based gating
  const muteToasts = useDebugStore((s) => s.muteToasts);
  const disableAutoRunway = useDebugStore((s) => s.disableAutoRunway);

  const canOpenShopping = canUseShopping(phase);
  const canEdit = canUseEdit(phase);
  const canWardrobe = canOpenWardrobe(phase);
  const shoppingTooltip = shoppingTooltipFor(phase);
  const editTooltip = editTooltipFor(phase);
  const wardrobeTooltip = wardrobeTooltipFor(phase);
  
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

  // Listen for global confetti events so celebrations outlive panel unmounts
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ side?: 'left' | 'right' | 'both'; pieces?: number }>).detail || {};
      const side = detail.side || 'both';
      const width = typeof window !== 'undefined' ? window.innerWidth : 0;
      const height = typeof window !== 'undefined' ? window.innerHeight : 0;
      const leftRect = { x: 0, y: 0, w: Math.max(16, Math.round(width * 0.02)), h: height };
      const rightRect = { x: Math.max(0, width - Math.max(16, Math.round(width * 0.02))), y: 0, w: Math.max(16, Math.round(width * 0.02)), h: height };
      if (side === 'left' || side === 'both') {
        setLeftSource(leftRect);
        setLeftConfettiTrigger((t) => !t);
      }
      if (side === 'right' || side === 'both') {
        setRightSource(rightRect);
        setRightConfettiTrigger((t) => !t);
      }
    };
    window.addEventListener('GLOBAL_CONFETTI', handler as EventListener);
    return () => window.removeEventListener('GLOBAL_CONFETTI', handler as EventListener);
  }, []);

  // Trigger runway video generation when entering WalkoutAndEval
  useEffect(() => {
    if (phase !== 'WalkoutAndEval') {
      // Reset trigger guard when leaving the phase
      setRunwayStarted(false);
      return;
    }
    if (disableAutoRunway || runwayStarted) return;
    const baseUrl = runwayBaseImageUrl || currentImageUrl || character?.avatarUrl || null;
    if (!baseUrl) {
      setRunwayError('No image available to generate a runway video.');
      showToast('No final look selected to generate a runway video.', 'error');
      return;
    }
    // Clear any persisted/local runway from a previous session/run before starting
    setRunwayUrl(null);
    setPersistedRunwayUrl(null);
    setRunwayStarted(true);
    setRunwayError(null);
    setRunwayLoading(true);
    setRunwayElapsed(0);
    progressToastKeysRef.current.clear();
    if (!muteToasts) showToast('Runway generation started. This can take ~2 minutes.', 'info', 3200);
    (async () => {
      try {
        const url = await generateWalkoutVideo(baseUrl);
        setRunwayUrl(url);
        setPersistedRunwayUrl(url);
        setPhase('Results');
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to generate runway video';
        setRunwayError(msg);
        if (!muteToasts) showToast('Runway generation failed. Please try again.', 'error');
      } finally {
        setRunwayLoading(false);
      }
    })();
  }, [phase, runwayStarted, currentImageUrl, character, setPhase, showToast, disableAutoRunway, muteToasts]);

  // Also clear any persisted runway URL when returning to StylingRound
  useEffect(() => {
    if (phase === 'StylingRound') {
      setRunwayUrl(null);
      setPersistedRunwayUrl(null);
    }
  }, [phase, setPersistedRunwayUrl]);

  // Progress ticker during Walkout phase
  useEffect(() => {
    if (!(phase === 'WalkoutAndEval' && runwayLoading)) return;
    const id = setInterval(() => setRunwayElapsed((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [phase, runwayLoading]);

  // Staged toasts to keep users engaged during generation
  useEffect(() => {
    if (!(phase === 'WalkoutAndEval' && runwayLoading)) return;
    const notifyOnce = (key: string, message: string, type: Parameters<typeof showToast>[1] = 'info', duration = 2600) => {
      if (progressToastKeysRef.current.has(key)) return;
      progressToastKeysRef.current.add(key);
      if (!muteToasts) showToast(message, type, duration);
    };
    if (runwayElapsed >= 10) notifyOnce('t10', 'Studio is setting the lights and camera…');
    if (runwayElapsed >= 45) notifyOnce('t45', 'Generating your runway motion…');
    if (runwayElapsed >= 90) notifyOnce('t90', 'Color grading and refining details…');
    if (runwayElapsed >= 110) notifyOnce('t110', 'Final touches—preparing your premiere…');
  }, [phase, runwayLoading, runwayElapsed, showToast, muteToasts]);

  const RUNWAY_ETA_SECONDS = 120; // ~2 minutes nominal ETA
  const runwayProgressPct = Math.min(95, Math.round((runwayElapsed / RUNWAY_ETA_SECONDS) * 100));
  const remainingSeconds = Math.max(0, RUNWAY_ETA_SECONDS - runwayElapsed);
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  const statusMessage = (() => {
    if (runwayElapsed < 10) return 'Booking the runway…';
    if (runwayElapsed < 45) return 'Warming up the studio lights…';
    if (runwayElapsed < 90) return 'Directing your walk sequence…';
    if (runwayElapsed < 110) return 'Color grading and refining details…';
    return 'Final touches—preparing your premiere…';
  })();

  // Auto-close disallowed panels on phase changes
  useEffect(() => {
    if (phase === 'ShoppingSpree') {
      setEditPanelVisible(false);
      setWardrobeOpen(false);
      setAIConsoleVisible(false);
    } else if (phase === 'StylingRound') {
      setEditPanelVisible(false);
      setAIConsoleVisible(false);
      // Auto-open Wardrobe on entering StylingRound so users can choose/preview try-on results
      setWardrobeOpen(true);
    } else if (phase === 'Accessorize') {
      // Auto-open Edit; close others
      setWardrobeOpen(false);
      setAIConsoleVisible(false);
      setEditPanelVisible(true);
      try { useGameStore.getState().setAccessorizeUsed(false); } catch {}
      // Clear previous runway base to avoid stale usages
      try { useGameStore.getState().setRunwayBaseImageUrl(null); } catch {}
    } else {
      // In other phases, close all tool panels
      setEditPanelVisible(false);
      setWardrobeOpen(false);
      setAIConsoleVisible(false);
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
        setEditPanelVisible(false);
        setWardrobeOpen(false);
        setAIConsoleVisible(false);
        return;
      }

      // Only enable tool shortcuts outside of CharacterSelect
      if (phase === 'CharacterSelect') return;

      if (key === 's') {
        if (!canOpenShopping) {
          if (!muteToasts) showToast(shoppingTooltip, 'info');
          return;
        }
        // Shopping lives in the left sidebar now; nothing to open
        if (!muteToasts) showToast('Use the left Generate panel to search.', 'info');
      } else if (key === 'e') {
        if (!canEdit) {
          if (!muteToasts) showToast(editTooltip, 'info');
          return;
        }
        // Open Edit; close others
        setWardrobeOpen(false);
        setAIConsoleVisible(false);
        setEditPanelVisible(true);
      } else if (key === 'w') {
        if (!canWardrobe) {
          if (!muteToasts) showToast(wardrobeTooltip, 'info');
          return;
        }
        // Open Wardrobe; close others
        setEditPanelVisible(false);
        setAIConsoleVisible(false);
        setWardrobeOpen(true);
      } else if (key === 'a') {
        // In Accessorize, AI console is disabled
        if (phase === 'Accessorize') {
          if (!muteToasts) showToast('AI Console toggle is disabled in Accessorize.', 'info', 1800);
          return;
        }
        // Toggle AI console; close other panels first
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
      {/* Urgency vignette overlay during last seconds */}
      <UrgencyVignette />
      
      {/* Fixed positioned overlay elements */}
      {phase !== 'CharacterSelect' && phase !== 'ThemeSelect' && <TopBar />}
      <HistoryStrip />
      
      {/* Board layout (single screen) during gameplay phases */}
      {phase !== 'CharacterSelect' && phase !== 'ThemeSelect' && (
        phase === 'StylingRound' ? <StylingBoard /> : <GameBoard />
      )}

      {/* Conditional rendering based on phase */}
      {(() => {
        console.log('🎮 GAME PAGE: Current phase is', phase, '| Should show AvatarPanel:', phase === 'CharacterSelect');
        return null;
      })()}
      {phase === 'ThemeSelect' && character ? (
        <ThemeDrawModal open={true} onClose={() => { /* handled by draw */ }} />
      ) : phase === 'CharacterSelect' ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
          <div className="min-h-[100svh] flex items-start justify-center p-4 sm:p-6">
            <div className="w-full max-w-6xl my-6">
              <AvatarPanel />
            </div>
          </div>
        </div>
      ) : null}
      
      {/* Amazon modal removed in single-screen layout; generation lives in left sidebar */}
      
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
      
      {/* AI Console dialog not needed; logs live on the right in the board */}
      <DebugPanel />
      
      {/* Walkout loading overlay */}
      {phase === 'WalkoutAndEval' && runwayLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg">
          <div className="text-center space-y-5">
            <div className="w-12 h-12 mx-auto rounded-full border-4 border-white/30 border-t-white animate-spin" />
            <div className="text-white/95 text-lg font-medium">Generating your runway walk…</div>
            <div className="text-white/80 text-sm">{statusMessage}</div>
            <div className="w-80 max-w-[70vw] h-3 mx-auto rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-accent/60 to-accent" style={{ width: `${runwayProgressPct}%` }} />
            </div>
            <div className="text-white/70 text-xs">{runwayProgressPct}% • ~{formatTime(remainingSeconds)} remaining (est.)</div>
            {runwayError && <div className="text-red-300 text-sm">{runwayError}</div>}
          </div>
        </div>
      )}

      {/* Walkout debug overlay when auto-runway is disabled */}
      {phase === 'WalkoutAndEval' && !runwayLoading && disableAutoRunway && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-lg">
          <div className="text-center space-y-4 text-white">
            <div className="text-lg font-semibold">Runway generation disabled by debug.</div>
            <div className="text-sm text-white/80">Enable it in Debug Panel → FLOW to auto-generate, or jump to Results.</div>
          </div>
        </div>
      )}

      {/* Results overlay with video */}
      {phase === 'Results' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg">
          <div className="w-full max-w-6xl mx-6 py-8">
            <div className="w-full aspect-video max-h-[80vh] mx-auto rounded-2xl overflow-hidden shadow-2xl bg-black/90 flex items-center justify-center">
              {(runwayUrl || persistedRunwayUrl) ? (
                <video
                  src={runwayUrl || persistedRunwayUrl || ''}
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls={false}
                  controlsList="nodownload noremoteplayback noplaybackrate"
                  className="w-full h-full object-contain"
                  onContextMenu={(e) => e.preventDefault()}
                />
              ) : (
                currentImageUrl ? (
                  <img src={currentImageUrl} alt="Final look" className="w-full h-full object-contain" />
                ) : null
              )}
            </div>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20"
                onClick={() => { setPersistedRunwayUrl(null); resetGame(); }}
              >
                Restart
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20"
                onClick={() => { setPersistedRunwayUrl(null); setPhase('StylingRound'); }}
              >
                Back to styling
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skip Accessorize CTA */}
      {phase === 'Accessorize' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <button
            className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 backdrop-blur-md border border-white/20"
            onClick={() => { if (!muteToasts) showToast('Skipping accessories—preparing the runway.', 'info', 2000); setEditPanelVisible(false); setPhase('WalkoutAndEval'); }}
          >
            Skip Accessorize
          </button>
        </div>
      )}

      {/* Toast notifications */}
      <ToastContainer />

      {/* Global Confetti (renders above all content via portal) */}
      <Confetti trigger={leftConfettiTrigger} source={leftSource} pieces={200} />
      <Confetti trigger={rightConfettiTrigger} source={rightSource} pieces={200} />
    </main>
  );
}

