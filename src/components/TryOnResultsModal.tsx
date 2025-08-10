'use client';
import { useState } from 'react';
import { GlassPanel } from '@/components/GlassPanel';
import { GlassButton } from '@/components/GlassButton';

interface TryOnResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: string[];
  onSelect: (imageUrl: string) => void;
}

export function TryOnResultsModal({ isOpen, onClose, results, onSelect }: TryOnResultsModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showFullscreenPreview, setShowFullscreenPreview] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  if (!isOpen || results.length === 0) return null;

  const handleSelect = () => {
    onSelect(results[selectedIndex]);
    onClose();
  };

  const openPreview = (index: number) => {
    setPreviewIndex(index);
    setShowFullscreenPreview(true);
  };

  return (
    <>
      {/* Main grid view */}
      {!showFullscreenPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg">
          <div 
            className="fixed inset-0"
            onClick={onClose}
          />
          <GlassPanel 
            variant="modal" 
            className="relative max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden"
          >
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Try-On Results</h2>
                <GlassButton
                  size="sm"
                  variant="ghost"
                  onClick={onClose}
                  className="w-8 h-8 p-0"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </GlassButton>
              </div>

              {/* Results grid */}
              <div className="overflow-auto max-h-[calc(90vh-12rem)]">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {results.map((url, index) => (
                    <div 
                      key={index} 
                      className={`
                        group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200
                        ${selectedIndex === index 
                          ? 'ring-4 ring-blue-500 scale-105' 
                          : 'hover:scale-105 bg-white/20 dark:bg-black/20 border border-white/30 dark:border-white/10 hover:border-accent/50'
                        }
                      `}
                      onClick={() => setSelectedIndex(index)}
                    >
                      <div className="aspect-[3/4] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
                        {/* Blurred background */}
                        <img
                          src={url}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover blur-xl opacity-50"
                        />
                        {/* Main image */}
                        <img
                          src={url}
                          alt={`Try-on result ${index + 1}`}
                          className="relative w-full h-full object-contain p-2"
                        />
                      </div>
                      
                      {/* Preview button */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <GlassButton
                          size="sm"
                          variant="ghost"
                          className="w-8 h-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            openPreview(index);
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </GlassButton>
                      </div>

                      {/* Selection indicator */}
                      {selectedIndex === index && (
                        <div className="absolute top-2 left-2">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-white/20">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Click an image to select, then use it as your new avatar
                </div>
                <div className="flex gap-3">
                  <GlassButton
                    variant="secondary"
                    onClick={onClose}
                  >
                    Cancel
                  </GlassButton>
                  <GlassButton
                    variant="primary"
                    onClick={handleSelect}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Use This Look
                    </div>
                  </GlassButton>
                </div>
              </div>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* Fullscreen preview */}
      {showFullscreenPreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-lg">
          <div 
            className="fixed inset-0"
            onClick={() => setShowFullscreenPreview(false)}
          />
          
          {/* Navigation arrows */}
          {previewIndex > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-all"
              onClick={() => setPreviewIndex(previewIndex - 1)}
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          
          {previewIndex < results.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-all"
              onClick={() => setPreviewIndex(previewIndex + 1)}
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Close button */}
          <button
            className="absolute top-4 right-4 z-10 w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-all"
            onClick={() => setShowFullscreenPreview(false)}
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Main image */}
          <div className="relative max-w-2xl max-h-[80vh] bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl overflow-hidden shadow-2xl">
            {/* Blurred background */}
            <img
              src={results[previewIndex]}
              alt=""
              className="absolute inset-0 w-full h-full object-cover blur-xl opacity-50"
            />
            {/* Main preview */}
            <img
              src={results[previewIndex]}
              alt={`Preview ${previewIndex + 1}`}
              className="relative w-full h-full object-contain p-4"
            />
          </div>

          {/* Bottom actions */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
            <GlassButton
              variant="secondary"
              onClick={() => {
                setSelectedIndex(previewIndex);
                setShowFullscreenPreview(false);
              }}
            >
              Select This
            </GlassButton>
            <GlassButton
              variant="primary"
              onClick={() => {
                onSelect(results[previewIndex]);
                onClose();
              }}
              className="bg-blue-500 hover:bg-blue-600"
            >
              Use This Look
            </GlassButton>
          </div>
        </div>
      )}
    </>
  );
}
