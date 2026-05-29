import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ActiveTimer {
  side: 'left' | 'right';
  startedAt: string; // ISO String
  pausedAt?: string;
  accumulatedSeconds: number;
}

interface AppStore {
  familyId: string | null;
  familyCode: string | null;
  partnerName: string;
  theme: 'dark' | 'light';
  syncStatus: {
    isOnline: boolean;
    isSyncing: boolean;
    failedCount: number;
  };
  activeTimer: ActiveTimer | null;
  
  // Actions
  setFamily: (code: string, id: string) => void;
  setPartnerName: (name: string) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setSyncStatus: (status: Partial<AppStore['syncStatus']>) => void;
  startTimer: (side: 'left' | 'right') => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  clearTimer: () => void;
  logout: () => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      familyId: null,
      familyCode: null,
      partnerName: 'Partner 1',
      theme: 'dark',
      syncStatus: {
        isOnline: navigator.onLine,
        isSyncing: false,
        failedCount: 0,
      },
      activeTimer: null,

      setFamily: (code, id) => set({ familyCode: code, familyId: id }),
      setPartnerName: (name) => set({ partnerName: name }),
      setTheme: (theme) => set({ theme }),
      setSyncStatus: (status) =>
        set((state) => ({ syncStatus: { ...state.syncStatus, ...status } })),

      startTimer: (side) =>
        set({
          activeTimer: {
            side,
            startedAt: new Date().toISOString(),
            accumulatedSeconds: 0,
          },
        }),
      pauseTimer: () =>
        set((state) => {
          if (!state.activeTimer) return {};
          return {
            activeTimer: {
              ...state.activeTimer,
              pausedAt: new Date().toISOString(),
            },
          };
        }),
      resumeTimer: () =>
        set((state) => {
          if (!state.activeTimer || !state.activeTimer.pausedAt) return {};
          const pauseDuration = Math.floor(
            (new Date().getTime() - new Date(state.activeTimer.pausedAt).getTime()) / 1000
          );
          return {
            activeTimer: {
              ...state.activeTimer,
              pausedAt: undefined,
              startedAt: new Date(
                new Date(state.activeTimer.startedAt).getTime() + pauseDuration * 1000
              ).toISOString(),
            },
          };
        }),
      clearTimer: () => set({ activeTimer: null }),
      logout: () => set({ familyCode: null, familyId: null, activeTimer: null }),
    }),
    {
      name: 'milk_tracker_store',
      partialize: (state) => ({
        familyId: state.familyId,
        familyCode: state.familyCode,
        partnerName: state.partnerName,
        theme: state.theme,
        activeTimer: state.activeTimer,
      }),
    }
  )
);
