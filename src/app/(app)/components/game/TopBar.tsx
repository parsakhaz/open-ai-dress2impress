"use client";
import { useGameStore } from '@/lib/state/gameStore';
import { createCountdown } from '@/lib/util/timers';
import { useEffect, useRef } from 'react';

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
  return (
    <div className="flex items-center justify-between p-3 border-b bg-white rounded">
      <div className="font-semibold">Dress To Impress</div>
      <div className="text-sm">Theme: <span className="font-medium">{theme}</span></div>
      <div className="text-sm">Phase: <span className="font-medium">{phase}</span></div>
      <div className="text-sm">Timer: <span className="font-mono">{timer}s</span></div>
      <div className="flex gap-2">
        <button className="px-2 py-1 text-xs border rounded" onClick={() => setPhase('CharacterSelect')}>Phase 0</button>
        <button className="px-2 py-1 text-xs border rounded" onClick={() => setPhase('ShoppingSpree')}>Phase 1</button>
        <button className="px-2 py-1 text-xs border rounded" onClick={() => setPhase('StylingRound')}>Phase 2</button>
      </div>
    </div>
  );
}


