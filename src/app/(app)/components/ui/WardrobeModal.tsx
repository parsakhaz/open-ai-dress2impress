"use client";
import { useEffect } from 'react';

interface WardrobeModalProps {
  open: boolean;
  onClose: () => void;
  children?: React.ReactNode;
}

export default function WardrobeModal({ open, onClose, children }: WardrobeModalProps) {
  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded shadow-lg max-w-3xl w-full p-4">
        <div className="flex justify-end mb-2">
          <button className="px-2 py-1 text-sm border rounded" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="max-h-[70vh] overflow-auto">{children}</div>
      </div>
    </div>
  );
}


