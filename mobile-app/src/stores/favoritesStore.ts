/**
 * Favorites Store
 *
 * Zustand store for managing user favorites.
 * Persisted to SecureStore for offline access.
 *
 * SYNC BEHAVIOR:
 * - Favorites are stored locally first (offline-first)
 * - When backend is available, syncs on app start and after changes
 * - Merge strategy: union of local and server favorites
 * - Pending changes are queued for sync when back online
 */

import { create } from 'zustand';
import { createJSONStorage, persist, StateStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import type { FavoriteItem, FavoriteType } from '@/types/explore.types';
import { favoritesApi, toLocalFavorite } from '@/apis/favorites.api';
import { logger } from '@/utils/logger';

// =============================================================================
// SECURE STORE ADAPTER
// =============================================================================

// Centralized SecureStore options for consistent behavior across all operations
const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  // Allow access when device is unlocked (not just after first unlock)
  keychainAccessible: SecureStore.WHEN_UNLOCKED,
};

const secureStoreStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return SecureStore.getItemAsync(name, SECURE_STORE_OPTIONS);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(name, value, SECURE_STORE_OPTIONS);
  },
  removeItem: async (name: string): Promise<void> => {
    await SecureStore.deleteItemAsync(name, SECURE_STORE_OPTIONS);
  },
};

// =============================================================================
// STORE TYPES
// =============================================================================

interface PendingChange {
  action: 'add' | 'remove';
  type: FavoriteType;
  itemId: number;
  timestamp: number;
}

interface FavoritesState {
  items: FavoriteItem[];
  isHydrated: boolean;
  // Sync state
  isSyncing: boolean;
  lastSyncedAt: string | null;
  hasBackendSupport: boolean | null; // null = not checked yet
  pendingChanges: PendingChange[];
  syncError: string | null;
}

interface FavoritesActions {
  addFavorite: (type: FavoriteType, itemId: number) => void;
  removeFavorite: (type: FavoriteType, itemId: number) => void;
  toggleFavorite: (type: FavoriteType, itemId: number) => void;
  isFavorite: (type: FavoriteType, itemId: number) => boolean;
  getFavoritesByType: (type: FavoriteType) => FavoriteItem[];
  clearAllFavorites: () => void;
  setHydrated: () => void;
  // Sync actions
  checkBackendSupport: () => Promise<boolean>;
  syncWithBackend: () => Promise<void>;
  fetchFromBackend: () => Promise<void>;
}

// =============================================================================
// STORE
// =============================================================================

export const useFavoritesStore = create<FavoritesState & FavoritesActions>()(
  persist(
    (set, get) => ({
      // State
      items: [],
      isHydrated: false,
      isSyncing: false,
      lastSyncedAt: null,
      hasBackendSupport: null,
      pendingChanges: [],
      syncError: null,

      // Actions
      addFavorite: (type: FavoriteType, itemId: number) => {
        const existing = get().items.find(
          (item) => item.type === type && item.itemId === itemId
        );

        if (existing) return; // Already favorited

        const newItem: FavoriteItem = {
          id: `${type}-${itemId}-${Date.now()}`,
          type,
          itemId,
          addedAt: new Date().toISOString(),
        };

        // Add to local store and queue for sync
        set((state) => ({
          items: [...state.items, newItem],
          pendingChanges: [
            ...state.pendingChanges,
            { action: 'add', type, itemId, timestamp: Date.now() },
          ],
        }));

        // Try to sync if backend is available
        if (get().hasBackendSupport) {
          get().syncWithBackend().catch(() => {
            // Sync failed - change is queued for later
          });
        }
      },

      removeFavorite: (type: FavoriteType, itemId: number) => {
        // Queue removal for sync
        set((state) => ({
          items: state.items.filter(
            (item) => !(item.type === type && item.itemId === itemId)
          ),
          pendingChanges: [
            ...state.pendingChanges,
            { action: 'remove', type, itemId, timestamp: Date.now() },
          ],
        }));

        // Try to sync if backend is available
        if (get().hasBackendSupport) {
          get().syncWithBackend().catch(() => {
            // Sync failed - change is queued for later
          });
        }
      },

      toggleFavorite: (type: FavoriteType, itemId: number) => {
        const isFav = get().isFavorite(type, itemId);
        if (isFav) {
          get().removeFavorite(type, itemId);
        } else {
          get().addFavorite(type, itemId);
        }
      },

      isFavorite: (type: FavoriteType, itemId: number) => {
        return get().items.some(
          (item) => item.type === type && item.itemId === itemId
        );
      },

      getFavoritesByType: (type: FavoriteType) => {
        return get().items.filter((item) => item.type === type);
      },

      clearAllFavorites: () => {
        set({ items: [], pendingChanges: [] });
      },

      setHydrated: () => {
        set({ isHydrated: true });
        // Check backend support after hydration
        get().checkBackendSupport();
      },

      // Sync Actions
      checkBackendSupport: async () => {
        try {
          const available = await favoritesApi.isAvailable();
          set({ hasBackendSupport: available });
          if (available) {
            // Sync immediately when backend becomes available
            get().syncWithBackend();
          }
          return available;
        } catch {
          set({ hasBackendSupport: false });
          return false;
        }
      },

      fetchFromBackend: async () => {
        if (!get().hasBackendSupport) return;

        set({ isSyncing: true, syncError: null });
        try {
          const serverFavorites = await favoritesApi.getFavorites();
          const localItems = serverFavorites.map(toLocalFavorite);

          // Merge with local favorites (union - keep both local and server)
          const existingIds = new Set(
            get().items.map((i) => `${i.type}-${i.itemId}`)
          );
          const newFromServer = localItems.filter(
            (item) => !existingIds.has(`${item.type}-${item.itemId}`)
          );

          set((state) => ({
            items: [...state.items, ...newFromServer],
            lastSyncedAt: new Date().toISOString(),
            isSyncing: false,
          }));
        } catch (error) {
          logger.error('Failed to fetch favorites from backend', { error });
          set({ isSyncing: false, syncError: 'Failed to fetch favorites' });
        }
      },

      syncWithBackend: async () => {
        if (!get().hasBackendSupport || get().isSyncing) return;

        const { pendingChanges, items } = get();
        if (pendingChanges.length === 0) {
          // No pending changes, just fetch
          return get().fetchFromBackend();
        }

        set({ isSyncing: true, syncError: null });
        try {
          // Send local favorites for sync
          const syncResult = await favoritesApi.syncFavorites(
            items.map((item) => ({
              type: item.type,
              itemId: item.itemId,
              addedAt: item.addedAt,
            }))
          );

          // Update local state with merged result
          const mergedItems = syncResult.merged.map(toLocalFavorite);

          set({
            items: mergedItems,
            pendingChanges: [],
            lastSyncedAt: new Date().toISOString(),
            isSyncing: false,
          });

          logger.info('Favorites synced successfully', {
            added: syncResult.added.length,
            removed: syncResult.removed.length,
          });
        } catch (error) {
          logger.error('Failed to sync favorites with backend', { error });
          set({ isSyncing: false, syncError: 'Failed to sync favorites' });
        }
      },
    }),
    {
      name: 'lifeplace-favorites',
      storage: createJSONStorage(() => secureStoreStorage),
      // Don't persist sync state
      partialize: (state) => ({
        items: state.items,
        pendingChanges: state.pendingChanges,
        lastSyncedAt: state.lastSyncedAt,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);

// =============================================================================
// HOOK FOR SPECIFIC ITEM
// =============================================================================

/**
 * Hook to check and toggle favorite status for a specific item
 */
export function useFavorite(type: FavoriteType, itemId: number) {
  const { isFavorite, toggleFavorite, addFavorite, removeFavorite } = useFavoritesStore();

  return {
    isFavorite: isFavorite(type, itemId),
    toggle: () => toggleFavorite(type, itemId),
    add: () => addFavorite(type, itemId),
    remove: () => removeFavorite(type, itemId),
  };
}
