# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production bundle
- `npm run lint` - Run ESLint checks
- `npm start` - Start production server

## Environment Setup

Create `.env.local` with required API keys:
- `RAPIDAPI_KEY` and `RAPIDAPI_HOST` - Amazon product search
- `OPENAI_API_KEY` - Avatar generation and image editing
- `FASHN_AI_API_KEY` - Virtual try-on functionality
- Optional: `KLING_ACCESS_KEY` and `KLING_SECRET_KEY` for video generation (not yet wired to UI)

## Architecture Overview

### Game State Management
- Uses Zustand store (`src/lib/state/gameStore.ts`) for global game state
- Game phases: CharacterSelect → ShoppingSpree → StylingRound → WalkoutAndEval → Results
- Auto-timers: 120s for Shopping, 90s for Styling

### Core Components Structure
- **Main Game Layout**: `src/app/GameClient.tsx` - Primary game interface
- **Phase Management**: `src/app/(app)/components/game/TopBar.tsx` - Phase indicators and timers
- **Image Display**: `src/app/(app)/components/game/CenterStage.tsx` - Main image showcase
- **Tools Interface**: `src/app/(app)/components/ui/ToolsIsland.tsx` - Phase-specific action panels

### API Routes (Server-Side)
All external API calls are server-side to protect API keys:
- `/api/avatar` - OpenAI Images Edits for avatar generation from webcam data
- `/api/tryon` - FASHN AI virtual try-on (90s timeout)
- `/api/edit` - OpenAI Images Edits for AI-powered image modifications
- `/api/amazon` - RapidAPI Amazon product search
- `/api/video` - Kling video generation (configured but not UI-wired)

### Data Flow
1. **Avatar Creation**: Webcam → data URL → multipart upload → OpenAI → 4 avatar options
2. **Shopping**: Amazon search → wardrobe storage → Zustand state
3. **Try-on**: Wardrobe item + avatar → FASHN AI → 4 styled variants
4. **Editing**: Image URL → OpenAI edits → 4 edited variants

### Key Libraries
- Next.js 15 with App Router and Turbopack
- React 19 with TypeScript
- Zustand for state management
- Dexie for IndexedDB (configured but unused for undo history)
- react-webcam for camera capture
- axios for HTTP requests

### File Organization
- `src/app/(app)/` - Main game UI components
- `src/lib/adapters/` - Service layer for external APIs
- `src/lib/state/` - Global state management
- `src/types/` - TypeScript type definitions

### Known Limitations
- History/undo functionality exists in schema but not implemented
- Kling video and Judge adapters exist but not UI-connected
- Amazon item categorization hardcoded to 'top' placeholder
- No FSM-driven phase transitions beyond timer-based Shopping→Styling

### Development Notes
- All API timeouts set to 600s for serverless compatibility
- Use absolute imports with `@/*` path mapping
- Image handling via data URLs; consider storage bucket for production
- Replace `<img>` with `next/image` and configure allowed domains for production