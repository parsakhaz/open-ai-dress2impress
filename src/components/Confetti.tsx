'use client';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import ReactConfetti from 'react-confetti';

interface ConfettiProps {
  trigger: boolean;
  duration?: number;
  colors?: string[];
  source?: { x: number; y: number; w: number; h: number };
  pieces?: number;
}

export function Confetti({ trigger, duration = 3000, colors, source, pieces }: ConfettiProps) {
  const [show, setShow] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({ 
    width: 0, 
    height: 0 
  });
  const [mounted, setMounted] = useState(false);
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    // Set dimensions on mount
    setWindowDimensions({
      width: window.innerWidth,
      height: window.innerHeight
    });
    setMounted(true);

    // Update dimensions on resize
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (trigger) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), duration);
      return () => clearTimeout(timer);
    }
  }, [trigger, duration]);

  if (!show || windowDimensions.width === 0) return null;

  const confetti = (
    <div className="fixed inset-0 z-[1000] pointer-events-none">
      <ReactConfetti
        width={windowDimensions.width}
        height={windowDimensions.height}
        recycle={false}
        numberOfPieces={pieces ?? (prefersReducedMotion ? 60 : 200)}
        gravity={prefersReducedMotion ? 0.15 : 0.2}
        colors={colors || ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B']}
        confettiSource={source}
      />
    </div>
  );

  // Use portal to ensure it's above all app content and modals
  return mounted ? createPortal(confetti, document.body) : null;
}
