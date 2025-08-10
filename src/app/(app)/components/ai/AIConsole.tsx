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
  const [filters, setFilters] = useState<{ thought: boolean; action: boolean }>({ thought: true, action: true });
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact');
  // Local inline error badge with optional countdown will manage its own state

  // Minimal inline lucide-style icons (no external deps)
  const Icon = {
    Spinner: (props: { className?: string }) => (
      <svg className={`animate-spin ${props.className || ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
    ),
    Check: (props: { className?: string }) => (
      <svg className={props.className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20 6L9 17l-5-5" />
      </svg>
    ),
    Alert: (props: { className?: string }) => (
      <svg className={props.className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    Message: (props: { className?: string }) => (
      <svg className={props.className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
      </svg>
    ),
    Play: (props: { className?: string }) => (
      <svg className={props.className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
    Search: (props: { className?: string }) => (
      <svg className={props.className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    Image: (props: { className?: string }) => (
      <svg className={props.className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <path d="M21 15l-5-5L5 21"></path>
      </svg>
    ),
  } as const;

  function ErrorBadge({ retryInMs, errorDetail }: { retryInMs?: number; errorDetail?: string }) {
    const [expanded, setExpanded] = useState(false);
    const [msLeft, setMsLeft] = useState<number | undefined>(retryInMs);
    useEffect(() => {
      if (typeof retryInMs !== 'number' || retryInMs <= 0) return;
      let mounted = true;
      const start = Date.now();
      const tick = () => {
        const elapsed = Date.now() - start;
        const left = Math.max(0, retryInMs - elapsed);
        if (mounted) setMsLeft(left);
        if (left > 0) raf = window.setTimeout(tick, 200);
      };
      let raf = window.setTimeout(tick, 200);
      return () => { mounted = false; window.clearTimeout(raf); };
    }, [retryInMs]);
    const seconds = msLeft !== undefined ? Math.ceil(msLeft / 1000) : undefined;
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-rose-400/90">
        <Icon.Alert className="w-3 h-3" />
        <button className="underline decoration-dotted underline-offset-2" onClick={() => setExpanded((v) => !v)}>
          error
        </button>
        {typeof seconds === 'number' && seconds > 0 && <span className="text-rose-300/80">· retrying in {seconds}s</span>}
        {expanded && errorDetail && (
          <span className="ml-2 px-2 py-1 rounded border border-rose-400/30 text-rose-200 bg-rose-400/10 max-w-[60ch] truncate">
            {errorDetail}
          </span>
        )}
      </span>
    );
  }

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
            // Minimal, narrative-style formatting
            const phaseLabel = evt.phase === 'INIT' ? 'setup' : evt.phase.toLowerCase();
            const isTool = evt.eventType.startsWith('tool');
            let content = isTool
              ? `${evt.tool?.name ?? 'tool'}: ${evt.message}`
              : `${phaseLabel}: ${evt.message}`;
            if (typeof evt.durationMs === 'number') content += ` · ${evt.durationMs}ms`;
            if (evt.context) {
              // Only surface a tiny hint of context keys to keep it clean
              const keys = Object.keys(evt.context);
              if (keys.length > 0) content += ` · {${keys.slice(0, 2).join(', ')}${keys.length > 2 ? ', …' : ''}}`;
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
            // Normalize rate-limit or 429s to a friendly line
            if (/RATE_LIMIT|429/.test(content)) {
              content = content.replace(/.*(RATE_LIMIT|429).*?/i, 'search: hit rate limit, slowing down');
            }
            // Emit richer UI event so the console can show thumbnails inline
            const images = Array.isArray((evt as any).context?.images) ? ((evt as any).context?.images as string[]) : undefined;
            const errorDetail = typeof (evt as any)?.context?.originalError === 'string'
              ? String((evt as any).context.originalError)
              : typeof (evt as any)?.error?.message === 'string'
              ? String((evt as any).error.message)
              : undefined;
            const retryInMs = typeof (evt as any)?.context?.retryInMs === 'number' ? Number((evt as any).context.retryInMs) : undefined;
            logAIEvent({ 
              type: isTool ? 'tool_call' : 'thought', 
              content, 
              timestamp: Date.now(), 
              tool: evt.tool?.name,
              kind: ((): any => {
                if (evt.eventType === 'tool:start') return 'start';
                if (evt.eventType === 'tool:result') return 'result';
                if (evt.eventType === 'tool:error') return 'error';
                if (evt.eventType === 'system') return 'system';
                return 'thought';
              })(),
              phase: evt.phase as any,
              images,
              retryInMs,
              errorDetail,
            });
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

  // Prepare filtered events and insert phase separators (UI only)
  const filteredEvents = useMemo(() => {
    return aiLog.filter((e) => (filters.thought && e.type === 'thought') || (filters.action && e.type === 'tool_call')) as any[];
  }, [aiLog, filters]);
  const withSeparators = useMemo(() => {
    const out: any[] = [];
    let lastPhase: string | undefined;
    filteredEvents.forEach((e, idx) => {
      const phase = (e as any).phase as string | undefined;
      if (phase && phase !== lastPhase) {
        out.push({ __sep: true, phase, key: `sep-${phase}-${idx}` });
        lastPhase = phase;
      }
      out.push(e);
    });
    return out;
  }, [filteredEvents]);

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

        {/* Controls: filters + density */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300/80">
          <div className="flex flex-wrap items-center gap-2">
            <label className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${filters.thought ? 'border-blue-400/30 bg-blue-400/10 text-blue-200' : 'border-white/10 text-slate-300/70' }`}>
              <input type="checkbox" className="accent-blue-400" checked={filters.thought} onChange={(e) => setFilters((f) => ({ ...f, thought: e.target.checked }))} />
              <Icon.Message className="w-3 h-3" aria-hidden /> Thought
            </label>
            <label className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${filters.action ? 'border-amber-400/30 bg-amber-400/10 text-amber-200' : 'border-white/10 text-slate-300/70' }`}>
              <input type="checkbox" className="accent-amber-400" checked={filters.action} onChange={(e) => setFilters((f) => ({ ...f, action: e.target.checked }))} />
              <Icon.Play className="w-3 h-3" aria-hidden /> Action
            </label>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-slate-400">Density</span>
            <button onClick={() => setDensity('compact')} className={`px-2 py-0.5 rounded border ${density === 'compact' ? 'border-white/20 bg-white/5 text-white' : 'border-white/10 text-slate-300'}`}>Compact</button>
            <button onClick={() => setDensity('comfortable')} className={`px-2 py-0.5 rounded border ${density === 'comfortable' ? 'border-white/20 bg-white/5 text-white' : 'border-white/10 text-slate-300'}`}>Comfortable</button>
          </div>
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
            <div className="text-green-400/70 flex items-center gap-2">
              <Icon.Spinner className="w-4 h-4" />
              <span>Waiting for instructions…</span>
            </div>
          ) : (
            withSeparators
              .map((e: any, i: number) => (
                '.__sep' in e ? (
                  <div key={e.key} className="my-2 border-t border-white/10">
                    <div className="-mt-3">
                      <span className="px-2 text-[10px] uppercase tracking-wide text-slate-400 bg-black/80">{(e.phase || '').toLowerCase()}</span>
                    </div>
                  </div>
                ) : (
              <div key={i} className="mb-2 last:mb-0">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className={`flex items-center gap-2 ${density === 'compact' ? 'mb-1' : 'mb-2'}`}>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] md:text-xs rounded border ${
                        e.type === 'thought' 
                          ? 'text-blue-300 border-blue-400/30 bg-blue-400/10' 
                          : 'text-amber-300 border-amber-400/30 bg-amber-400/10'
                      }`}>
                        {e.type === 'thought' ? <Icon.Message className="w-3 h-3" /> : <Icon.Play className="w-3 h-3" />}
                        <span>{e.type === 'thought' ? 'Analyzing…' : 'Action'}</span>
                      </span>
                      {e.kind === 'start' && <Icon.Spinner className="w-3 h-3 text-green-300/80" />}
                      {e.kind === 'result' && <span className="inline-flex items-center gap-1 text-[10px] text-green-300/80"><Icon.Check className="w-3 h-3" /> response received</span>}
                      {e.kind === 'error' && <ErrorBadge retryInMs={e.retryInMs} errorDetail={e.errorDetail} />}
                      <span className="ml-auto text-green-300/40 text-[10px] whitespace-nowrap relative -top-[1px]">[{new Date(e.timestamp).toLocaleTimeString()}]</span>
                    </div>
                    <p className={`text-green-100 break-words ${density === 'compact' ? 'text-xs' : 'text-sm'}`}>{e.content}</p>
                    {Array.isArray(e.images) && e.images.length > 0 && (
                      <div className="mt-2 flex items-center gap-2 overflow-x-auto">
                        {e.images.slice(0, 6).map((u: string, idx: number) => (
                          <div key={`${i}-${idx}`} className="relative">
                            <img src={u} className="w-14 h-14 object-cover rounded border border-white/10" alt="preview" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
                )
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


