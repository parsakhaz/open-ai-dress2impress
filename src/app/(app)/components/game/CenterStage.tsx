"use client";
import { useGameStore } from '@/lib/state/gameStore';

export default function CenterStage() {
  const currentImageUrl = useGameStore((s) => s.currentImageUrl);
  const phase = useGameStore((s) => s.phase);
  
  // Adjust avatar size and position for StylingRound to avoid toolbar overlap
  const avatarClasses = phase === 'StylingRound' 
    ? "max-h-[50vh] max-w-[50vw] object-contain rounded-2xl" 
    : "max-h-[50vh] max-w-[50vw] object-contain rounded-2xl";
  
  const containerClasses = phase === 'StylingRound'
    ? "absolute inset-0 w-full h-full flex items-center justify-center bg-background z-0 pt-24"
    : "absolute inset-0 w-full h-full flex items-center justify-center bg-background z-0";
  
  return (
    <div className={containerClasses}>
      {currentImageUrl ? (
        <img 
          src={currentImageUrl} 
          alt="Current styling" 
          className={avatarClasses} 
        />
      ) : (
        <div className="text-center space-y-4 z-10">
          <div className="w-20 h-20 mx-auto rounded-full bg-foreground/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-medium text-foreground">Center Stage</h3>
            <p className="text-foreground/70">Your styled look will appear here</p>
          </div>
        </div>
      )}
    </div>
  );
}


