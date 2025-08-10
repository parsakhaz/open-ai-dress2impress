'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/lib/state/gameStore';
import { useToast } from '@/hooks/useToast';
import UserAccessorizePane from '@/app/(app)/components/accessorize/UserAccessorizePane';

export default function AccessorizeBoard() {
  const phase = useGameStore((s) => s.phase);
  const theme = useGameStore((s) => s.theme);
  const character = useGameStore((s) => s.character);
  const currentImageUrl = useGameStore((s) => s.currentImageUrl);
  const runwayBaseImageUrl = useGameStore((s) => s.runwayBaseImageUrl);
  const aiPlayerResultUrl = useGameStore((s) => s.aiPlayerResultUrl);
  const aiStyledResultUrl = useGameStore((s) => s.aiStyledResultUrl);
  const setAiStyledResultUrl = useGameStore((s) => (s as any).setAiStyledResultUrl);
  const { showToast } = useToast();

  // Right-pane minimal orchestration state
  const [status, setStatus] = useState<'idle'|'waitingBase'|'prompting'|'editing'|'done'|'error'>('idle');
  const [instruction, setInstruction] = useState<string | null>(null);
  const startedRef = useRef(false);

  if (phase !== 'Accessorize') return null;

  const playerImage = runwayBaseImageUrl || currentImageUrl || character?.avatarUrl || '';

  // Fire once when prerequisites are ready
  useEffect(() => {
    if (phase !== 'Accessorize') return;
    if (startedRef.current) return;
    if (!aiPlayerResultUrl) { setStatus('waitingBase'); return; }
    if (aiStyledResultUrl) { setStatus('done'); return; }

    startedRef.current = true;
    (async () => {
      try {
        setStatus('prompting');
        const res = await fetch('/api/ai-style/instruction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ theme, baseImageUrl: aiPlayerResultUrl }),
        });
        const data = await res.json();
        const instr = String(data?.instruction || '').trim();
        setInstruction(instr);
        if (!instr) throw new Error('No instruction');

        setStatus('editing');
        const res2 = await fetch('/api/edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ baseImageUrl: aiPlayerResultUrl, instruction: instr }),
        });
        const data2 = await res2.json();
        const first = Array.isArray(data2?.images) ? data2.images[0] : null;
        if (!first) throw new Error('No images');
        setAiStyledResultUrl(first);
        setStatus('done');
      } catch (e) {
        setStatus('error');
        showToast('Auto-style failed. You can continue manually.', 'error', 2200);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, aiPlayerResultUrl]);

  return (
    <div className="absolute inset-0 z-20 bg-background/95 backdrop-blur-sm pt-36 md:pt-40">
      <div className="h-full w-full min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 md:p-6 max-w-7xl mx-auto">
        {/* Left: Player (You) inline editor */}
        <UserAccessorizePane />

        {/* Right: GPT placeholder */}
        <div className="pointer-events-none h-full min-h-0 flex flex-col">
          <div className="h-full max-h-[85vh] rounded-3xl bg-white/80 dark:bg-white/10 backdrop-blur-md border border-foreground/10 shadow-xl overflow-hidden relative">
            <div className="relative z-20 p-4 flex-shrink-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-foreground/10 text-foreground text-sm font-semibold w-max">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                Player 2: ChatGPT
              </div>
            </div>
            <div className="absolute inset-0 z-0">
              {/* If an image exists, show it blurred; otherwise a neutral gradient */}
              {aiStyledResultUrl || aiPlayerResultUrl ? (
                <img 
                  src={aiStyledResultUrl || aiPlayerResultUrl || ''} 
                  alt="ChatGPT look (pending)" 
                  className="w-full h-full object-cover blur-xl opacity-40" 
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-200/30 via-indigo-200/20 to-fuchsia-200/30" />
              )}
            </div>
            <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
              <div className="text-center">
                <div className={`w-12 h-12 mx-auto rounded-full border-4 border-foreground/20 ${status==='done' ? 'border-green-500' : 'border-t-foreground animate-spin'}`} />
                <div className="mt-3 text-foreground font-semibold">
                  {status === 'waitingBase' && 'waiting for ChatGPT try‑on…'}
                  {status === 'prompting' && 'constructing query…'}
                  {status === 'editing' && 'generating images…'}
                  {status === 'done' && 'ready'}
                  {status === 'error' && 'auto-style failed'}
                </div>
                {instruction && (
                  <div className="mt-2 text-xs text-foreground/80 font-mono px-3">
                    query: "{instruction}"
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
