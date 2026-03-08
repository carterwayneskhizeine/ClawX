import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
    token: string | null;
    isLocalMode: boolean;

    // Actions
    setToken: (token: string | null) => void;
    setLocalMode: (value: boolean) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            isLocalMode: false,

            setToken: (token) => set({ token, isLocalMode: false }),
            setLocalMode: (isLocalMode) => set({ isLocalMode, token: null }),
            logout: () => set({ token: null, isLocalMode: false }),
        }),
        {
            name: 'clawx-auth',
        }
    )
);
