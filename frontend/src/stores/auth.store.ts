import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserProfile {
  userId: string;
  name: string;
  phone: string;
  role: 'Driver' | 'Operator' | 'FleetManager';
  vehicleReg?: string;
  kekeType?: string;
  stationId?: string;
  fleetId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresAt: number;
}

interface AuthState {
  tokens: AuthTokens | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setTokens: (tokens: AuthTokens) => void;
  setUser: (user: UserProfile) => void;
  login: (tokens: AuthTokens, user: UserProfile) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      tokens: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setTokens: (tokens) =>
        set({ tokens, isAuthenticated: true }),

      setUser: (user) => set({ user }),

      login: (tokens, user) =>
        set({ tokens, user, isAuthenticated: true, isLoading: false }),

      logout: () =>
        set({ tokens: null, user: null, isAuthenticated: false, isLoading: false }),

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'swapsmart-auth',
      partialize: (state) => ({
        tokens: state.tokens,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
