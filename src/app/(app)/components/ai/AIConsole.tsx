"use client";
import { useGameStore } from '@/lib/state/gameStore';
import { useEffect } from 'react';

export default function AIConsole() {
  const aiLog = useGameStore((s) => s.aiLog);
  const logAIEvent = useGameStore((s) => s.logAIEvent);

  // Simple demo log so the panel isn't empty
  useEffect(() => {
    if (aiLog.length === 0) {
      logAIEvent({ type: 'thought', content: 'Awaiting instructions…', timestamp: Date.now() });
    }
  }, [aiLog.length, logAIEvent]);
  return (
    <div className="border rounded p-3 text-sm h-48 overflow-auto bg-black text-green-300 font-mono">
      {aiLog.length === 0 ? (
        <div>AI console is idle…</div>
      ) : (
        aiLog.map((e, i) => (
          <div key={i} className="mb-1">
            <span className="opacity-60 mr-2">[{new Date(e.timestamp).toLocaleTimeString()}]</span>
            <span className="font-semibold mr-2">{e.type}</span>
            <span>{e.content}</span>
          </div>
        ))
      )}
    </div>
  );
}


