'use client';
import { useEffect, useState } from 'react';
import ReactConfetti from 'react-confetti';

interface ConfettiProps {
  trigger: boolean;
  duration?: number;
  colors?: string[];
}

export function Confetti({ trigger, duration = 3000, colors }: ConfettiProps) {
  const [show, setShow] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({ 
    width: 0, 
    height: 0 
  });

  useEffect(() => {
    // Set dimensions on mount
    setWindowDimensions({
      width: window.innerWidth,
      height: window.innerHeight
    });

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

  return (
    <ReactConfetti
      width={windowDimensions.width}
      height={windowDimensions.height}
      recycle={false}
      numberOfPieces={200}
      gravity={0.2}
      colors={colors || ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B']}
    />
  );
}
