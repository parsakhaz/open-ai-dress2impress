"use client";
import { useGameStore } from '@/lib/state/gameStore';
import { useEffect, useRef, useState } from 'react';
import { GlassPanel } from '@/components/GlassPanel';
import { GlassButton } from '@/components/GlassButton';
import type { AIStreamEvent } from '@/lib/ai-player/types';
import { useMemo } from 'react';

interface AIConsoleProps {
  onClose?: () => void;
  autoRunOnMount?: boolean;
  inline?: boolean; // if true, render as inline panel (no modal chrome/buttons)
  showTryOnThumbs?: boolean;
}

export default function AIConsole({ onClose, autoRunOnMount = false, inline = false, showTryOnThumbs = false }: AIConsoleProps = {}) {
  const aiLog = useGameStore((s) => s.aiLog);
  const logAIEvent = useGameStore((s) => s.logAIEvent);
  const [isRunning, setIsRunning] = useState(false);
  const seededRef = useRef(false);
  const startedRef = useRef(false);
  const [tryOnImages, setTryOnImages] = useState<string[]>([]);

  // Simple demo log so the panel isn't empty
  useEffect(() => {
    if (seededRef.current) return;
    if (aiLog.length === 0) {
      seededRef.current = true;
      logAIEvent({ type: 'thought', content: 'Awaiting instructions…', timestamp: Date.now() });
    }
  }, [aiLog.length, logAIEvent]);

  // Handle Escape key to close modal (only when not inline)
  useEffect(() => {
    if (inline) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape' && onClose) onClose();
    }
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose, inline]);

  // Auto-run on mount if requested
  useEffect(() => {
    if (!autoRunOnMount) return;
    if (startedRef.current) return;
    startedRef.current = true;
    if (!isRunning) void runAIPlayer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRunOnMount]);

  const runAIPlayer = async () => {
    if (isRunning) return;
    setIsRunning(true);
    logAIEvent({ type: 'tool_call', content: 'Starting AI Player…', timestamp: Date.now() });

    try {
      // Send current character avatar and theme if available
      const character = useGameStore.getState().character;
      const theme = useGameStore.getState().theme || 'Summer Rooftop Party';
      const res = await fetch('/api/ai-player/run', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: character?.avatarUrl, theme }),
      });
      if (!res.body) throw new Error('No response body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const evt = JSON.parse(line) as AIStreamEvent;
            const label = `${evt.phase} ${evt.eventType}`;
            let content = `${label}: ${evt.message}`;
            if (evt.tool?.name) content += ` [${evt.tool.name}]`;
            if (typeof evt.durationMs === 'number') content += ` (${evt.durationMs}ms)`;
            if (evt.context) {
              const keys = Object.keys(evt.context);
              if (keys.length > 0) content += ` {${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', …' : ''}}`;
              // Capture try-on images when present
              if (showTryOnThumbs && Array.isArray((evt as any).context?.images)) {
                const imgs = ((evt as any).context.images as string[]).filter(Boolean);
                if (imgs.length > 0) {
                  setTryOnImages((prev) => {
                    const set = new Set(prev);
                    imgs.forEach((u) => set.add(u));
                    // keep last 6
                    return Array.from(set).slice(-6);
                  });
                }
              }
            }
            logAIEvent({ type: evt.eventType.startsWith('tool') ? 'tool_call' : 'thought', content, timestamp: Date.now() });
          } catch (e) {
            logAIEvent({ type: 'thought', content: `Malformed stream line`, timestamp: Date.now() });
          }
        }
      }
      logAIEvent({ type: 'tool_call', content: 'AI Player finished.', timestamp: Date.now() });
    } catch (e) {
      const m = e instanceof Error ? e.message : 'Unknown error';
      logAIEvent({ type: 'thought', content: `AI Player failed: ${m}`, timestamp: Date.now() });
    } finally {
      setIsRunning(false);
    }
  };

  // autoscroll (gentle) when inline
  const [logContainerRef, setLogContainerRef] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!inline || !logContainerRef) return;
    const el = logContainerRef;
    const isNearBottom = () => el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (!isNearBottom()) return; // don't yank scroll if user is reading
    const to = el.scrollHeight - el.clientHeight;
    let raf: number | null = null;
    const start = performance.now();
    const animate = (t: number) => {
      const p = Math.min(1, (t - start) / 600); // ~0.6s gentle scroll
      el.scrollTop = el.scrollTop + (to - el.scrollTop) * p;
      if (p < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [aiLog.length, inline, logContainerRef]);

  return (
    <GlassPanel 
      variant={inline ? 'card' : 'modal'} 
      className={inline ? 'relative w-full h-full overflow-hidden' : 'relative w-full max-h-[90vh] overflow-hidden'}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : 'bg-slate-400'}`}></div>
            <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100">Game AI Console</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${isRunning ? 'bg-green-400/20 text-green-600 dark:text-green-400' : 'bg-slate-400/20 text-slate-600 dark:text-slate-400'}`}>{isRunning ? 'RUNNING' : 'IDLE'}</span>
          </div>
          {!inline && onClose && (
            <GlassButton
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="w-8 h-8 p-0 flex items-center justify-center hover:bg-white/20"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </GlassButton>
          )}
        </div>
        
        {/* Try-on image preview */}
        {inline && showTryOnThumbs && tryOnImages.length > 0 && (
          <div className="mb-3">
            <div className="w-full aspect-video rounded-lg overflow-hidden bg-black/80 border border-white/10 flex items-center justify-center">
              {/* Show latest image */}
              <img src={tryOnImages[tryOnImages.length - 1]} alt="AI try-on" className="w-full h-full object-contain" />
            </div>
            <div className="mt-2 flex items-center gap-2 overflow-x-auto">
              {tryOnImages.map((u, i) => (
                <img key={u + i} src={u} className="w-16 h-16 object-cover rounded border border-white/10" alt="try-on thumb" />
              ))}
            </div>
          </div>
        )}

        <div ref={setLogContainerRef} className={`rounded-lg bg-black/95 dark:bg-black/70 backdrop-blur-sm p-4 font-mono text-sm border border-green-500/20 ${inline ? 'h-[52vh] md:h-[60vh] overflow-y-auto' : 'h-96 md:h-[60vh] overflow-auto'}`}>
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
                  <span className="text-green-300/60 text-[10px] md:text-xs mt-0.5 whitespace-nowrap">
                    [{new Date(e.timestamp).toLocaleTimeString()}]
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-block px-2 py-0.5 text-[10px] md:text-xs rounded font-semibold ${
                        e.type === 'thought' 
                          ? 'bg-blue-400/20 text-blue-300 border border-blue-400/30' 
                          : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                      }`}>
                        {e.type === 'thought' ? '🧠 ANALYZING' : '⚡ ACTION'}
                      </span>
                    </div>
                    <p className="text-green-100 text-xs md:text-sm break-words">{e.content}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {!inline && (
          <div className="pt-2">
            <GlassButton variant="primary" className="w-full" onClick={runAIPlayer} disabled={isRunning}>
              {isRunning ? 'AI Player is Running…' : 'Run AI Player'}
            </GlassButton>
          </div>
        )}
      </div>
    </GlassPanel>
  );
}


