import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createIndexedDBStorage } from '@/lib/util/zustandIndexedDB';
import type { GamePhase, AIEvent, Character, WardrobeItem } from '@/types';

interface HistoryItem {
  id: string;
  imageUrl: string;
  timestamp: number;
  type: 'avatar' | 'tryOn' | 'edit';
  description?: string;
  imageId?: string; // optional Dexie image id
}

interface GameState {
  phase: GamePhase;
  theme: string;
  themeOptions: string[];
  themeLoading: boolean;
  timer: number;
  aiLog: AIEvent[];
  character: Character | null;
  wardrobe: WardrobeItem[];
  currentImageUrl: string | null;
  currentImageId: string | null;
  history: HistoryItem[];
  runwayUrl: string | null;
  accessorizeUsed: boolean;
  runwayBaseImageUrl: string | null;
  setPhase: (phase: GamePhase) => void;
  setTheme: (theme: string) => void;
  setThemeOptions: (themes: string[]) => void;
  setThemeLoading: (loading: boolean) => void;
  setTimer: (time: number) => void;
  decrementTimer: () => void;
  logAIEvent: (event: AIEvent) => void;
  setCharacter: (c: Character | null) => void;
  addToWardrobe: (item: WardrobeItem) => void;
  removeFromWardrobe: (id: string) => void;
  setCurrentImage: (url: string | null) => void;
  setCurrentImageId: (id: string | null) => void;
  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  setRunwayUrl: (url: string | null) => void;
  setAccessorizeUsed: (used: boolean) => void;
  setRunwayBaseImageUrl: (url: string | null) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      phase: 'CharacterSelect',
      theme: '',
      themeOptions: [],
      themeLoading: false,
      timer: 0,
      aiLog: [],
      character: null,
      wardrobe: [],
      currentImageUrl: null,
      currentImageId: null,
      history: [],
      runwayUrl: null,
      accessorizeUsed: false,
      runwayBaseImageUrl: null,
      setPhase: (phase) => set({ phase }),
      setTheme: (theme) => set({ theme }),
      setThemeOptions: (themes) => set({ themeOptions: themes }),
      setThemeLoading: (loading) => set({ themeLoading: loading }),
      setTimer: (time) => set({ timer: time }),
      decrementTimer: () => set((state) => ({ timer: Math.max(0, state.timer - 1) })),
      logAIEvent: (event) => set((state) => ({ aiLog: [...state.aiLog, event] })),
      setCharacter: (c) => set({ character: c }),
      addToWardrobe: (item) => set((s) => ({ wardrobe: [...s.wardrobe, item] })),
      removeFromWardrobe: (id) => set((s) => ({ wardrobe: s.wardrobe.filter((w) => w.id !== id) })),
      setCurrentImage: (url) => set({ currentImageUrl: url }),
      setCurrentImageId: (id) => set({ currentImageId: id }),
      setRunwayUrl: (url) => set({ runwayUrl: url }),
      setAccessorizeUsed: (used) => set({ accessorizeUsed: used }),
      setRunwayBaseImageUrl: (url) => set({ runwayBaseImageUrl: url }),
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
        currentImageUrl: null,
        currentImageId: null,
        runwayUrl: null,
        accessorizeUsed: false,
        runwayBaseImageUrl: null,
        theme: '',
        themeOptions: [],
        themeLoading: false,
      }),
    }),
    {
      name: 'dress-to-impress-storage',
      storage: createJSONStorage(() => createIndexedDBStorage()),
      partialize: (state) => ({
        // Persist lightweight fields in IDB to reduce write size; heavy fields excluded
        phase: state.phase,
        theme: state.theme,
        themeOptions: state.themeOptions,
        wardrobe: state.wardrobe,
        currentImageId: state.currentImageId,
        runwayUrl: state.runwayUrl,
      }),
    }
  )
);


