"use client";
import { useGameStore } from '@/lib/state/gameStore';
import { createCountdown } from '@/lib/util/timers';
import { useEffect, useRef } from 'react';
import { GlassPanel } from '@/components/GlassPanel';

export default function TopBar() {
  const phase = useGameStore((s) => s.phase);
  const timer = useGameStore((s) => s.timer);
  const setTimer = useGameStore((s) => s.setTimer);
  const setPhase = useGameStore((s) => s.setPhase);
  const stopRef = useRef<null | (() => void)>(null);
  
  const phases = ['CharacterSelect', 'ShoppingSpree', 'StylingRound', 'WalkoutAndEval', 'Results'] as const;
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
    return () => {
      stopRef.current?.();
      stopRef.current = null;
    };
  }, [phase, setPhase, setTimer]);
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-30">
      <GlassPanel className="flex items-center gap-4 px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">GAME PHASE:</span>
          </div>
          <button 
            onClick={nextPhase}
            className="font-bold text-slate-900 dark:text-slate-100 hover:text-accent transition-colors cursor-pointer px-2 py-1 rounded bg-accent/10 hover:bg-accent/20"
            title="Click to cycle through phases (dev)"
          >
            {phase}
          </button>
        </div>
        {timer > 0 && (
          <div className="flex items-center gap-2 border-l border-white/20 pl-4">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-accent animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">TIME:</span>
            </div>
            <span className={`font-mono font-bold text-lg ${
              timer <= 30 ? 'text-red-500 animate-pulse' : 
              timer <= 60 ? 'text-orange-500' : 'text-accent'
            }`}>
              {formatTime(timer)}
            </span>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}


