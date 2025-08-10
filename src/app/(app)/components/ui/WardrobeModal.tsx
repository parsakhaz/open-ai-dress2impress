"use client";
import { useEffect } from 'react';
import { useGameStore } from '@/lib/state/gameStore';
import { GlassPanel } from '@/components/GlassPanel';
import { GlassButton } from '@/components/GlassButton';

interface WardrobeModalProps {
  open: boolean;
  onClose: () => void;
  children?: React.ReactNode;
}

export default function WardrobeModal({ open, onClose, children }: WardrobeModalProps) {
  const phase = useGameStore((s) => s.phase);
  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);
  
  // Defensive close if phase changes to a disallowed state
  useEffect(() => {
    if (open && phase !== 'StylingRound') {
      onClose();
    }
  }, [open, phase, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay)]">
      <div 
        className="fixed inset-0"
        onClick={onClose}
      />
      <GlassPanel 
        variant="modal" 
        className="relative max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Wardrobe Collection</h2>
          <GlassButton size="sm" variant="ghost" onClick={onClose}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </GlassButton>
        </div>
        <div className="overflow-auto max-h-[calc(90vh-8rem)]">
          {children}
        </div>
      </GlassPanel>
    </div>
  );
}


