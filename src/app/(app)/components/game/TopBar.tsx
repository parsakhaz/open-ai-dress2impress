"use client";
import { useGameStore } from '@/lib/state/gameStore';
import { createCountdown } from '@/lib/util/timers';
import { useEffect, useRef } from 'react';
import { GlassPanel } from '@/components/GlassPanel';
import { useToast } from '@/hooks/useToast';
import { GAME_PHASES } from '@/lib/constants/gamePhases';
import { useDebugStore } from '@/lib/state/debugStore';

export default function TopBar() {
  const phase = useGameStore((s) => s.phase);
  const theme = useGameStore((s) => s.theme);
  const timer = useGameStore((s) => s.timer);
  const setTimer = useGameStore((s) => s.setTimer);
  const setPhase = useGameStore((s) => s.setPhase);
  // Access to wardrobe not needed for new header layout
  const resetGame = useGameStore((s) => s.resetGame);
  const stopRef = useRef<null | (() => void)>(null);
  const { showToast } = useToast();
  const muteToasts = useDebugStore((s) => s.muteToasts);
  const disableAutoTimers = useDebugStore((s) => s.disableAutoTimers);
  const thresholdsShownRef = useRef<Set<string>>(new Set());
  const lastPhaseRef = useRef<string | null>(null);
  // Removed clamp refs
  
  const phases = GAME_PHASES;
  type GamePhase = (typeof GAME_PHASES)[number];
  
  const nextPhase = () => {
    const currentIndex = phases.indexOf(phase as GamePhase);
    const nextIndex = (currentIndex + 1) % phases.length;
    setPhase(phases[nextIndex]);
  };

  useEffect(() => {
    // Timers
    stopRef.current?.();
    if (!disableAutoTimers) {
      if (phase === 'ShoppingSpree') {
        stopRef.current = createCountdown(120, (s) => setTimer(s), () => setPhase('StylingRound'));
      } else if (phase === 'StylingRound') {
        stopRef.current = createCountdown(90, (s) => setTimer(s), () => setPhase('Accessorize'));
      } else {
        stopRef.current = null;
      }
    } else {
      stopRef.current = null;
    }
    // Reset threshold tracking on phase change and show toasts
    thresholdsShownRef.current.clear();
    if (lastPhaseRef.current !== phase) {
      // Transition toasts (previous -> current)
      if (!muteToasts) {
        if (lastPhaseRef.current === 'ShoppingSpree' && phase === 'StylingRound') {
          showToast("Time's up! Moving to Styling.", 'success', 2000);
        }
        if (lastPhaseRef.current === 'StylingRound' && phase === 'Accessorize') {
          showToast("Time's up! Moving to Accessorize.", 'success', 2200);
        }
      }
      // Phase start toasts (current)
      if (!muteToasts) {
        if (phase === 'ShoppingSpree') {
          showToast('Shopping started. You have 2:00.', 'info', 2500);
        }
        if (phase === 'StylingRound') {
          showToast('Styling started. You have 1:30.', 'info', 2500);
        }
        if (phase === 'Accessorize') {
          showToast('Accessorize: one AI edit for finishing touches (30–100s). Combine instructions; you’ll get 4 options.', 'info', 3600);
        }
      }
      lastPhaseRef.current = phase;
    }
    return () => {
      stopRef.current?.();
      stopRef.current = null;
    };
  }, [phase, setPhase, setTimer, disableAutoTimers, muteToasts]);

  // Removed clamp effect
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Round label mapping for visual header only (UI change only)
  const roundInfo = (() => {
    if (phase === 'ShoppingSpree') return { num: 1, title: 'Pick Your Clothes' } as const;
    if (phase === 'StylingRound') return { num: 2, title: 'Style Your Outfit' } as const;
    if (phase === 'Accessorize') return { num: 3, title: 'Accessorize' } as const;
    return null;
  })();

  // Threshold toasts for time remaining
  useEffect(() => {
    if (timer <= 0) return;
    const key = (mark: number) => `${phase}:${mark}`;
    const shown = thresholdsShownRef.current;
    const emit = (mark: number, message: string, type: 'info' | 'warning', duration = 2000) => {
      const k = key(mark);
      if (shown.has(k)) return;
      shown.add(k);
      if (!muteToasts) showToast(message, type, duration);
    };
    if (phase === 'ShoppingSpree') {
      if (timer === 60) emit(60, '1:00 remaining.', 'info', 2200);
      if (timer === 30) emit(30, '30 seconds remaining before Styling.', 'warning', 2000);
      if (timer === 10) emit(10, '10 seconds remaining before Styling.', 'warning', 1800);
    } else if (phase === 'StylingRound') {
      if (timer === 45) emit(45, '0:45 remaining.', 'info', 2200);
      if (timer === 20) emit(20, '20 seconds remaining before Accessorize.', 'warning', 2000);
      if (timer === 10) emit(10, '10 seconds remaining before Accessorize.', 'warning', 1800);
    }
  }, [timer, phase, showToast, muteToasts]);

  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[70] w-full max-w-3xl px-4 ${phase === 'ThemeSelect' ? 'pointer-events-none' : ''}`}>
      <GlassPanel className="px-6 pt-6 pb-6 space-y-4 text-center border-0 bg-transparent">
        {/* Theme (top): colored label then theme name */}
        <h2 className="text-[32px] font-extrabold text-foreground">
          <span className="text-[#7D8FE2]">Theme:</span> {theme}
        </h2>

        {/* Round (middle): bordered pill */}
        {roundInfo && (
          <div className="mx-auto inline-flex items-center rounded-[8px] border-2 border-[#7D8FE2] p-[10px]">
            <span className="font-extrabold text-[#7D8FE2] mr-2 text-[16px]">ROUND {roundInfo.num}:</span>
            <span className="font-semibold text-foreground text-[16px]">{roundInfo.title}</span>
          </div>
        )}

        {/* Timer (bottom): large centered */}
        {timer > 0 && (
          <div className="text-[24px] font-extrabold text-foreground font-mono">
            {formatTime(timer)}
          </div>
        )}

        {/* Time warnings */}
        {timer > 0 && timer <= 30 && (
          <div className="flex items-center gap-2 text-foreground text-sm animate-pulse">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium">Time running out!</span>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}


