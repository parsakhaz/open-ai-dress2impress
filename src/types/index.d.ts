export type GamePhase =
  | 'CharacterSelect'
  | 'ShoppingSpree'
  | 'StylingRound'
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
}


