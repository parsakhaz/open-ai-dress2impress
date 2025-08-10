'use client';

import { useGameStore } from '@/lib/state/gameStore';
import { useState } from 'react';

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

  if (phase !== 'Evaluation') return null;

  // Show a loading state if either player doesn't have a final image
  if (!playerFinalImage || !aiPlayerResultUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-yellow-50 via-purple-50 to-blue-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-full border-4 border-purple-600/30 border-t-purple-600 animate-spin mb-4" />
          <h2 className="text-2xl font-bold text-black mb-2">Preparing Evaluation...</h2>
          <p className="text-gray-700">
            {!playerFinalImage && "Waiting for your final look..."}
            {!aiPlayerResultUrl && "Waiting for ChatGPT to finish..."}
          </p>
          <button
            onClick={() => setPhase('Accessorize')}
            className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            ← Back to Accessories
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-yellow-50 via-purple-50 to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-2">
            FASHION<span className="text-purple-600">AI</span>
          </h1>
          <p className="text-xl text-gray-700">Compare your final looks!</p>
          <p className="text-lg text-gray-600 mt-2">Theme: <span className="font-semibold">{theme}</span></p>
        </div>

        {/* Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          
          {/* Player Card */}
          <div className="relative">
            <div className="bg-yellow-100 rounded-3xl p-6 text-center">
              <div className="inline-block bg-yellow-200 px-6 py-2 rounded-full mb-4">
                <h2 className="text-xl font-bold text-black">Player 1: You</h2>
              </div>
              
              <div className="aspect-[3/4] bg-white rounded-2xl overflow-hidden shadow-lg mb-6 mx-auto max-w-sm">
                {playerFinalImage ? (
                  <img 
                    src={playerFinalImage} 
                    alt="Your final look" 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    No final look selected
                  </div>
                )}
              </div>

              <div className="space-y-2 mb-4">
                <div className="bg-yellow-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-black">overall:</p>
                  <p className="text-3xl font-bold text-black">-.-</p>
                </div>
                <div className="text-xs text-gray-700 space-y-1">
                  <p><strong>Theme:</strong> -/10</p>
                  <p><strong>Outfit:</strong> -/10</p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Player Card */}
          <div className="relative">
            <div className="bg-purple-100 rounded-3xl p-6 text-center">
              <div className="inline-block bg-purple-200 px-6 py-2 rounded-full mb-4">
                <h2 className="text-xl font-bold text-black">Player 2: ChatGPT</h2>
              </div>
              
              <div className="aspect-[3/4] bg-white rounded-2xl overflow-hidden shadow-lg mb-6 mx-auto max-w-sm">
                {aiPlayerResultUrl ? (
                  <img 
                    src={aiPlayerResultUrl} 
                    alt="ChatGPT's final look" 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    ChatGPT hasn't finished
                  </div>
                )}
              </div>

              <div className="space-y-2 mb-4">
                <div className="bg-purple-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-black">overall:</p>
                  <p className="text-3xl font-bold text-black">-.-</p>
                </div>
                <div className="text-xs text-gray-700 space-y-1">
                  <p><strong>Theme:</strong> -/10</p>
                  <p><strong>Outfit:</strong> -/10</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Winner Selection (Optional Interactive Element) */}
        <div className="text-center mb-8">
          <h3 className="text-xl font-bold text-black mb-4">Who do you think styled better?</h3>
          <div className="flex justify-center gap-4">
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
        </div>

        {/* Continue Button */}
        <div className="text-center">
          <button
            onClick={proceedToRunway}
            className="bg-black text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-800 transition-colors shadow-lg"
          >
            🎬 See Runway Results
          </button>
        </div>
      </div>
    </div>
  );
}
