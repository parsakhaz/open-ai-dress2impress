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
          <span className="text-sm text-slate-600 dark:text-slate-400">Phase:</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">{phase}</span>
        </div>
        {timer > 0 && (
          <div className="flex items-center gap-2 border-l border-white/20 pl-4">
            <span className="text-sm text-slate-600 dark:text-slate-400">Timer:</span>
            <span className="font-mono font-bold text-accent">{formatTime(timer)}</span>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}


