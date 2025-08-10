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
  const aiStyledResultUrl = useGameStore((s) => s.aiStyledResultUrl);
  const evaluationResult = useGameStore((s) => s.evaluationResult);
  const setPhase = useGameStore((s) => s.setPhase);
  const setEvaluationResult = useGameStore((s) => s.setEvaluationResult);
  const character = useGameStore((s) => s.character);
  
  const [selectedWinner, setSelectedWinner] = useState<'player' | 'ai' | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [thinkingMessages, setThinkingMessages] = useState<string[]>([]);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  // Use the player's final selected image (runway base or current)
  const playerFinalImage = runwayBaseImageUrl || currentImageUrl || character?.avatarUrl;
  
  // Use AI's accessorized version if available, otherwise fall back to try-on result
  const aiFinalImage = aiStyledResultUrl || aiPlayerResultUrl;
  
  const handleWinnerSelection = (winner: 'player' | 'ai') => {
    setSelectedWinner(winner);
  };

  const proceedToRunway = () => {
    // Move to the WalkoutAndEval phase
    setPhase('WalkoutAndEval');
  };

  // Animated thinking messages
  useEffect(() => {
    if (isEvaluating) {
      const messages = [
        "ChatGPT is examining both outfits...",
        "Analyzing color harmony and theme alignment...",
        "Considering style choices and creativity...",
        "Evaluating overall aesthetic appeal...",
        "Weighing fashion sense against theme requirements...",
        "Making final style assessments...",
        "Almost ready with the verdict..."
      ];
      setThinkingMessages(messages);
      setCurrentMessageIndex(0);

      const interval = setInterval(() => {
        setCurrentMessageIndex(prev => (prev + 1) % messages.length);
      }, 2500);

      return () => clearInterval(interval);
    }
  }, [isEvaluating]);

  // Evaluate the images when both are ready
  useEffect(() => {
    const evaluateImages = async () => {
      if (phase === 'Evaluation' && playerFinalImage && aiFinalImage && !evaluationResult && !isEvaluating) {
        setIsEvaluating(true);
        setEvaluationError(null);
        
        try {
          const response = await fetch('/api/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerImageUrl: playerFinalImage,
              aiImageUrl: aiFinalImage,
              theme: theme,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to evaluate images');
          }

          const result = await response.json();
          setEvaluationResult(result);
        } catch (error) {
          console.error('Evaluation error:', error);
          setEvaluationError('Failed to evaluate outfits. Please try again.');
        } finally {
          setIsEvaluating(false);
        }
      }
    };

    evaluateImages();
  }, [phase, playerFinalImage, aiFinalImage, evaluationResult, isEvaluating, theme, setEvaluationResult]);

  // Removed automatic navigation - user must manually proceed to runway

  if (phase !== 'Evaluation') return null;

  // Show a loading state while evaluating or if images aren't ready
  if (!playerFinalImage || !aiFinalImage || isEvaluating || (!evaluationResult && !evaluationError)) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
        <GlassPanel variant="card" className="max-w-lg w-full text-center">
          {/* Animated spinner with pulse effect */}
          <div className="relative mb-6">
            <div className="w-16 h-16 mx-auto rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <div className="absolute inset-0 w-16 h-16 mx-auto rounded-full bg-primary/10 animate-pulse" />
          </div>
          
          <h2 className="text-2xl font-bold mb-4 animate-pulse">
            {isEvaluating ? "Fashion Face-off!" : "Preparing Evaluation..."}
          </h2>
          
          {/* Dynamic thinking messages */}
          <div className="min-h-[60px] flex items-center justify-center mb-6">
            <p className="text-lg text-muted-foreground transition-all duration-500 ease-in-out transform">
              {!playerFinalImage && "Waiting for your final look..."}
              {!aiFinalImage && "Waiting for ChatGPT to finish..."}
              {isEvaluating && thinkingMessages.length > 0 && (
                <span className="animate-fade-in font-medium">
                  {thinkingMessages[currentMessageIndex]}
                </span>
              )}
            </p>
          </div>

          {/* Floating dots animation */}
          {isEvaluating && (
            <div className="flex justify-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
          
          {!isEvaluating && (
            <button
              onClick={() => setPhase('Accessorize')}
              className="px-6 py-3 bg-muted hover:bg-muted/80 rounded-lg transition-all duration-200 hover:scale-105"
            >
              ← Back to Accessories
            </button>
          )}
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
                    <p className="text-2xl font-bold">
                      {evaluationResult ? evaluationResult.playerScore.toFixed(1) : '-.-'}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>Theme:</span>
                      <span>{evaluationResult ? `${evaluationResult.playerThemeScore}/10` : '-/10'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Outfit:</span>
                      <span>{evaluationResult ? `${evaluationResult.playerOutfitScore}/10` : '-/10'}</span>
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
                  {aiFinalImage ? (
                    <img 
                      src={aiFinalImage} 
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
                    <p className="text-2xl font-bold">
                      {evaluationResult ? evaluationResult.aiScore.toFixed(1) : '-.-'}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>Theme:</span>
                      <span>{evaluationResult ? `${evaluationResult.aiThemeScore}/10` : '-/10'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Outfit:</span>
                      <span>{evaluationResult ? `${evaluationResult.aiOutfitScore}/10` : '-/10'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </GlassPanel>
          </div>

          {/* Winner Display */}
          {evaluationResult && (
            <GlassPanel variant="card" className="text-center">
              <h3 className="font-bold mb-2">Winner</h3>
              <div className={`inline-block px-8 py-4 rounded-xl font-bold text-lg ${
                evaluationResult.winner === 'player' 
                  ? 'bg-yellow-400 text-black' 
                  : 'bg-purple-400 text-black'
              }`}>
                {evaluationResult.winner === 'player' ? '🏆 You Win!' : '🤖 ChatGPT Wins!'}
              </div>
              <p className="text-sm text-muted-foreground mt-3 max-w-2xl mx-auto">
                {evaluationResult.reasoning}
              </p>
            </GlassPanel>
          )}

          {/* Proceed to runway button */}
          {evaluationResult && (
            <div className="text-center">
              <button
                onClick={proceedToRunway}
                className="px-8 py-3 bg-foreground text-background rounded-lg font-semibold hover:opacity-90 transition-opacity"
              >
                Proceed to Runway Walk →
              </button>
              <p className="text-xs text-muted-foreground mt-2">
                Click to see your final runway walk
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
