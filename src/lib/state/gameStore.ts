import { create } from 'zustand';
import type { GamePhase, AIEvent, Character, WardrobeItem } from '@/types';

interface GameState {
  phase: GamePhase;
  theme: string;
  timer: number;
  aiLog: AIEvent[];
  character: Character | null;
  wardrobe: WardrobeItem[];
  currentImageUrl: string | null;
  setPhase: (phase: GamePhase) => void;
  setTheme: (theme: string) => void;
  setTimer: (time: number) => void;
  decrementTimer: () => void;
  logAIEvent: (event: AIEvent) => void;
  setCharacter: (c: Character | null) => void;
  addToWardrobe: (item: WardrobeItem) => void;
  setCurrentImage: (url: string | null) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  phase: 'CharacterSelect',
  theme: 'Streetwear Night Out',
  timer: 0,
  aiLog: [],
  character: null,
  wardrobe: [],
  currentImageUrl: null,
  setPhase: (phase) => set({ phase }),
  setTheme: (theme) => set({ theme }),
  setTimer: (time) => set({ timer: time }),
  decrementTimer: () => set((state) => ({ timer: Math.max(0, state.timer - 1) })),
  logAIEvent: (event) => set((state) => ({ aiLog: [...state.aiLog, event] })),
  setCharacter: (c) => set({ character: c }),
  addToWardrobe: (item) => set((s) => ({ wardrobe: [...s.wardrobe, item] })),
  setCurrentImage: (url) => set({ currentImageUrl: url }),
  resetGame: () => set({ phase: 'CharacterSelect', timer: 0, aiLog: [] }),
}));


