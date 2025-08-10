import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { GamePhase, AIEvent, Character, WardrobeItem } from '@/types';

interface HistoryItem {
  id: string;
  imageUrl: string;
  timestamp: number;
  type: 'avatar' | 'tryOn' | 'edit';
  description?: string;
}

interface GameState {
  phase: GamePhase;
  theme: string;
  timer: number;
  aiLog: AIEvent[];
  character: Character | null;
  wardrobe: WardrobeItem[];
  currentImageUrl: string | null;
  history: HistoryItem[];
  setPhase: (phase: GamePhase) => void;
  setTheme: (theme: string) => void;
  setTimer: (time: number) => void;
  decrementTimer: () => void;
  logAIEvent: (event: AIEvent) => void;
  setCharacter: (c: Character | null) => void;
  addToWardrobe: (item: WardrobeItem) => void;
  setCurrentImage: (url: string | null) => void;
  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      phase: 'CharacterSelect',
      theme: 'Streetwear Night Out',
      timer: 0,
      aiLog: [],
      character: null,
      wardrobe: [],
      currentImageUrl: null,
      history: [],
      setPhase: (phase) => set({ phase }),
      setTheme: (theme) => set({ theme }),
      setTimer: (time) => set({ timer: time }),
      decrementTimer: () => set((state) => ({ timer: Math.max(0, state.timer - 1) })),
      logAIEvent: (event) => set((state) => ({ aiLog: [...state.aiLog, event] })),
      setCharacter: (c) => set({ character: c }),
      addToWardrobe: (item) => set((s) => ({ wardrobe: [...s.wardrobe, item] })),
      setCurrentImage: (url) => set({ currentImageUrl: url }),
      addToHistory: (item) => set((state) => ({
        history: [...state.history, {
          ...item,
          id: Math.random().toString(36).substring(2),
          timestamp: Date.now()
        }].slice(-10) // Keep only last 10 items
      })),
      resetGame: () => set({ 
        phase: 'CharacterSelect', 
        timer: 0, 
        aiLog: [], 
        history: [],
        character: null,
        wardrobe: [],
        currentImageUrl: null
      }),
    }),
    {
      name: 'dress-to-impress-storage', // unique name for localStorage key
      storage: createJSONStorage(() => localStorage), // can also use sessionStorage
      partialize: (state) => ({
        // Only persist these fields
        phase: state.phase,
        theme: state.theme,
        character: state.character,
        wardrobe: state.wardrobe,
        currentImageUrl: state.currentImageUrl,
        history: state.history,
      }),
    }
  )
);


