export type GamePhase =
  | 'ThemeSelect'
  | 'CharacterSelect'
  | 'ShoppingSpree'
  | 'StylingRound'
  | 'Accessorize'
  | 'Evaluation'
  | 'WalkoutAndEval'
  | 'Results';

export type Category = 'top' | 'bottom' | 'dress';

export interface Character {
  id: string;
  avatarUrl: string;
}

export interface WardrobeItem {
  id: string;
  name: string;
  imageUrl: string;
  buyLink: string;
  price: string | null;
  source: 'amazon' | 'llm' | 'preset';
  category: Category;
}

export interface HistoryState {
  id: string;
  imageUrl: string;
  createdAt: number;
}

export interface AIEvent {
  type: 'thought' | 'tool_call';
  content: string;
  timestamp: number;
  // Optional UI metadata for richer rendering
  tool?: string; // e.g., 'searchRapid', 'fashn.tryon'
  kind?: 'start' | 'result' | 'error' | 'system' | 'thought';
  phase?: 'PLAN' | 'GATHER' | 'TRYON' | 'PICK' | 'DONE' | 'INIT';
  images?: string[]; // inline preview thumbnails related to this event
  retryInMs?: number; // optional suggested retry delay for countdown UI
  errorDetail?: string; // optional compact technical detail for disclosure
  // Correlation identifiers for grouping parallel actions in the UI
  runId?: string; // originating run id
  groupId?: string; // stable id per parallel call (e.g., 'search-0', 'A')
  // Optional friendly metadata extracted from event context for better UI
  query?: string;
  category?: string;
  count?: number;
  finalId?: string;
  plan?: any;
}

// New: Image record for Dexie images table
export interface ImageRecord {
  id: string;
  data: string; // base64 data URL or remote URL
  createdAt: number;
}

// New: Face record for saved faces (bookmarked/selfies)
export interface FaceRecord {
  id: string;
  imageId: string; // references images.id
  createdAt: number;
  pinned: boolean;
  label?: string;
}

// Cached avatar generation results keyed by face image and params
export interface AvatarGenerationRecord {
  id: string;
  faceImageId: string;
  variantImageIds: string[]; // image ids for each generated variant
  paramsHash: string; // describes generator parameters/model
  provider?: string;
  modelVersion?: string;
  createdAt: number;
}

export type TryOnStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface TryOnJob {
  id: string;
  baseImageKey: string; // imageId if available; otherwise hash of URL
  baseImageUrl: string;
  baseImageId?: string;
  itemId: string;
  itemImageUrl: string;
  status: TryOnStatus;
  images?: string[];
  error?: string;
  createdAt: number;
  updatedAt: number;
}


