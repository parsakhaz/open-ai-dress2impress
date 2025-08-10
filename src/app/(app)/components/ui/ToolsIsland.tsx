"use client";
import { GlassButton } from '@/components/GlassButton';
import { Tooltip } from '@/components/Tooltip';

interface ToolsIslandProps {
  onSearchClick: () => void;
  onEditClick: () => void;
  onWardrobeClick: () => void;
  onAIConsoleClick: () => void;
  // Gating controls
  searchDisabled?: boolean;
  editDisabled?: boolean;
  wardrobeDisabled?: boolean;
  // Dynamic tooltips
  searchTooltip?: string;
  editTooltip?: string;
  wardrobeTooltip?: string;
}

export default function ToolsIsland({ 
  onSearchClick, 
  onEditClick, 
  onWardrobeClick, 
  onAIConsoleClick,
  searchDisabled = false,
  editDisabled = false,
  wardrobeDisabled = false,
  searchTooltip,
  editTooltip,
  wardrobeTooltip,
}: ToolsIslandProps) {
  return (
    <>
      {/* Desktop Version */}
      <div className="fixed left-4 top-1/2 -translate-y-1/2 z-20 flex-col gap-2 p-2 bg-background border border-border rounded-2xl hidden sm:flex">
      {/* Search Amazon */}
      <Tooltip content={searchDisabled ? (searchTooltip || 'Shopping is unavailable now') : (searchTooltip || 'Search real clothes (S)')} position="right">
        <GlassButton
          size="sm"
          variant="ghost"
          disabled={searchDisabled}
          onClick={onSearchClick}
          className="w-12 h-12 p-0 flex items-center justify-center hover:bg-foreground/10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </GlassButton>
      </Tooltip>

      {/* Edit with AI */}
      <Tooltip content={editDisabled ? (editTooltip || 'Editing is unavailable now') : (editTooltip || 'Edit with AI (E)')} position="right">
        <GlassButton
          size="sm"
          variant="ghost"
          disabled={editDisabled}
          onClick={onEditClick}
          className="w-12 h-12 p-0 flex items-center justify-center hover:bg-foreground/10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </GlassButton>
      </Tooltip>

      {/* Wardrobe */}
      <Tooltip content={wardrobeDisabled ? (wardrobeTooltip || 'Wardrobe is unavailable now') : (wardrobeTooltip || 'Your wardrobe (W)')} position="right">
        <GlassButton
          size="sm"
          variant="ghost"
          disabled={wardrobeDisabled}
          onClick={onWardrobeClick}
          className="w-12 h-12 p-0 flex items-center justify-center hover:bg-foreground/10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4v16a1 1 0 001 1h16a1 1 0 001-1V4a1 1 0 00-1-1H4a1 1 0 00-1 1z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3v18M16 3v18" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 7v10" />
            <circle cx="10" cy="12" r="1" fill="currentColor" />
            <circle cx="14" cy="12" r="1" fill="currentColor" />
          </svg>
        </GlassButton>
      </Tooltip>

      {/* AI Console */}
      <Tooltip content="AI prompt (A)" position="right">
        <GlassButton
          size="sm"
          variant="ghost"
          onClick={onAIConsoleClick}
          className="w-12 h-12 p-0 flex items-center justify-center hover:bg-foreground/10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </GlassButton>
      </Tooltip>
      </div>
      
      {/* Mobile Version */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-row gap-2 p-2 bg-background border border-border rounded-2xl sm:hidden">
        <GlassButton
          size="sm"
          variant="ghost"
          disabled={searchDisabled}
          onClick={onSearchClick}
          className="w-12 h-12 p-0 flex items-center justify-center hover:bg-foreground/10"
          title={searchDisabled ? (searchTooltip || 'Shopping is unavailable now') : (searchTooltip || 'Search Amazon')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </GlassButton>
        <GlassButton
          size="sm"
          variant="ghost"
          disabled={editDisabled}
          onClick={onEditClick}
          className="w-12 h-12 p-0 flex items-center justify-center hover:bg-foreground/10"
          title={editDisabled ? (editTooltip || 'Editing is unavailable now') : (editTooltip || 'Edit with AI')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </GlassButton>
        <GlassButton
          size="sm"
          variant="ghost"
          disabled={wardrobeDisabled}
          onClick={onWardrobeClick}
          className="w-12 h-12 p-0 flex items-center justify-center hover:bg-foreground/10"
          title={wardrobeDisabled ? (wardrobeTooltip || 'Wardrobe is unavailable now') : (wardrobeTooltip || 'Wardrobe')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4v16a1 1 0 001 1h16a1 1 0 001-1V4a1 1 0 00-1-1H4a1 1 0 00-1 1z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3v18M16 3v18" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 7v10" />
            <circle cx="10" cy="12" r="1" fill="currentColor" />
            <circle cx="14" cy="12" r="1" fill="currentColor" />
          </svg>
        </GlassButton>
        <GlassButton
          size="sm"
          variant="ghost"
          onClick={onAIConsoleClick}
          className="w-12 h-12 p-0 flex items-center justify-center hover:bg-foreground/10"
          title="AI Console"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </GlassButton>
      </div>
    </>
  );
}