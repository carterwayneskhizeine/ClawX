import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserInfo } from '@/lib/auth-api';

interface AuthState {
    token: string | null;
    user: UserInfo | null;
    isLocalMode: boolean;

    // Actions
    setToken: (token: string | null) => void;
    setUser: (user: UserInfo | null) => void;
    setLocalMode: (value: boolean) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            isLocalMode: false,

            setToken: (token) => set({ token, isLocalMode: false }),
            setUser: (user) => set({ user }),
            setLocalMode: (isLocalMode) => set({ isLocalMode, token: null, user: null }),
            logout: () => set({ token: null, user: null, isLocalMode: false }),
        }),
        {
            name: 'clawx-auth',
        }
    )
);
