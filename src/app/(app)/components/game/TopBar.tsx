"use client";
import { useGameStore } from '@/lib/state/gameStore';
import { createCountdown } from '@/lib/util/timers';
import { useEffect, useRef } from 'react';
import { GlassPanel } from '@/components/GlassPanel';
import { GlassButton } from '@/components/GlassButton';

export default function TopBar() {
  const phase = useGameStore((s) => s.phase);
  const theme = useGameStore((s) => s.theme);
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
    <GlassPanel className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-6">
        <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
          Dress To Impress
        </h1>
        <div className="hidden sm:flex items-center gap-1 px-3 py-1 rounded-full bg-white/30 dark:bg-black/20 backdrop-blur-sm">
          <span className="text-sm text-slate-600 dark:text-slate-400">Theme:</span>
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{theme}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-4 px-3 py-2 rounded-xl bg-white/20 dark:bg-black/20 backdrop-blur-sm">
          <div className="text-sm">
            <span className="text-slate-600 dark:text-slate-400">Phase:</span>
            <span className="ml-1 font-medium text-slate-900 dark:text-slate-100">{phase}</span>
          </div>
          {timer > 0 && (
            <div className="text-sm font-mono">
              <span className="text-slate-600 dark:text-slate-400">Timer:</span>
              <span className="ml-1 font-bold text-accent">{formatTime(timer)}</span>
            </div>
          )}
        </div>
        
        <div className="flex gap-1">
          <GlassButton 
            size="sm" 
            variant="ghost"
            onClick={() => setPhase('CharacterSelect')}
            className={phase === 'CharacterSelect' ? 'bg-accent/20 text-accent' : ''}
          >
            Avatar
          </GlassButton>
          <GlassButton 
            size="sm" 
            variant="ghost"
            onClick={() => setPhase('ShoppingSpree')}
            className={phase === 'ShoppingSpree' ? 'bg-accent/20 text-accent' : ''}
          >
            Shop
          </GlassButton>
          <GlassButton 
            size="sm" 
            variant="ghost"
            onClick={() => setPhase('StylingRound')}
            className={phase === 'StylingRound' ? 'bg-accent/20 text-accent' : ''}
          >
            Style
          </GlassButton>
        </div>
      </div>
    </GlassPanel>
  );
}


