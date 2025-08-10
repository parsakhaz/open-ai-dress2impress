'use client';

import { useGameStore } from '@/lib/state/gameStore';
import { useState, useEffect } from 'react';
import { GlassPanel } from '@/components/GlassPanel';

export default function EvaluationBoard() {
  const phase = useGameStore((s) => s.phase);
  const theme = useGameStore((s) => s.theme);
  const currentImageUrl = useGameStore((s) => s.currentImageUrl);
  const runwayBaseImageUrl = useGameStore((s) => s.runwayBaseImageUrl);
  const aiPlayerResultUrl = useGameStore((s) => s.aiPlayerResultUrl);
  const setPhase = useGameStore((s) => s.setPhase);
  const character = useGameStore((s) => s.character);
  
  const [selectedWinner, setSelectedWinner] = useState<'player' | 'ai' | null>(null);

  // Use the player's final selected image (runway base or current)
  const playerFinalImage = runwayBaseImageUrl || currentImageUrl || character?.avatarUrl;
  
  const handleWinnerSelection = (winner: 'player' | 'ai') => {
    setSelectedWinner(winner);
  };

  const proceedToRunway = () => {
    // Move to the WalkoutAndEval phase
    setPhase('WalkoutAndEval');
  };

  // Automatically proceed to runway after a delay when both images are ready
  useEffect(() => {
    if (phase === 'Evaluation' && playerFinalImage && aiPlayerResultUrl) {
      // Auto-proceed after 8 seconds to give users time to view scores
      const timer = setTimeout(() => {
        proceedToRunway();
      }, 8000);
      
      return () => clearTimeout(timer);
    }
  }, [phase, playerFinalImage, aiPlayerResultUrl]);

  if (phase !== 'Evaluation') return null;

  // Show a loading state if either player doesn't have a final image
  if (!playerFinalImage || !aiPlayerResultUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
        <GlassPanel variant="card" className="max-w-md w-full text-center">
          <div className="w-8 h-8 mx-auto rounded-full border-2 border-primary/30 border-t-primary animate-spin mb-4" />
          <h2 className="text-xl font-bold mb-2">Preparing Evaluation...</h2>
          <p className="text-muted-foreground mb-4">
            {!playerFinalImage && "Waiting for your final look..."}
            {!aiPlayerResultUrl && "Waiting for ChatGPT to finish..."}
          </p>
          <button
            onClick={() => setPhase('Accessorize')}
            className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
          >
            ← Back to Accessories
          </button>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-auto">
      <div className="min-h-full flex flex-col items-center justify-center p-4 py-8">
        <div className="w-full max-w-6xl space-y-6">
          
          {/* Theme - minimal display */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Theme: <span className="font-semibold text-foreground">{theme}</span>
            </p>
          </div>

          {/* Comparison Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Player Card */}
            <GlassPanel variant="card" className="bg-yellow-50 border-yellow-200">
              <div className="text-center space-y-4">
                <div className="inline-block bg-yellow-200 px-4 py-2 rounded-full">
                  <h2 className="font-bold">You</h2>
                </div>
                
                <div className="aspect-[3/4] bg-white rounded-xl overflow-hidden shadow-sm mx-auto max-w-[200px] sm:max-w-[250px]">
                  {playerFinalImage ? (
                    <img 
                      src={playerFinalImage} 
                      alt="Your final look" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                      No final look selected
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="bg-yellow-200/50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Overall Score</p>
                    <p className="text-2xl font-bold">-.-</p>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>Theme:</span>
                      <span>-/10</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Outfit:</span>
                      <span>-/10</span>
                    </div>
                  </div>
                </div>
              </div>
            </GlassPanel>

            {/* AI Player Card */}
            <GlassPanel variant="card" className="bg-purple-50 border-purple-200">
              <div className="text-center space-y-4">
                <div className="inline-block bg-purple-200 px-4 py-2 rounded-full">
                  <h2 className="font-bold">ChatGPT</h2>
                </div>
                
                <div className="aspect-[3/4] bg-white rounded-xl overflow-hidden shadow-sm mx-auto max-w-[200px] sm:max-w-[250px]">
                  {aiPlayerResultUrl ? (
                    <img 
                      src={aiPlayerResultUrl} 
                      alt="ChatGPT's final look" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                      ChatGPT hasn't finished
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="bg-purple-200/50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Overall Score</p>
                    <p className="text-2xl font-bold">-.-</p>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>Theme:</span>
                      <span>-/10</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Outfit:</span>
                      <span>-/10</span>
                    </div>
                  </div>
                </div>
              </div>
            </GlassPanel>
          </div>

          {/* Winner Selection */}
          <GlassPanel variant="card" className="text-center">
            <h3 className="font-bold mb-4">Who styled better?</h3>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button
                onClick={() => handleWinnerSelection('player')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  selectedWinner === 'player' 
                    ? 'bg-yellow-400 text-black shadow-lg scale-105' 
                    : 'bg-yellow-200 text-black hover:bg-yellow-300'
                }`}
              >
                You Win!
              </button>
              <button
                onClick={() => handleWinnerSelection('ai')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  selectedWinner === 'ai' 
                    ? 'bg-purple-400 text-black shadow-lg scale-105' 
                    : 'bg-purple-200 text-black hover:bg-purple-300'
                }`}
              >
                ChatGPT Wins!
              </button>
            </div>
          </GlassPanel>

          {/* Auto-progression indicator */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Loading runway results...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
