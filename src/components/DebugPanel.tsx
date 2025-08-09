"use client";
import { useState, useEffect } from 'react';
import { useGameStore } from '@/lib/state/gameStore';
import { GlassPanel } from './GlassPanel';
import { GlassButton } from './GlassButton';

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
  const [activeTab, setActiveTab] = useState<'state' | 'env' | 'performance' | 'logs' | 'api'>('state');
  
  const gameStore = useGameStore();

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

  const refreshDebugInfo = () => {
    console.log('🔍 DEBUG PANEL: Refreshing debug information');
    
    const envInfo = {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Set (' + process.env.OPENAI_API_KEY.substring(0, 8) + '...)' : 'Not set',
      FASHN_AI_API_KEY: process.env.FASHN_AI_API_KEY ? 'Set (' + process.env.FASHN_AI_API_KEY.substring(0, 8) + '...)' : 'Not set',
      RAPIDAPI_KEY: process.env.RAPIDAPI_KEY ? 'Set (' + process.env.RAPIDAPI_KEY.substring(0, 8) + '...)' : 'Not set',
      RAPIDAPI_HOST: process.env.RAPIDAPI_HOST || 'Not set',
      NODE_ENV: process.env.NODE_ENV,
    };

    // Get performance entries
    const performanceEntries = performance.getEntries().slice(-20); // Last 20 entries

    // Get console logs if available (simplified)
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
      <GlassPanel className="max-h-[80vh] overflow-hidden">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">🔍 Debug Panel</h3>
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
          <div className="flex gap-1 p-1 bg-white/20 dark:bg-black/20 rounded-lg">
            {(['state', 'env', 'performance', 'logs'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  activeTab === tab 
                    ? 'bg-accent text-white' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
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
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">Game State</h4>
                <pre className="bg-black/20 p-2 rounded text-green-400 font-mono overflow-x-auto">
                  {JSON.stringify(debugInfo.gameState, null, 2)}
                </pre>
              </div>
            )}

            {activeTab === 'env' && debugInfo && (
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">Environment</h4>
                <div className="space-y-1">
                  {Object.entries(debugInfo.environment).map(([key, value]) => (
                    <div key={key} className="flex justify-between p-2 bg-white/10 rounded">
                      <span className="font-mono text-slate-600 dark:text-slate-400">{key}</span>
                      <span className={`font-mono ${value?.includes('Set') ? 'text-green-600' : 'text-red-600'}`}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'performance' && debugInfo && (
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">Performance</h4>
                <div className="space-y-1">
                  {debugInfo.performance.slice(-10).map((entry, i) => (
                    <div key={i} className="p-2 bg-white/10 rounded">
                      <div className="flex justify-between">
                        <span className="font-mono text-slate-600 dark:text-slate-400">{entry.name}</span>
                        <span className="font-mono text-accent">{entry.duration?.toFixed(2)}ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">Console Logs</h4>
                <div className="bg-black/20 p-2 rounded text-green-400 font-mono text-xs">
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
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-white/20 dark:border-white/10">
            Press Ctrl+Shift+D to toggle • Development only
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}