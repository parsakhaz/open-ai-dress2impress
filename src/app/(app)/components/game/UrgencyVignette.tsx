"use client";
import { useGameStore } from '@/lib/state/gameStore';

export default function UrgencyVignette() {
  const phase = useGameStore((s) => s.phase);
  const timer = useGameStore((s) => s.timer);

  const isTimedPhase = phase === 'ShoppingSpree' || phase === 'StylingRound';
  const level = !isTimedPhase || timer <= 0 || timer > 15 ? 'none' : timer <= 5 ? 'critical' : 'urgent';

  if (level === 'none') return null;

  const isCritical = level === 'critical';
  const intensity = isCritical ? 0.24 : 0.16;
  const durationMs = isCritical ? 700 : 1000;

  return (
    <div className="fixed inset-0 pointer-events-none z-[40]">
      <div className="absolute inset-0" style={{
        background: `radial-gradient(circle at center, rgba(0,0,0,0) 55%, rgba(239,68,68,${intensity * 0.7}) 82%, rgba(239,68,68,${intensity}) 100%)`
      }} />
      <style jsx>{`
        @keyframes heartbeatPulse {
          0% { opacity: 0; transform: scale(1); }
          30% { opacity: ${intensity}; transform: scale(1.02); }
          60% { opacity: ${intensity * 0.6}; transform: scale(1); }
          100% { opacity: 0; transform: scale(1); }
        }
      `}</style>
      <div
        className="absolute inset-0"
        style={{
          animation: `heartbeatPulse ${durationMs}ms ease-in-out infinite`,
          background: `radial-gradient(circle at center, rgba(0,0,0,0) 55%, rgba(239,68,68,${intensity * 0.6}) 80%, rgba(239,68,68,${intensity}) 100%)`
        }}
      />
    </div>
  );
}


