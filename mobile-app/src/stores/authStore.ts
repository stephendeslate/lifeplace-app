/**
 * Authentication Store (Zustand)
 *
 * Manages authentication state with secure token storage.
 *
 * KEY CONCEPTS FOR REACT NATIVE:
 * - SecureStore: Encrypts data using iOS Keychain / Android Keystore
 * - Never use AsyncStorage for tokens (not encrypted)
 * - Zustand persist: Automatically saves/restores state
 * - The store is accessible outside React components via getState()
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

import type { User } from '@/types/auth.types';

// =============================================================================
// TYPES
// =============================================================================

interface AuthState {
  // State
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  setLoading: (isLoading: boolean) => void;
  setHydrated: (isHydrated: boolean) => void;
}

// =============================================================================
// SECURE STORAGE ADAPTER
// =============================================================================

/**
 * Secure storage options for enhanced keychain security.
 * WHEN_UNLOCKED_THIS_DEVICE_ONLY:
 * - Data is only accessible when device is unlocked
 * - Data cannot be transferred to other devices (iCloud backup excluded)
 * - Most secure option for sensitive tokens
 */
const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/**
 * Custom storage adapter for Zustand persist middleware.
 * Uses expo-secure-store for encrypted storage.
 *
 * WHY: On mobile, tokens must be stored securely:
 * - iOS: Uses Keychain (hardware-backed encryption)
 * - Android: Uses Keystore (hardware-backed on supported devices)
 */
const secureStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(name, SECURE_OPTIONS);
    } catch (error) {
      console.error('SecureStore getItem error:', error);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(name, value, SECURE_OPTIONS);
    } catch (error) {
      console.error('SecureStore setItem error:', error);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(name, SECURE_OPTIONS);
    } catch (error) {
      console.error('SecureStore removeItem error:', error);
    }
  },
};

// =============================================================================
// STORE
// =============================================================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true, // Start true until hydration completes
      isHydrated: false,

      // Actions
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setTokens: (accessToken, refreshToken) =>
        set({
          accessToken,
          refreshToken,
          isAuthenticated: true,
        }),

      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),

      setLoading: (isLoading) => set({ isLoading }),

      setHydrated: (isHydrated) => set({ isHydrated, isLoading: !isHydrated }),
    }),
    {
      name: 'auth-storage', // Key in SecureStore
      storage: createJSONStorage(() => secureStorage),
      // Only persist these fields (not isLoading, isHydrated)
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
      // Called after hydration from storage
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      },
    }
  )
);

// =============================================================================
// SELECTORS (for optimized re-renders)
// =============================================================================

/**
 * Selectors allow components to subscribe to specific pieces of state.
 * This prevents unnecessary re-renders when unrelated state changes.
 *
 * Usage: const user = useAuthStore(selectUser);
 */
export const selectUser = (state: AuthState) => state.user;
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectIsLoading = (state: AuthState) => state.isLoading;
export const selectIsHydrated = (state: AuthState) => state.isHydrated;
export const selectAccessToken = (state: AuthState) => state.accessToken;
