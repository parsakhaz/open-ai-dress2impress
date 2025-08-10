'use client';
import { useGameStore } from '@/lib/state/gameStore';
import { GlassPanel } from '@/components/GlassPanel';
import { Tooltip } from '@/components/Tooltip';

export default function HistoryStrip() {
  const history = useGameStore((s) => s.history);
  const phase = useGameStore((s) => s.phase);
  const currentImageUrl = useGameStore((s) => s.currentImageUrl);
  const setCurrentImage = useGameStore((s) => s.setCurrentImage);

  // Only show during styling / accessorize and when there is meaningful history
  if (!(phase === 'StylingRound' || phase === 'Accessorize')) return null;
  if (history.length < 2) {
    return null; // Don't show if no history
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'avatar':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'tryOn':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        );
      case 'edit':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getTypeColor = (type: string) => {
    // Monochrome accents by type using opacity only
    switch (type) {
      case 'avatar':
        return 'border-foreground/40 bg-foreground/10';
      case 'tryOn':
        return 'border-foreground/40 bg-foreground/10';
      case 'edit':
        return 'border-foreground/40 bg-foreground/10';
      default:
        return 'border-border bg-foreground/5';
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-10 hidden sm:block">
      <GlassPanel className="p-2">
        <div className="flex items-center gap-2 overflow-x-auto max-w-[80vw]">
          {/* Current indicator */}
          <div className="flex-shrink-0 text-xs text-foreground/60 px-2">
            History:
          </div>
          
          {/* History items */}
          {history.slice().reverse().map((item) => (
            <Tooltip 
              key={item.id} 
              content={`${item.description} (${new Date(item.timestamp).toLocaleTimeString()})`}
              position="top"
            >
              <button
                className={`
                  flex-shrink-0 w-12 h-12 rounded-lg border-2 transition-all duration-200 hover:scale-110 group
                  ${item.imageUrl === currentImageUrl 
                    ? 'border-foreground scale-105 shadow-lg' 
                    : `${getTypeColor(item.type)} hover:border-foreground/70`
                  }
                `}
                onClick={() => setCurrentImage(item.imageUrl)}
              >
                <div className="relative w-full h-full rounded-md overflow-hidden">
                  {/* Background image */}
                  <img 
                    src={item.imageUrl} 
                    alt={item.description}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Type indicator */}
                  <div className="absolute top-1 right-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-background text-xs ${getTypeColor(item.type)}`}>
                      {getTypeIcon(item.type)}
                    </div>
                  </div>
                  
                  {/* Current indicator */}
                  {item.imageUrl === currentImageUrl && (
                    <div className="absolute inset-0 bg-foreground/10 flex items-center justify-center">
                      <div className="w-3 h-3 bg-foreground rounded-full animate-pulse" />
                    </div>
                  )}
                </div>
              </button>
            </Tooltip>
          ))}
          
          {/* Empty slots for visual balance */}
          {Array.from({ length: Math.max(0, 5 - history.length) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex-shrink-0 w-12 h-12 rounded-lg bg-foreground/5 border border-border flex items-center justify-center"
            >
              <svg className="w-4 h-4 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}


