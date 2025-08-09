"use client";
import { useGameStore } from '@/lib/state/gameStore';
import { GlassPanel } from '@/components/GlassPanel';

export default function CenterStage() {
  const currentImageUrl = useGameStore((s) => s.currentImageUrl);
  
  return (
    <GlassPanel 
      variant="card" 
      className="flex items-center justify-center min-h-[420px] relative overflow-hidden"
    >
      {currentImageUrl ? (
        <img 
          src={currentImageUrl} 
          alt="Current styling" 
          className="max-h-[520px] max-w-full object-contain rounded-xl shadow-lg" 
        />
      ) : (
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-accent/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Center Stage</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Your styled look will appear here</p>
          </div>
        </div>
      )}
    </GlassPanel>
  );
}


