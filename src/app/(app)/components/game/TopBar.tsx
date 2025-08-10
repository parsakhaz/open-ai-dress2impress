"use client";
import { useGameStore } from '@/lib/state/gameStore';
import { createCountdown } from '@/lib/util/timers';
import { useEffect, useRef } from 'react';
import { GlassPanel } from '@/components/GlassPanel';
import { Chip } from '@/components/Chip';
import { ProgressIndicator } from '@/components/ProgressIndicator';
import { Tooltip } from '@/components/Tooltip';
import { useToast } from '@/hooks/useToast';

export default function TopBar() {
  const phase = useGameStore((s) => s.phase);
  const theme = useGameStore((s) => s.theme);
  const timer = useGameStore((s) => s.timer);
  const setTimer = useGameStore((s) => s.setTimer);
  const setPhase = useGameStore((s) => s.setPhase);
  const wardrobe = useGameStore((s) => s.wardrobe);
  const resetGame = useGameStore((s) => s.resetGame);
  const stopRef = useRef<null | (() => void)>(null);
  const { showToast } = useToast();
  const thresholdsShownRef = useRef<Set<string>>(new Set());
  const lastPhaseRef = useRef<string | null>(null);
  const prevWardrobeLenRef = useRef<number>(wardrobe.length);
  const clampedThisPhaseRef = useRef<boolean>(false);
  
  const phases = ['CharacterSelect', 'ThemeSelect', 'ShoppingSpree', 'StylingRound', 'WalkoutAndEval', 'Results'] as const;
  type GamePhase = typeof phases[number];
  
  const nextPhase = () => {
    const currentIndex = phases.indexOf(phase as GamePhase);
    const nextIndex = (currentIndex + 1) % phases.length;
    setPhase(phases[nextIndex]);
  };

  useEffect(() => {
    if (phase === 'ShoppingSpree') {
      stopRef.current?.();
      stopRef.current = createCountdown(120, (s) => setTimer(s), () => setPhase('StylingRound'));
    } else if (phase === 'StylingRound') {
      stopRef.current?.();
      stopRef.current = createCountdown(90, (s) => setTimer(s), () => setPhase('WalkoutAndEval'));
    } else {
      stopRef.current?.();
      stopRef.current = null;
    }
    // Reset threshold tracking on phase change and show toasts
    thresholdsShownRef.current.clear();
    if (lastPhaseRef.current !== phase) {
      // Transition toasts (previous -> current)
      if (lastPhaseRef.current === 'ShoppingSpree' && phase === 'StylingRound') {
        showToast("Time's up! Moving to Styling.", 'success', 2000);
      }
      if (lastPhaseRef.current === 'StylingRound' && phase === 'WalkoutAndEval') {
        showToast("Time's up! Moving to Walkout.", 'success', 2000);
      }
      // Phase start toasts (current)
      if (phase === 'ShoppingSpree') {
        showToast('Shopping started. You have 2:00.', 'info', 2500);
      }
      if (phase === 'StylingRound') {
        showToast('Styling started. You have 1:30.', 'info', 2500);
      }
      lastPhaseRef.current = phase;
    }
    return () => {
      stopRef.current?.();
      stopRef.current = null;
    };
  }, [phase, setPhase, setTimer]);

  // Clamp timer to 15s when wardrobe transitions 7 -> 8 during Shopping
  useEffect(() => {
    if (phase !== 'ShoppingSpree') {
      clampedThisPhaseRef.current = false;
      prevWardrobeLenRef.current = wardrobe.length;
      return;
    }
    const prev = prevWardrobeLenRef.current;
    const curr = wardrobe.length;
    if (!clampedThisPhaseRef.current && prev === 7 && curr === 8 && timer > 15) {
      setTimer(15);
      clampedThisPhaseRef.current = true;
      showToast('Great picks! 15 seconds left to finalize.', 'info', 2200);
    }
    prevWardrobeLenRef.current = curr;
  }, [phase, wardrobe.length, timer, setTimer, showToast]);
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress for timed phases
  const getProgress = () => {
    switch (phase) {
      case 'ShoppingSpree':
        return { current: 120 - timer, total: 120, label: 'Shopping Time' };
      case 'StylingRound':
        return { current: 90 - timer, total: 90, label: 'Styling Time' };
      default:
        return null;
    }
  };

  const progress = getProgress();

  // Threshold toasts for time remaining
  useEffect(() => {
    if (timer <= 0) return;
    const key = (mark: number) => `${phase}:${mark}`;
    const shown = thresholdsShownRef.current;
    const emit = (mark: number, message: string, type: 'info' | 'warning', duration = 2000) => {
      const k = key(mark);
      if (shown.has(k)) return;
      shown.add(k);
      showToast(message, type, duration);
    };
    if (phase === 'ShoppingSpree') {
      if (timer === 60) emit(60, '1:00 remaining.', 'info', 2200);
      if (timer === 30) emit(30, '30 seconds remaining before Styling.', 'warning', 2000);
      if (timer === 10) emit(10, '10 seconds remaining before Styling.', 'warning', 1800);
    } else if (phase === 'StylingRound') {
      if (timer === 45) emit(45, '0:45 remaining.', 'info', 2200);
      if (timer === 20) emit(20, '20 seconds remaining before Walkout.', 'warning', 2000);
      if (timer === 10) emit(10, '10 seconds remaining before Walkout.', 'warning', 1800);
    }
  }, [timer, phase, showToast]);

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[70] w-full max-w-2xl px-4 ${phase === 'ThemeSelect' ? 'pointer-events-none' : ''}`}>
      <GlassPanel className="px-4 pt-2 pb-3 space-y-3">
        {/* Top row with phase and theme */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Phase chip */}
            <Tooltip content="Current game phase" position="bottom">
              <Chip 
                label={phase.replace(/([A-Z])/g, ' $1').trim()}
                variant={phase === 'ShoppingSpree' ? 'primary' : 'default'}
                icon={
                  <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                }
              />
            </Tooltip>
            
            {/* Theme chip */}
            <Tooltip content="Today's theme" position="bottom">
              <Chip 
                label={theme}
                variant="success"
                icon={
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                }
              />
            </Tooltip>

            {/* Items collected */}
            {phase === 'ShoppingSpree' && (
              <Tooltip content="Items in wardrobe" position="bottom">
                <Chip 
                  label={`${wardrobe.length} items`}
                  variant="warning"
                  size="sm"
                />
              </Tooltip>
            )}
          </div>

          {/* Reset button */}
          <Tooltip content="Reset game and start over" position="bottom">
            <button
              onClick={() => {
                if (confirm('Are you sure you want to reset the game? All progress will be lost.')) {
                  resetGame();
                  window.location.reload(); // Reload to clear any UI state
                }
              }}
              className="ml-auto p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </Tooltip>

          {/* Timer */}
          {timer > 0 && (
            <div className="flex items-center gap-2">
              <svg className={`w-4 h-4 ${timer <= 30 ? 'text-red-500' : 'text-accent'} animate-pulse`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className={`font-mono font-bold text-lg ${
                timer <= 30 ? 'text-red-500 animate-pulse' : 
                timer <= 60 ? 'text-orange-500' : 'text-slate-900 dark:text-slate-100'
              }`}>
                {formatTime(timer)}
              </span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {progress && (
          <ProgressIndicator 
            current={progress.current}
            total={progress.total}
            label={progress.label}
            color={timer <= 30 ? 'bg-red-500' : timer <= 60 ? 'bg-orange-500' : 'bg-blue-500'}
          />
        )}

        {/* Time warnings */}
        {timer > 0 && timer <= 30 && (
          <div className="flex items-center gap-2 text-red-500 text-sm animate-pulse">
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


