/**
 * Favorites API
 *
 * API endpoints for syncing favorites with the backend.
 *
 * NOTE: These endpoints require backend implementation.
 * Until the backend is ready, favorites will remain local-only
 * but will sync automatically once endpoints are available.
 *
 * Expected Backend Endpoints:
 * - GET /client/favorites/ - List all favorites for the user
 * - POST /client/favorites/ - Add a new favorite
 * - DELETE /client/favorites/{id}/ - Remove a favorite
 * - PUT /client/favorites/sync/ - Sync local favorites with server
 */

import api from '@/utils/api';
import { logger } from '@/utils/logger';
import type { FavoriteItem, FavoriteType } from '@/types/explore.types';

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Favorite from backend
 */
export interface BackendFavorite {
  id: number;
  item_type: FavoriteType;
  item_id: number;
  created_at: string;
}

/**
 * Sync response
 */
export interface SyncResponse {
  added: BackendFavorite[];
  removed: number[];
  merged: BackendFavorite[];
}

// =============================================================================
// API METHODS
// =============================================================================

export const favoritesApi = {
  /**
   * Check if the favorites API is available on the backend.
   * Call this before attempting to sync.
   */
  isAvailable: async (): Promise<boolean> => {
    try {
      // Try to fetch favorites - if 404, backend doesn't have the endpoint yet
      await api.get('/client/favorites/', { timeout: 5000 });
      return true;
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      // 401 means the endpoint exists but user isn't authenticated
      if (err?.response?.status === 401) {
        return true;
      }
      // 404 or other errors mean endpoint doesn't exist
      return false;
    }
  },

  /**
   * Get all favorites for the current user from the backend.
   */
  getFavorites: async (): Promise<BackendFavorite[]> => {
    try {
      const response = await api.get<BackendFavorite[]>('/client/favorites/');
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch favorites from backend', { error });
      throw error;
    }
  },

  /**
   * Add a favorite on the backend.
   */
  addFavorite: async (type: FavoriteType, itemId: number): Promise<BackendFavorite> => {
    try {
      const response = await api.post<BackendFavorite>('/client/favorites/', {
        item_type: type,
        item_id: itemId,
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to add favorite on backend', { type, itemId, error });
      throw error;
    }
  },

  /**
   * Remove a favorite on the backend.
   */
  removeFavorite: async (favoriteId: number): Promise<void> => {
    try {
      await api.delete(`/client/favorites/${favoriteId}/`);
    } catch (error) {
      logger.error('Failed to remove favorite on backend', { favoriteId, error });
      throw error;
    }
  },

  /**
   * Sync local favorites with backend.
   * Sends local favorites and receives merged result.
   */
  syncFavorites: async (
    localFavorites: Array<{ type: FavoriteType; itemId: number; addedAt: string }>
  ): Promise<SyncResponse> => {
    try {
      const response = await api.put<SyncResponse>('/client/favorites/sync/', {
        favorites: localFavorites.map((f) => ({
          item_type: f.type,
          item_id: f.itemId,
          created_at: f.addedAt,
        })),
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to sync favorites with backend', { error });
      throw error;
    }
  },
};

// =============================================================================
// CONVERSION HELPERS
// =============================================================================

/**
 * Convert backend favorite to local format.
 */
export function toLocalFavorite(backend: BackendFavorite): FavoriteItem {
  return {
    id: `${backend.item_type}-${backend.item_id}-${backend.id}`,
    type: backend.item_type,
    itemId: backend.item_id,
    addedAt: backend.created_at,
  };
}

/**
 * Convert local favorite to backend format for syncing.
 */
export function toBackendFavorite(local: FavoriteItem): {
  item_type: FavoriteType;
  item_id: number;
  created_at: string;
} {
  return {
    item_type: local.type,
    item_id: local.itemId,
    created_at: local.addedAt,
  };
}

export default favoritesApi;
