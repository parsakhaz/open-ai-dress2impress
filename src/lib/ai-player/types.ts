// src/lib/ai-player/types.ts

/**
 * Core types for the AI Player feature
 */

export type Category = 'top' | 'bottom' | 'dress';

// Represents a single clothing item, whether from the local closet or a search result.
export interface Product {
  id: string;
  title: string;
  image: string; // Absolute URL rooted at public, e.g. /closet/tops/blue-shirt.png
  url: string;   // For our mock, this is the same as the image URL.
  category: Category;
  price?: number;
  colors?: string[];
  brand?: string;
  provider?: 'mock' | 'rapidapi';
}

// A simplified version of a Product used for the try-on tool.
export interface TryOnItem {
  id: string;
  image: string;
  category: Category;
}

// The result from the (mocked) try-on API call.
export interface FashnResult {
  renderId: string;
  images: string[]; // A list of URLs for the generated try-on images.
  latencyMs: number;
}

// The result from the (mocked) evaluation tool.
export interface EvaluateFeatures {
  paletteHint: 'cohesive' | 'mixed' | 'busy';
  notes: string;
}

// Structured event emitted over NDJSON stream, designed for UI logging
export interface AIStreamEvent {
  runId: string;
  seq: number;
  timestamp: string; // ISO string
  phase: 'PLAN' | 'GATHER' | 'TRYON' | 'PICK' | 'DONE' | 'INIT';
  eventType:
    | 'thought'
    | 'tool:start'
    | 'tool:result'
    | 'tool:error'
    | 'phase:start'
    | 'phase:result'
    | 'phase:error'
    | 'system';
  message: string;
  tool?: { name: string };
  durationMs?: number;
  context?: Record<string, unknown>;
  error?: { message: string };
}


