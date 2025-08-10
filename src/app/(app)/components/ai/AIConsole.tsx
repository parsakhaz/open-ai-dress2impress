"use client";
import { useGameStore } from '@/lib/state/gameStore';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GlassPanel } from '@/components/GlassPanel';
import { GlassButton } from '@/components/GlassButton';
import type { AIStreamEvent } from '@/lib/ai-player/types';
import { useMemo } from 'react';
import type { AIEvent } from '@/types';

interface AIConsoleProps {
  onClose?: () => void;
  autoRunOnMount?: boolean;
  inline?: boolean; // if true, render as inline panel (no modal chrome/buttons)
  showTryOnThumbs?: boolean;
}

export default function AIConsole({ onClose, autoRunOnMount = false, inline = false, showTryOnThumbs = false }: AIConsoleProps = {}) {
  const aiLog = useGameStore((s) => s.aiLog);
  const logAIEvent = useGameStore((s) => s.logAIEvent);
  const phase = useGameStore((s) => s.phase);
  const [isRunning, setIsRunning] = useState(false);
  const seededRef = useRef(false);
  const startedRef = useRef(false);
  const [tryOnImages, setTryOnImages] = useState<string[]>([]);
  const [filters, setFilters] = useState<{ thought: boolean; action: boolean }>({ thought: true, action: true });
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact');
  const [autoScrollPinned, setAutoScrollPinned] = useState(false);
  const [activeActions, setActiveActions] = useState<Record<string, { label: string; tool?: string; phase?: string }>>({});
  
  type RowStatus = 'running' | 'ok' | 'error' | 'info';
  interface AggregatedRow {
    id: string;
    phase?: string;
    tool?: string;
    status: RowStatus;
    timestamp: number;
    query?: string;
    category?: string;
    count?: number;
    outfitId?: string;
    finalId?: string;
    reason?: string;
    images?: string[];
    plan?: { queries?: Array<{ category: string; query: string }>; outfits?: Array<{ id: string }>; palette?: string[] } | null;
  }
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
              // Capture AI player's try-on result during TRYON phase for Accessorize phase
              // Be permissive about tool naming; accept any TRYON tool result that includes images
              if (evt.phase === 'TRYON' && evt.eventType === 'tool:result' && Array.isArray((evt as any).context?.images)) {
                const tryOnImages = ((evt as any).context.images as string[]).filter(Boolean);
                if (tryOnImages.length > 0) {
                  const { setAiPlayerResultUrl } = useGameStore.getState();
                  setAiPlayerResultUrl(tryOnImages[0]);
                }
              }
              // Capture AI player's final result image for evaluation phase
              if (evt.phase === 'PICK' && evt.eventType === 'phase:result' && (evt as any).context?.tryOnImage) {
                const finalImage = (evt as any).context.tryOnImage as string;
                // Save to game store for evaluation phase
                const { setAiPlayerResultUrl } = useGameStore.getState();
                setAiPlayerResultUrl(finalImage);
              }
            }
            // Normalize rate-limit or 429s to a friendly line
            if (/RATE_LIMIT|429/.test(content)) {
              content = content.replace(/.*(RATE_LIMIT|429).*?/i, 'search: hit rate limit, slowing down');
            }
            // Emit richer UI event so the console can show thumbnails inline
            const ctx: any = (evt as any).context || {};
            const images = Array.isArray(ctx.images) ? (ctx.images as string[]) : undefined;
            const groupId = typeof (evt as any)?.context?.callId === 'string' ? String((evt as any).context.callId) : undefined;
            const errorDetail = typeof (evt as any)?.context?.originalError === 'string'
              ? String((evt as any).context.originalError)
              : typeof (evt as any)?.error?.message === 'string'
              ? String((evt as any).error.message)
              : undefined;
            const retryInMs = typeof (evt as any)?.context?.retryInMs === 'number' ? Number((evt as any).context.retryInMs) : undefined;
            const aiEvent: AIEvent = {
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
              runId: (evt as any).runId,
              groupId,
              // Friendly fields
              query: typeof ctx.query === 'string' ? ctx.query : undefined,
              category: typeof ctx.category === 'string' ? ctx.category : undefined,
              count: typeof ctx.count === 'number' ? ctx.count : undefined,
              finalId: typeof ctx.finalId === 'string' ? ctx.finalId : undefined,
              plan: ctx.plan || undefined,
            };
            logAIEvent(aiEvent);
            if (aiEvent.type === 'tool_call' && aiEvent.kind === 'start') {
              const gid = aiEvent.groupId || `${aiEvent.phase}-${aiEvent.tool}-${Date.now()}`;
              setActiveActions((prev) => ({ ...prev, [gid]: { label: aiEvent.content, tool: aiEvent.tool, phase: aiEvent.phase } }));
            } else if (aiEvent.type === 'tool_call' && (aiEvent.kind === 'result' || aiEvent.kind === 'error')) {
              const gid = aiEvent.groupId;
              if (gid) setActiveActions((prev) => { const { [gid]: _omit, ...rest } = prev; return rest; });
            }
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

  // autoscroll (sticky with pin)
  const [logContainerRef, setLogContainerRef] = useState<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    if (!inline || !logContainerRef || !autoScrollPinned) return;
    const el = logContainerRef;
    el.scrollTop = el.scrollHeight;
  }, [aiLog.length, inline, logContainerRef, autoScrollPinned, activeActions]);

  useEffect(() => {
    if (!inline || !logContainerRef || !autoScrollPinned) return;
    const onResize = () => {
      const el = logContainerRef;
      el.scrollTop = el.scrollHeight;
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [inline, logContainerRef, autoScrollPinned]);

  // Prepare filtered events (latest-first) and insert phase separators; cap length so older messages disappear
  const filteredEvents = useMemo(() => {
    const all = aiLog.filter((e) => (filters.thought && e.type === 'thought') || (filters.action && e.type === 'tool_call')) as any[];
    const MAX_VISIBLE = 60;
    return all.slice(-MAX_VISIBLE).reverse();
  }, [aiLog, filters]);

  // Aggregate start/result pairs into a single, human-friendly row
  const rows = useMemo<AggregatedRow[]>(() => {
    const map = new Map<string, AggregatedRow>();
    const out: AggregatedRow[] = [];
    // Process in chronological order to build rows, then reverse later
    const chronological = [...aiLog];
    for (const e of chronological) {
      const key = e.groupId ? `${e.groupId}-${e.tool || e.phase || ''}` : `row-${e.timestamp}-${e.tool || e.phase || e.content}`;
      let row = map.get(key);
      if (!row) {
        row = {
          id: key,
          phase: e.phase,
          tool: e.tool,
          status: e.kind === 'error' ? 'error' : e.kind === 'result' ? 'ok' : e.kind === 'start' ? 'running' : 'info',
          timestamp: e.timestamp || Date.now(),
          query: (e as any).query,
          category: (e as any).category,
          count: (e as any).count,
          finalId: (e as any).finalId,
          plan: (e as any).plan || null,
          images: e.images,
        };
        map.set(key, row);
        out.push(row);
      }
      // Update status/images/metadata on subsequent events
      if (e.kind === 'result') row.status = 'ok';
      if (e.kind === 'error') row.status = 'error';
      if (!row.images && e.images) row.images = e.images;
      if (!row.count && (e as any).count) row.count = (e as any).count as number;
      if (!row.query && (e as any).query) row.query = (e as any).query as string;
      if (!row.category && (e as any).category) row.category = (e as any).category as string;
      if ((e as any).finalId) row.finalId = (e as any).finalId as string;
      if ((e as any).plan) row.plan = (e as any).plan as any;
      // Prefer the latest timestamp for sorting
      row.timestamp = e.timestamp || row.timestamp;
    }
    // Keep last N rows and show newest first
    const MAX_ROWS = 60;
    return out.slice(-MAX_ROWS).reverse();
  }, [aiLog]);

  function formatRowTitle(r: AggregatedRow): string {
    if (r.tool === 'searchRapid') {
      const parts = [] as string[];
      if (typeof r.count === 'number') parts.push(`${r.count} results`);
      if (r.category) parts.push(r.category);
      if (r.query) parts.push(`“${r.query}”`);
      return parts.join(' • ');
    }
    if (r.tool === 'fashn.tryon') {
      return `Outfit ${r.outfitId || r.id.split('-')[0]} try‑on`;
    }
    if (r.phase === 'PLAN' && r.plan) {
      const ids = Array.isArray(r.plan?.outfits) ? r.plan!.outfits!.map((o: any) => o.id).join(', ') : '';
      return ids ? `Planned outfits ${ids}` : 'Plan ready';
    }
    if (r.phase === 'PICK' && r.finalId) {
      return `Picked ${r.finalId}`;
    }
    return r.tool || r.phase || 'Processing...';
  }

  function formatRowSubtitle(r: AggregatedRow): string | undefined {
    if (r.phase === 'PICK' && r.reason) return r.reason;
    return undefined;
  }

  function relativeTimeFrom(ts: number): string | null {
    if (!ts || !Number.isFinite(ts)) return null;
    const diff = Math.round((Date.now() - ts) / 1000);
    const abs = Math.abs(diff);
    let value = -diff; let unit: Intl.RelativeTimeFormatUnit = 'second';
    if (abs >= 3600) { value = -Math.round(diff / 3600); unit = 'hour'; }
    else if (abs >= 60) { value = -Math.round(diff / 60); unit = 'minute'; }
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
    return rtf.format(value as any, unit);
  }
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

  // Check if AI is done
  const isDone = useMemo(() => {
    return rows.some(r => r.phase === 'DONE');
  }, [rows]);

  return (
    <GlassPanel 
      variant={inline ? 'card' : 'modal'} 
      className={inline ? 'relative w-full h-full overflow-hidden' : 'relative w-full max-h-[90vh] overflow-hidden'}
    >
      <div className="flex flex-col h-full gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-foreground animate-pulse' : 'bg-foreground/40'}`}></div>
            <h2 className="text-lg md:text-xl font-bold text-foreground">Rival: ChatGPT</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${isRunning ? 'bg-foreground/10 text-foreground' : 'bg-foreground/10 text-foreground/70'}`}>{isRunning ? 'RUNNING' : 'IDLE'}</span>
          </div>
          {!inline && onClose && (
            <GlassButton
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="w-8 h-8 p-0 flex items-center justify-center hover:bg-foreground/10"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </GlassButton>
          )}
        </div>

        {/* Controls: filters + density (hidden during ShoppingSpree) */}
        {phase !== 'ShoppingSpree' && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-foreground/70">
            <div className="flex flex-wrap items-center gap-2">
              <label className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${filters.thought ? 'border-foreground/30 bg-foreground/10 text-foreground' : 'border-border text-foreground/70' }`}>
                <input type="checkbox" className="accent-[var(--color-foreground)]" checked={filters.thought} onChange={(e) => setFilters((f) => ({ ...f, thought: e.target.checked }))} />
                <Icon.Message className="w-3 h-3" aria-hidden /> Thought
              </label>
              <label className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${filters.action ? 'border-foreground/30 bg-foreground/10 text-foreground' : 'border-border text-foreground/70' }`}>
                <input type="checkbox" className="accent-[var(--color-foreground)]" checked={filters.action} onChange={(e) => setFilters((f) => ({ ...f, action: e.target.checked }))} />
                <Icon.Play className="w-3 h-3" aria-hidden /> Action
              </label>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-foreground/60">Density</span>
              <button onClick={() => setDensity('compact')} className={`px-2 py-0.5 rounded border ${density === 'compact' ? 'border-foreground/30 bg-foreground/10 text-foreground' : 'border-border text-foreground/70'}`}>Compact</button>
              <button onClick={() => setDensity('comfortable')} className={`px-2 py-0.5 rounded border ${density === 'comfortable' ? 'border-foreground/30 bg-foreground/10 text-foreground' : 'border-border text-foreground/70'}`}>Comfortable</button>
            </div>
          </div>
        )}
        
        {/* Try-on image preview */}
        {inline && showTryOnThumbs && tryOnImages.length > 0 && (
          <div className="mb-3">
            <div className="w-full aspect-video rounded-lg overflow-hidden bg-background border border-border flex items-center justify-center">
              {/* Show latest image */}
              <img src={tryOnImages[tryOnImages.length - 1]} alt="AI try-on" className="w-full h-full object-contain" />
            </div>
            <div className="mt-2 flex items-center gap-2 overflow-x-auto">
              {tryOnImages.map((u, i) => (
                <img key={u + i} src={u} className="w-16 h-16 object-cover rounded border border-border" alt="try-on thumb" />
              ))}
            </div>
          </div>
        )}

        <div ref={setLogContainerRef} className={`rounded-lg bg-background p-4 font-mono text-sm border border-border flex-1 min-h-0 overflow-y-auto`}>
          {aiLog.length === 0 ? (
            <div className="text-foreground/70 flex items-center gap-2">
              <Icon.Spinner className="w-4 h-4" />
              <span>Waiting for instructions…</span>
            </div>
          ) : (
            rows.map((r, i) => {
              const isThisDoneMessage = r.phase === 'DONE';
              const shouldBlur = isDone && !isThisDoneMessage;
              return (
              <div key={r.id} className={`mb-2 last:mb-0 transition-all duration-500 ${shouldBlur ? 'opacity-30 blur-[1px]' : ''} ${isThisDoneMessage ? 'bg-foreground/5 rounded-lg p-3 border border-foreground/20' : ''}`}>
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className={`flex items-center gap-2 ${density === 'compact' ? 'mb-1' : 'mb-2'}`}>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] md:text-xs rounded border text-foreground bg-foreground/10 border-border`}> 
                        {r.tool ? <Icon.Play className="w-3 h-3" /> : <Icon.Message className="w-3 h-3" />}
                        <span>{r.tool ? 'Action' : 'Thought'}</span>
                      </span>
                      {r.status === 'running' && <Icon.Spinner className="w-3 h-3 text-foreground/70" />}
                      {r.status === 'ok' && <span className="inline-flex items-center gap-1 text-[10px] text-foreground/70"><Icon.Check className="w-3 h-3" /> done</span>}
                      {r.status === 'error' && <ErrorBadge />}
                      {relativeTimeFrom(r.timestamp) && (
                        <span className="ml-auto text-foreground/40 text-[10px] whitespace-nowrap relative -top-[1px]">[{relativeTimeFrom(r.timestamp)}]</span>
                      )}
                    </div>
                    <div className={`text-foreground break-words overflow-wrap-anywhere ${density === 'compact' ? 'text-xs' : 'text-sm'} ${r.phase === 'DONE' ? 'font-semibold text-base' : ''}`}>
                      {r.phase === 'DONE' ? 'ChatGPT is done thinking.' : formatRowTitle(r)}
                      {formatRowSubtitle(r) ? <span className="text-foreground/70"> — {formatRowSubtitle(r)}</span> : null}
                      {r.plan?.queries && Array.isArray(r.plan.queries) && r.plan.queries.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {r.plan.queries.slice(0,3).map((q: any, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 text-[10px] rounded border border-border text-foreground/90">{q.category}: “{q.query}”</span>
                          ))}
                        </div>
                      )}
                    </div>
                    {Array.isArray(r.images) && r.images.length > 0 && (
                      <div className="mt-2 flex items-center gap-2 overflow-x-auto">
                        {r.images.slice(0, 6).map((u: string, idx: number) => (
                          <div key={`${i}-${idx}`} className="relative">
                            <img
                              src={u}
                              className="w-14 h-14 object-cover rounded border border-border"
                              alt="preview"
                              onLoad={() => {
                                if (autoScrollPinned && logContainerRef) {
                                  const el = logContainerRef; el.scrollTop = el.scrollHeight;
                                }
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )})
          )}
          {/* Sticky bottom controls: active actions tray + pin toggle */}
          <div className="sticky bottom-0 -mx-4 -mb-4 px-4 py-2 bg-background border-t border-border flex items-center gap-2">
            <button onClick={() => setAutoScrollPinned((v) => !v)} className={`text-xs px-2 py-0.5 rounded border ${autoScrollPinned ? 'border-foreground/40 text-foreground' : 'border-border text-foreground/70'}`}>{autoScrollPinned ? '📌 Auto-scroll on' : '📍 Auto-scroll off'}</button>
            <div className="ml-auto flex items-center gap-2 overflow-x-auto">
              {Object.keys(activeActions).length > 3 ? (
                <span className="text-[10px] text-foreground bg-foreground/10 border border-border px-2 py-0.5 rounded">{Object.keys(activeActions).length} actions running…</span>
              ) : (
                Object.entries(activeActions).map(([id, a]) => (
                  <span key={id} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-border bg-foreground/10 text-foreground whitespace-nowrap">
                    <Icon.Spinner className="w-3 h-3" /> {a.tool || 'action'}
                  </span>
                ))
              )}
            </div>
          </div>
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


