"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '@/lib/state/gameStore';

interface ThemeDrawModalProps {
  open: boolean;
  onClose: () => void;
}

// Lightweight, dependency-free replacement for the roulette spinner.
// Shows a responsive grid of 15 tiles and performs a decelerating highlight
// animation to land on a randomly selected theme.
export default function ThemeDrawModal({ open, onClose }: ThemeDrawModalProps) {
  const themeOptions = useGameStore((s) => s.themeOptions);
  const setThemeOptions = useGameStore((s) => s.setThemeOptions);
  const setTheme = useGameStore((s) => s.setTheme);
  const setPhase = useGameStore((s) => s.setPhase);
  const themeLoading = useGameStore((s) => s.themeLoading);
  const setThemeLoading = useGameStore((s) => s.setThemeLoading);

  const [spinning, setSpinning] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [resultTheme, setResultTheme] = useState<string | null>(null);

  const timersRef = useRef<number[]>([]);
  const cleanupTimers = () => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  };

  useEffect(() => cleanupTimers, []);

  useEffect(() => {
    if (!open) return;
    if (themeOptions.length === 15) return;
    let cancelled = false;
    const run = async () => {
      setThemeLoading(true);
      try {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 6000);
        const res = await fetch('/api/theme', {
          method: 'POST',
          body: JSON.stringify({}),
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        });
        window.clearTimeout(timeout);
        const data = res.ok ? ((await res.json()) as { themes: string[] }) : { themes: [] };
        if (!cancelled) {
          const list = (data.themes || []).slice(0, 15);
          // Fallback if API returns empty
          if (list.length === 0) {
            const fallback = Array.from({ length: 15 }, (_, i) => `Theme ${i + 1}`);
            setThemeOptions(fallback);
          } else {
            setThemeOptions(list);
          }
        }
      } catch {
        if (!cancelled) {
          const fallback = Array.from({ length: 15 }, (_, i) => `Theme ${i + 1}`);
          setThemeOptions(fallback);
        }
      } finally {
        if (!cancelled) setThemeLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [open, setThemeLoading, setThemeOptions, themeOptions.length]);

  const items = useMemo(() => {
    if (themeOptions.length === 15) return themeOptions;
    return Array.from({ length: 15 }, (_, i) => (themeLoading ? '...' : `Theme ${i + 1}`));
  }, [themeOptions, themeLoading]);

  function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  const onDraw = () => {
    if (spinning) return;
    if (items.length !== 15) return;
    if (items.includes('...')) return;
    setShowResult(false);
    setResultTheme(null);
    setSelectedIndex(null);

    const target = Math.floor(Math.random() * 15);
    setSpinning(true);
    cleanupTimers();

    const n = 15;
    const baseCycles = 3; // full cycles before deceleration
    const totalSteps = baseCycles * n + target + 1; // +1 to land exactly

    // Generate an increasing delay schedule to simulate deceleration
    const startDelay = 50; // ms between steps at start
    const endDelay = 220; // ms between steps at end
    let accumulated = 0;
    for (let i = 0; i < totalSteps; i++) {
      const progress = i / (totalSteps - 1);
      const delay = startDelay + (endDelay - startDelay) * easeOutCubic(progress);
      accumulated += delay;
      const t = window.setTimeout(() => {
        setHighlightIndex((prev) => ((prev + 1) % n + n) % n);
        if (i === totalSteps - 1) {
          const idx = ((highlightIndex + 1) % n + n) % n; // next position
          const theme = items[idx];
          setSelectedIndex(idx);
          setResultTheme(theme);
          setSpinning(false);
          setTheme(theme);
          setShowResult(true);
          try {
            window.dispatchEvent(new CustomEvent('GLOBAL_CONFETTI', { detail: { side: 'both', pieces: 180 } }));
          } catch {
            // no-op
          }
          window.setTimeout(() => {
            setShowResult(false);
            setPhase('ShoppingSpree');
            onClose();
          }, 1200);
        }
      }, accumulated);
      timersRef.current.push(t);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-6 md:p-8">
      <div className="absolute inset-0" onClick={() => (spinning ? null : onClose())} />
      <div className="relative w-full max-w-4xl mx-auto min-h-[80vh] flex flex-col">
        <div className="mb-4 md:mb-6 text-center space-y-2">
          <h2 className="text-3xl font-extrabold text-white">Draw Today&apos;s Theme</h2>
          <p className="text-slate-300 text-sm">Randomly pick one of 15 game categories</p>
          {showResult && resultTheme && (
            <div
              className="mx-auto w-fit mt-2 px-4 py-2 rounded-full bg-pink-600/30 border border-pink-400/40 text-white font-semibold shadow-[0_0_0_0_rgba(236,72,153,0.6)] animate-[pulseRing_1.2s_ease-out_1] transition-transform duration-500 scale-110"
              aria-live="polite"
            >
              {resultTheme}
            </div>
          )}
        </div>

        <div className="mx-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-2xl overflow-visible select-none">
          <div
            className="relative mx-auto w-[min(92vw,48rem)] max-w-full"
            aria-label="Click to draw a theme"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onDraw();
            }}
            onClick={() => onDraw()}
          >
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-4 place-items-center">
              {items.map((text, i) => {
                const isHighlighted = i === highlightIndex || i === selectedIndex;
                return (
                  <div
                    key={i}
                    className={`relative w-[min(26vw,7.6rem)] h-[min(26vw,7.6rem)] sm:w-[min(18vw,8.4rem)] sm:h-[min(18vw,8.4rem)] rounded-xl flex items-center justify-center text-center px-2
                      bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900
                      border ${isHighlighted ? 'border-accent ring-4 ring-accent/40' : 'border-slate-200 dark:border-slate-700'}
                      text-slate-800 dark:text-slate-100 shadow-lg transition-all duration-150
                      ${isHighlighted ? 'scale-105' : 'hover:scale-[1.02]'}
                    `}
                  >
                    <span className="text-xs sm:text-sm font-medium line-clamp-2">
                      {text}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 text-center text-slate-500 dark:text-slate-300">
              {themeLoading ? 'Loading themes…' : spinning ? 'Drawing…' : 'Tap anywhere to draw'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


