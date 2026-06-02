import { create } from 'zustand';

interface OfflineState {
  isOffline: boolean;
  lastSyncTime: number | null;
  reconnectCountdown: number;
  reconnectAttempts: number;

  setOffline: (offline: boolean) => void;
  setLastSyncTime: (time: number) => void;
  setReconnectCountdown: (seconds: number) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
}

export const useOfflineStore = create<OfflineState>()((set) => ({
  isOffline: false,
  lastSyncTime: null,
  reconnectCountdown: 0,
  reconnectAttempts: 0,

  setOffline: (isOffline) => set({ isOffline }),

  setLastSyncTime: (lastSyncTime) => set({ lastSyncTime }),

  setReconnectCountdown: (reconnectCountdown) => set({ reconnectCountdown }),

  incrementReconnectAttempts: () =>
    set((state) => ({ reconnectAttempts: state.reconnectAttempts + 1 })),

  resetReconnectAttempts: () => set({ reconnectAttempts: 0 }),
}));
