"use client";
import { useGameStore } from '@/lib/state/gameStore';
import { useEffect } from 'react';
import { GlassPanel } from '@/components/GlassPanel';

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
    <GlassPanel>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Game AI</h3>
            <span className="text-xs px-2 py-1 bg-green-400/20 text-green-600 dark:text-green-400 rounded-full font-mono">ONLINE</span>
          </div>
        </div>
        
        <div className="h-48 overflow-auto rounded-lg bg-black/95 dark:bg-black/70 backdrop-blur-sm p-4 font-mono text-sm border border-green-500/20">
          {aiLog.length === 0 ? (
            <div className="text-green-400/60 flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Game AI awaiting fashion instructions...
            </div>
          ) : (
            aiLog.map((e, i) => (
              <div key={i} className="mb-2 last:mb-0">
                <div className="flex items-start gap-2">
                  <span className="text-green-300/60 text-xs mt-0.5 whitespace-nowrap">
                    [{new Date(e.timestamp).toLocaleTimeString()}]
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-block px-2 py-0.5 text-xs rounded font-semibold ${
                        e.type === 'thought' 
                          ? 'bg-blue-400/20 text-blue-300 border border-blue-400/30' 
                          : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                      }`}>
                        {e.type === 'thought' ? '🧠 ANALYZING' : '⚡ ACTION'}
                      </span>
                    </div>
                    <p className="text-green-100 text-sm break-words">{e.content}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </GlassPanel>
  );
}


