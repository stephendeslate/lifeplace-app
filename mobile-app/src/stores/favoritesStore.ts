/**
 * Favorites Store
 *
 * Zustand store for managing user favorites.
 * Persisted to SecureStore for offline access.
 */

import { create } from 'zustand';
import { createJSONStorage, persist, StateStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import type { FavoriteItem, FavoriteType } from '@/types/explore.types';

// =============================================================================
// SECURE STORE ADAPTER
// =============================================================================

const secureStoreStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return SecureStore.getItemAsync(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await SecureStore.deleteItemAsync(name);
  },
};

// =============================================================================
// STORE TYPES
// =============================================================================

interface FavoritesState {
  items: FavoriteItem[];
  isHydrated: boolean;
}

interface FavoritesActions {
  addFavorite: (type: FavoriteType, itemId: number) => void;
  removeFavorite: (type: FavoriteType, itemId: number) => void;
  toggleFavorite: (type: FavoriteType, itemId: number) => void;
  isFavorite: (type: FavoriteType, itemId: number) => boolean;
  getFavoritesByType: (type: FavoriteType) => FavoriteItem[];
  clearAllFavorites: () => void;
  setHydrated: () => void;
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

        set((state) => ({
          items: [...state.items, newItem],
        }));
      },

      removeFavorite: (type: FavoriteType, itemId: number) => {
        set((state) => ({
          items: state.items.filter(
            (item) => !(item.type === type && item.itemId === itemId)
          ),
        }));
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
        set({ items: [] });
      },

      setHydrated: () => {
        set({ isHydrated: true });
      },
    }),
    {
      name: 'lifeplace-favorites',
      storage: createJSONStorage(() => secureStoreStorage),
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
