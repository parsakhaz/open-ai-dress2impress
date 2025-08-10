"use client";
import { useMemo, useState, useEffect } from 'react';
import { useGameStore } from '@/lib/state/gameStore';
import { GlassPanel } from './GlassPanel';
import { GlassButton } from './GlassButton';
import { GAME_PHASES, isTimedPhase, defaultTimeForPhase } from '@/lib/constants/gamePhases';
import type { GamePhase } from '@/types';
import { useDebugStore } from '@/lib/state/debugStore';
import { useToast } from '@/hooks/useToast';

interface DebugInfo {
  environment: Record<string, string | undefined>;
  gameState: any;
  performance: PerformanceEntry[];
  errors: any[];
  apiCalls: any[];
}

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'state' | 'env' | 'performance' | 'logs' | 'flow'>('state');
  const [selectedPhase, setSelectedPhase] = useState<GamePhase>('CharacterSelect');
  const [resetTimerOnJump, setResetTimerOnJump] = useState(true);
  const [seedPrereqsOnJump, setSeedPrereqsOnJump] = useState(false);
  
  const gameStore = useGameStore();
  const currentPhase = useGameStore((s) => s.phase);
  const setPhase = useGameStore((s) => s.setPhase);
  const setTimer = useGameStore((s) => s.setTimer);
  const setTheme = useGameStore((s) => s.setTheme);
  const setThemeOptions = useGameStore((s) => s.setThemeOptions);
  const setCharacter = useGameStore((s) => s.setCharacter);
  const setCurrentImage = useGameStore((s) => s.setCurrentImage);
  const setAccessorizeUsed = useGameStore((s) => s.setAccessorizeUsed);
  const setRunwayBaseImageUrl = useGameStore((s) => s.setRunwayBaseImageUrl);
  const muteToasts = useDebugStore((s) => s.muteToasts);
  const setMuteToasts = useDebugStore((s) => s.setMuteToasts);
  const disableAutoTimers = useDebugStore((s) => s.disableAutoTimers);
  const setDisableAutoTimers = useDebugStore((s) => s.setDisableAutoTimers);
  const disableAutoRunway = useDebugStore((s) => s.disableAutoRunway);
  const setDisableAutoRunway = useDebugStore((s) => s.setDisableAutoRunway);
  const { showToast } = useToast();

  // Only show in development
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle with Ctrl+Shift+D
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setIsOpen(!isOpen);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const refreshDebugInfo = async () => {
    console.log('🔍 DEBUG PANEL: Refreshing debug information');
    let envInfo: Record<string, string | undefined> = { NODE_ENV: process.env.NODE_ENV };
    try {
      const res = await fetch('/api/debug/env');
      if (res.ok) {
        const data = await res.json();
        const f = data?.flags || {};
        envInfo = {
          OPENAI_API_KEY: f.OPENAI_API_KEY ? 'Set' : 'Not set',
          FASHN_AI_API_KEY: f.FASHN_AI_API_KEY ? 'Set' : 'Not set',
          RAPIDAPI_KEY: f.RAPIDAPI_KEY ? 'Set' : 'Not set',
          RAPIDAPI_HOST: f.RAPIDAPI_HOST ? 'Set' : 'Not set',
          KLING_ACCESS_KEY: f.KLING_ACCESS_KEY ? 'Set' : 'Not set',
          KLING_SECRET_KEY: f.KLING_SECRET_KEY ? 'Set' : 'Not set',
          NODE_ENV: process.env.NODE_ENV,
        } as const;
      }
    } catch {}

    const performanceEntries = performance.getEntries().slice(-20);
    const recentErrors: any[] = [];
    const apiCalls: any[] = [];

    setDebugInfo({
      environment: envInfo,
      gameState: { ...gameStore },
      performance: performanceEntries,
      errors: recentErrors,
      apiCalls: apiCalls,
    });
  };

  useEffect(() => {
    setSelectedPhase(currentPhase as GamePhase);
  }, [currentPhase]);

  const readinessWarning = useMemo(() => {
    const gs: any = gameStore as any;
    switch (selectedPhase) {
      case 'ThemeSelect':
        if (!gs.character) return 'No character selected; theme selection may be blocked.';
        return null;
      case 'ShoppingSpree':
        if (!gs.theme) return 'No theme set; consider seeding a theme before shopping.';
        return null;
      case 'StylingRound':
        if (!gs.currentImageUrl) return 'No base image; styling may have nothing to display.';
        return null;
      case 'Accessorize':
        return null;
      case 'WalkoutAndEval':
      case 'Results':
        if (!gs.runwayUrl) return 'No runway video/url yet; results/eval may appear empty.';
        return null;
      default:
        return null;
    }
  }, [selectedPhase, gameStore]);

  const jumpToPhase = (phase: GamePhase) => {
    if (resetTimerOnJump && isTimedPhase(phase)) {
      try { setTimer(defaultTimeForPhase(phase)); } catch {}
    }
    if (seedPrereqsOnJump) {
      const gs: any = gameStore as any;
      if (phase === 'ThemeSelect') {
        if (!gs.character) {
          setCharacter({ id: 'debug', avatarUrl: gs.currentImageUrl || 'https://via.placeholder.com/512x768?text=Avatar' });
        }
      } else if (phase === 'ShoppingSpree') {
        if (!gs.theme) {
          setTheme('Streetwear Staples');
          setThemeOptions(['Streetwear Staples', 'Summer Rooftop Party', 'Cozy Minimalist']);
        }
      } else if (phase === 'StylingRound') {
        if (!gs.currentImageUrl) {
          const url = gs.character?.avatarUrl || 'https://via.placeholder.com/512x768?text=Base+Image';
          setCurrentImage(url);
        }
      } else if (phase === 'Accessorize') {
        setAccessorizeUsed(false);
        setRunwayBaseImageUrl(null);
      }
    }
    setPhase(phase);
    if (!muteToasts && isTimedPhase(phase) && resetTimerOnJump) {
      const t = defaultTimeForPhase(phase);
      showToast(`Jumped to ${phase} — timer set to ${t === 120 ? '2:00' : '1:30'}.`, 'info', 2000);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshDebugInfo();
    }
  }, [isOpen, gameStore]);

  if (process.env.NODE_ENV !== 'development' || !isOpen) {
    return null;
  }

  const runEnvironmentTest = async () => {
    console.log('🧪 DEBUG PANEL: Running environment tests');
    
    const tests = [
      {
        name: 'Webcam Access',
        test: async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            return { success: true, message: 'Webcam accessible' };
          } catch (e) {
            return { success: false, message: `Webcam error: ${e}` };
          }
        }
      },
      {
        name: 'Avatar API',
        test: async () => {
          try {
            const response = await fetch('/api/avatar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageDataUrl: 'test' }),
            });
            return { success: response.status !== 500, message: `Status: ${response.status}` };
          } catch (e) {
            return { success: false, message: `API error: ${e}` };
          }
        }
      },
      {
        name: 'Amazon API',
        test: async () => {
          try {
            const response = await fetch('/api/amazon', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: 'test' }),
            });
            return { success: response.status !== 500, message: `Status: ${response.status}` };
          } catch (e) {
            return { success: false, message: `API error: ${e}` };
          }
        }
      }
    ];

    for (const test of tests) {
      console.log(`🧪 Testing ${test.name}...`);
      const result = await test.test();
      console.log(`${result.success ? '✅' : '❌'} ${test.name}: ${result.message}`);
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] max-w-md">
      <GlassPanel className="max-h-[80vh] overflow-visible">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground">🔍 Debug Panel</h3>
            <div className="flex gap-2">
              <GlassButton size="sm" onClick={refreshDebugInfo}>
                🔄 Refresh
              </GlassButton>
              <GlassButton size="sm" onClick={runEnvironmentTest}>
                🧪 Test
              </GlassButton>
              <GlassButton size="sm" variant="ghost" onClick={() => setIsOpen(false)}>
                ✕
              </GlassButton>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-background border border-border rounded-lg relative z-[9999]">
            {(['state', 'env', 'performance', 'logs', 'flow'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 text-xs rounded transition-colors relative z-[9999] ${
                  activeTab === tab 
                    ? 'bg-foreground text-background' 
                    : 'text-foreground/60 hover:text-foreground'
                }`}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="max-h-[50vh] overflow-y-auto text-xs">
            {activeTab === 'state' && debugInfo && (
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">Game State</h4>
                <pre className="bg-background p-2 rounded text-foreground font-mono overflow-x-auto border border-border">
                  {JSON.stringify(debugInfo.gameState, null, 2)}
                </pre>
              </div>
            )}

            {activeTab === 'env' && debugInfo && (
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">Environment</h4>
                <div className="space-y-1">
                  {Object.entries(debugInfo.environment).map(([key, value]) => (
                    <div key={key} className="flex justify-between p-2 bg-background border border-border rounded">
                      <span className="font-mono text-foreground/70">{key}</span>
                      <span className={`font-mono ${value?.includes('Set') ? 'text-foreground' : 'text-foreground/70'}`}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'performance' && debugInfo && (
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">Performance</h4>
                <div className="space-y-1">
                  {debugInfo.performance.slice(-10).map((entry, i) => (
                    <div key={i} className="p-2 bg-background border border-border rounded">
                      <div className="flex justify-between">
                        <span className="font-mono text-foreground/70">{entry.name}</span>
                        <span className="font-mono text-foreground">{entry.duration?.toFixed(2)}ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">Console Logs</h4>
                <div className="bg-background p-2 rounded text-foreground font-mono text-xs border border-border">
                  <p>Check browser DevTools console for detailed logs</p>
                  <p>All app logs are prefixed with emojis for easy filtering</p>
                  <div className="mt-2 space-y-1 text-xs">
                    <p>🎯 = Phase transitions</p>
                    <p>👤 = Avatar operations</p>
                    <p>🛍️ = Shopping operations</p>
                    <p>🌐 = API calls</p>
                    <p>💥 = Errors</p>
                    <p>✅ = Success</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'flow' && (
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground">Flow Control</h4>
                <div className="flex items-center gap-2">
                  <span className="text-foreground/70">Current:</span>
                  <span className="font-mono">{currentPhase}</span>
                </div>
                <div className="space-y-2">
                  <div className="text-foreground/70">Jump to</div>
                  <div className="flex flex-wrap gap-2">
                    {GAME_PHASES.map((p) => (
                      <GlassButton
                        key={p}
                        size="sm"
                        variant={p === currentPhase ? 'primary' : 'secondary'}
                        onClick={() => { setSelectedPhase(p); jumpToPhase(p); }}
                        title={p}
                      >
                        {p}
                      </GlassButton>
                    ))}
                  </div>
                </div>
                {readinessWarning && (
                  <div className="text-foreground/70 text-xs">⚠️ {readinessWarning}</div>
                )}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={resetTimerOnJump} onChange={(e) => setResetTimerOnJump(e.target.checked)} />
                    Reset timer on jump
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={seedPrereqsOnJump} onChange={(e) => setSeedPrereqsOnJump(e.target.checked)} />
                    Seed prerequisites
                  </label>
                  <GlassButton size="sm" onClick={() => {
                    const idx = GAME_PHASES.indexOf(currentPhase as GamePhase);
                    const next = GAME_PHASES[(idx + 1) % GAME_PHASES.length];
                    jumpToPhase(next);
                    setSelectedPhase(next);
                  }}>Next ▶</GlassButton>
                  <GlassButton size="sm" onClick={() => {
                    const idx = GAME_PHASES.indexOf(currentPhase as GamePhase);
                    const prev = GAME_PHASES[(idx - 1 + GAME_PHASES.length) % GAME_PHASES.length];
                    jumpToPhase(prev);
                    setSelectedPhase(prev);
                  }}>◀ Prev</GlassButton>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={disableAutoTimers} onChange={(e) => setDisableAutoTimers(e.target.checked)} />
                    Disable auto-timers
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={disableAutoRunway} onChange={(e) => setDisableAutoRunway(e.target.checked)} />
                    Disable auto-runway
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={muteToasts} onChange={(e) => setMuteToasts(e.target.checked)} />
                    Mute toasts
                  </label>
                </div>
                <div className="text-xs text-foreground/60">
                  Tip: Ctrl+Shift+D to toggle this panel.
                </div>
              </div>
            )}
          </div>

          <div className="text-xs text-foreground/60 pt-2 border-t border-border">
            Press Ctrl+Shift+D to toggle • Development only
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}