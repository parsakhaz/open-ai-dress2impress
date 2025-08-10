import { create } from 'zustand';

interface DebugState {
  muteToasts: boolean;
  disableAutoTimers: boolean;
  disableAutoRunway: boolean;
  setMuteToasts: (v: boolean) => void;
  setDisableAutoTimers: (v: boolean) => void;
  setDisableAutoRunway: (v: boolean) => void;
}

export const useDebugStore = create<DebugState>((set) => ({
  muteToasts: false,
  disableAutoTimers: false,
  disableAutoRunway: false,
  setMuteToasts: (v) => set({ muteToasts: v }),
  setDisableAutoTimers: (v) => set({ disableAutoTimers: v }),
  setDisableAutoRunway: (v) => set({ disableAutoRunway: v }),
}));


