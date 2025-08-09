"use client";
import { GlassButton } from '@/components/GlassButton';

interface ToolsIslandProps {
  onSearchClick: () => void;
  onEditClick: () => void;
  onWardrobeClick: () => void;
  onAIConsoleClick: () => void;
}

export default function ToolsIsland({ 
  onSearchClick, 
  onEditClick, 
  onWardrobeClick, 
  onAIConsoleClick 
}: ToolsIslandProps) {
  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 p-2 bg-black/30 dark:bg-black/50 backdrop-blur-xl border border-white/20 rounded-2xl">
      {/* Search Amazon */}
      <GlassButton
        size="sm"
        variant="ghost"
        onClick={onSearchClick}
        className="w-12 h-12 p-0 flex items-center justify-center hover:bg-white/20"
        title="Search Amazon"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </GlassButton>

      {/* Edit with AI */}
      <GlassButton
        size="sm"
        variant="ghost"
        onClick={onEditClick}
        className="w-12 h-12 p-0 flex items-center justify-center hover:bg-white/20"
        title="Edit with AI"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </GlassButton>

      {/* Wardrobe */}
      <GlassButton
        size="sm"
        variant="ghost"
        onClick={onWardrobeClick}
        className="w-12 h-12 p-0 flex items-center justify-center hover:bg-white/20"
        title="Wardrobe"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </GlassButton>

      {/* AI Console */}
      <GlassButton
        size="sm"
        variant="ghost"
        onClick={onAIConsoleClick}
        className="w-12 h-12 p-0 flex items-center justify-center hover:bg-white/20"
        title="AI Console"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </GlassButton>
    </div>
  );
}