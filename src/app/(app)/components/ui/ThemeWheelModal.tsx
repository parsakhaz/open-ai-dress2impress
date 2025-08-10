"use client";
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useGameStore } from '@/lib/state/gameStore';

// Avoid SSR for the wheel lib (it references window)
const Wheel = dynamic(() => import('react-custom-roulette').then((m) => m.Wheel), { ssr: false });

interface ThemeWheelModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ThemeWheelModal({ open, onClose }: ThemeWheelModalProps) {
  const themeOptions = useGameStore((s) => s.themeOptions);
  const setThemeOptions = useGameStore((s) => s.setThemeOptions);
  const setTheme = useGameStore((s) => s.setTheme);
  const setPhase = useGameStore((s) => s.setPhase);
  const themeLoading = useGameStore((s) => s.themeLoading);
  const setThemeLoading = useGameStore((s) => s.setThemeLoading);

  const [spinning, setSpinning] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [resultTheme, setResultTheme] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (themeOptions.length === 15) return;
    let cancelled = false;
    const run = async () => {
      setThemeLoading(true);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch('/api/theme', { method: 'POST', body: JSON.stringify({}), headers: { 'Content-Type': 'application/json' }, signal: controller.signal });
        clearTimeout(timeout);
        const data = res.ok ? ((await res.json()) as { themes: string[] }) : { themes: [] };
        if (!cancelled) setThemeOptions((data.themes || []).slice(0, 15));
      } catch {
        if (!cancelled) setThemeOptions([]);
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
    // Placeholder shimmer slots while loading
    return Array.from({ length: 15 }, (_, i) => (themeLoading ? '...' : `Theme ${i + 1}`));
  }, [themeOptions, themeLoading]);

  const onSpin = () => {
    if (spinning || items.length !== 15) return;
    setSpinning(true);
    const target = Math.floor(Math.random() * 15);
    setSelectedIndex(target);

    // Spin animation: 4 full rotations + land on target slice
    // react-custom-roulette will animate and call onStopSpinning
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-6 md:p-8">
      <div className="absolute inset-0" onClick={() => (spinning ? null : onClose())} />
      <div className="relative w-full max-w-4xl mx-auto min-h-[80vh] flex flex-col">
        <div className="mb-4 md:mb-6 text-center space-y-2">
          <h2 className="text-3xl font-extrabold text-white">Spin for Today&apos;s Theme</h2>
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

        {/* Wheel - make surface opaque to avoid transparency artifacts */}
        <div className="mx-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 md:p-6 shadow-2xl overflow-visible select-none">
          <div
            className="relative mx-auto w-[min(92vw,36rem)] h-[min(92vw,36rem)] flex items-center justify-center cursor-pointer"
            onClick={() => {
              if (!spinning && !themeLoading && !items.includes('...')) onSpin();
            }}
            aria-label="Click to spin the theme wheel"
            role="button"
          >
          <Wheel
            mustStartSpinning={spinning}
            prizeNumber={selectedIndex ?? 0}
            data={items.map((text) => ({ option: text }))}
            outerBorderColor="#e5e7eb" // slate-200
            innerBorderColor="#cbd5e1" // slate-300
            radiusLineColor="#ffffff"
            radiusLineWidth={1}
            backgroundColors={["#ec4899","#8b5cf6","#6366f1","#f472b6"]}
            textColors={["#f8fafc"]}
            fontSize={16}
            onStopSpinning={() => {
              const idx = selectedIndex ?? 0;
              const theme = items[idx];
              setResultTheme(theme);
              setShowResult(true);
              setSpinning(false);
              setTheme(theme);
              // Briefly show result banner to draw attention before transitioning
              setTimeout(() => {
                setShowResult(false);
                setPhase('ShoppingSpree');
                onClose();
              }, 1400);
            }}
          />
          </div>
        </div>
        <div className="mt-4 text-center text-slate-500 dark:text-slate-300">
          {themeLoading ? 'Loading themes…' : spinning ? 'Spinning…' : 'Click the wheel to spin'}
        </div>
      </div>
    </div>
  );
}


