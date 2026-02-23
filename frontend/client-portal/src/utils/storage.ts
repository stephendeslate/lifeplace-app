// frontend/client-portal/src/utils/storage.ts

import type { User, AuthTokens } from '../types/auth.types';

// Storage keys
const STORAGE_KEYS = {
  TOKENS: 'lifeplace_client_tokens',
  USER: 'lifeplace_client_user',
  PREFERENCES: 'lifeplace_client_preferences',
  THEME_MODE: 'lifeplace_client_theme_mode',
  FAVORITES: 'lifeplace_client_favorites',
  BOOKING_HISTORY: 'lifeplace_client_booking_history',
  SEARCH_HISTORY: 'lifeplace_client_search_history',
  CART: 'lifeplace_client_cart',
} as const;

// User preferences interface
export interface UserPreferences {
  language?: string;
  timezone?: string;
  dateFormat?: string;
  currency?: string;
  notifications?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
    marketing?: boolean;
    eventReminders?: boolean;
    bookingUpdates?: boolean;
  };
  privacy?: {
    profileVisibility?: 'public' | 'private';
    showAttendedEvents?: boolean;
    allowEventRecommendations?: boolean;
  };
  accessibility?: {
    reducedMotion?: boolean;
    highContrast?: boolean;
    fontSize?: 'small' | 'medium' | 'large';
  };
}

// Favorite items interface
export interface FavoriteItem {
  id: string;
  type: 'event' | 'venue' | 'organizer';
  title: string;
  addedAt: string;
  metadata?: Record<string, string | number | boolean>;
}

// Search history interface
export interface SearchHistoryItem {
  id: string;
  query: string;
  filters?: Record<string, string | number | boolean | string[]>;
  searchedAt: string;
  resultCount?: number;
}

// Cart item interface
export interface CartItem {
  id: string;
  eventId: string;
  eventTitle: string;
  ticketType: string;
  quantity: number;
  price: number;
  addedAt: string;
  expiresAt?: string;
}

class Storage {
  /**
   * Safely parse JSON from localStorage
   */
  private safeJsonParse<T>(value: string | null, fallback: T): T {
    if (!value) return fallback;

    try {
      return JSON.parse(value);
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Failed to parse JSON from localStorage:', error);
      return fallback;
    }
  }

  /**
   * Safely stringify and store JSON in localStorage
   */
  private safeJsonStringify<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to store item in localStorage:', error);
    }
  }

  // Token management
  getTokens(): AuthTokens | null {
    const tokens = localStorage.getItem(STORAGE_KEYS.TOKENS);
    return this.safeJsonParse(tokens, null);
  }

  setTokens(tokens: AuthTokens): void {
    this.safeJsonStringify(STORAGE_KEYS.TOKENS, tokens);
  }

  removeTokens(): void {
    localStorage.removeItem(STORAGE_KEYS.TOKENS);
  }

  // User data management
  getUser(): User | null {
    const user = localStorage.getItem(STORAGE_KEYS.USER);
    return this.safeJsonParse(user, null);
  }

  setUser(user: User): void {
    this.safeJsonStringify(STORAGE_KEYS.USER, user);
  }

  removeUser(): void {
    localStorage.removeItem(STORAGE_KEYS.USER);
  }

  // User preferences management
  getPreferences(): UserPreferences {
    const preferences = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
    return this.safeJsonParse(preferences, {
      language: 'en',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      dateFormat: 'MM/dd/yyyy',
      currency: 'USD',
      notifications: {
        email: true,
        sms: false,
        push: true,
        marketing: false,
        eventReminders: true,
        bookingUpdates: true,
      },
      privacy: {
        profileVisibility: 'private',
        showAttendedEvents: true,
        allowEventRecommendations: true,
      },
      accessibility: {
        reducedMotion: false,
        highContrast: false,
        fontSize: 'medium',
      },
    });
  }

  setPreferences(preferences: Partial<UserPreferences>): void {
    const current = this.getPreferences();
    const updated = {
      ...current,
      ...preferences,
      notifications: { ...current.notifications, ...preferences.notifications },
      privacy: { ...current.privacy, ...preferences.privacy },
      accessibility: { ...current.accessibility, ...preferences.accessibility },
    };
    this.safeJsonStringify(STORAGE_KEYS.PREFERENCES, updated);
  }

  // Theme mode management
  getThemeMode(): 'light' | 'dark' | 'system' {
    const mode = localStorage.getItem(STORAGE_KEYS.THEME_MODE);
    return (mode as 'light' | 'dark' | 'system') || 'system';
  }

  setThemeMode(mode: 'light' | 'dark' | 'system'): void {
    localStorage.setItem(STORAGE_KEYS.THEME_MODE, mode);
  }

  // Favorites management
  getFavorites(): FavoriteItem[] {
    const favorites = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    return this.safeJsonParse(favorites, []);
  }

  addFavorite(item: Omit<FavoriteItem, 'id' | 'addedAt'>): void {
    const favorites = this.getFavorites();
    const newFavorite: FavoriteItem = {
      ...item,
      id: `${item.type}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      addedAt: new Date().toISOString(),
    };

    // Check if already exists
    const exists = favorites.some((fav) => fav.type === item.type && fav.title === item.title);

    if (!exists) {
      favorites.unshift(newFavorite);
      // Keep only last 100 favorites
      if (favorites.length > 100) {
        favorites.splice(100);
      }
      this.safeJsonStringify(STORAGE_KEYS.FAVORITES, favorites);
    }
  }

  removeFavorite(id: string): void {
    const favorites = this.getFavorites();
    const updated = favorites.filter((fav) => fav.id !== id);
    this.safeJsonStringify(STORAGE_KEYS.FAVORITES, updated);
  }

  isFavorite(type: string, title: string): boolean {
    const favorites = this.getFavorites();
    return favorites.some((fav) => fav.type === type && fav.title === title);
  }

  // Search history management
  getSearchHistory(): SearchHistoryItem[] {
    const history = localStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY);
    return this.safeJsonParse(history, []);
  }

  addSearchHistory(
    query: string,
    filters?: Record<string, string | number | boolean | string[]>,
    resultCount?: number,
  ): void {
    const history = this.getSearchHistory();

    // Remove existing entry for same query
    const filtered = history.filter((item) => item.query !== query);

    const newItem: SearchHistoryItem = {
      id: `search_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      query,
      filters,
      searchedAt: new Date().toISOString(),
      resultCount,
    };

    filtered.unshift(newItem);

    // Keep only last 50 searches
    if (filtered.length > 50) {
      filtered.splice(50);
    }

    this.safeJsonStringify(STORAGE_KEYS.SEARCH_HISTORY, filtered);
  }

  clearSearchHistory(): void {
    localStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
  }

  // Cart management

  /**
   * Run a callback with a cross-tab lock on cart storage.
   * Uses Web Locks API where available to prevent read-modify-write
   * race conditions across browser tabs.
   */
  private async withCartLock<T>(fn: () => T): Promise<T> {
    if (navigator.locks) {
      return navigator.locks.request('lifeplace_cart_lock', () => fn());
    }
    return fn();
  }

  getCart(): CartItem[] {
    const cart = localStorage.getItem(STORAGE_KEYS.CART);
    const items = this.safeJsonParse(cart, []);

    // Filter out expired items
    const now = new Date().toISOString();
    const validItems = items.filter((item: CartItem) => !item.expiresAt || item.expiresAt > now);

    // Update storage if items were filtered
    if (validItems.length !== items.length) {
      this.safeJsonStringify(STORAGE_KEYS.CART, validItems);
    }

    return validItems;
  }

  async addToCart(item: Omit<CartItem, 'id' | 'addedAt'>): Promise<void> {
    await this.withCartLock(() => {
      const cart = this.getCart();

      const existingIndex = cart.findIndex(
        (cartItem) => cartItem.eventId === item.eventId && cartItem.ticketType === item.ticketType,
      );

      if (existingIndex >= 0) {
        cart[existingIndex].quantity += item.quantity;
      } else {
        const newItem: CartItem = {
          ...item,
          id: `cart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          addedAt: new Date().toISOString(),
        };
        cart.push(newItem);
      }

      this.safeJsonStringify(STORAGE_KEYS.CART, cart);
    });
  }

  async updateCartItem(id: string, updates: Partial<CartItem>): Promise<void> {
    await this.withCartLock(() => {
      const cart = this.getCart();
      const index = cart.findIndex((item) => item.id === id);

      if (index >= 0) {
        cart[index] = { ...cart[index], ...updates };
        this.safeJsonStringify(STORAGE_KEYS.CART, cart);
      }
    });
  }

  async removeFromCart(id: string): Promise<void> {
    await this.withCartLock(() => {
      const cart = this.getCart();
      const updated = cart.filter((item) => item.id !== id);
      this.safeJsonStringify(STORAGE_KEYS.CART, updated);
    });
  }

  clearCart(): void {
    localStorage.removeItem(STORAGE_KEYS.CART);
  }

  getCartTotal(): number {
    const cart = this.getCart();
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  }

  getCartItemCount(): number {
    const cart = this.getCart();
    return cart.reduce((total, item) => total + item.quantity, 0);
  }

  // Booking history cache (for offline access)
  getBookingHistory(): Record<string, unknown>[] {
    const history = localStorage.getItem(STORAGE_KEYS.BOOKING_HISTORY);
    return this.safeJsonParse(history, []);
  }

  setBookingHistory(bookings: Record<string, unknown>[]): void {
    this.safeJsonStringify(STORAGE_KEYS.BOOKING_HISTORY, bookings);
  }

  // Clear all app data
  clearAll(): void {
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
  }

  // Clear only auth-related data
  clearAuth(): void {
    this.removeTokens();
    this.removeUser();
  }

  // Clear user-specific data (but keep preferences)
  clearUserData(): void {
    this.clearAuth();
    this.clearCart();
    localStorage.removeItem(STORAGE_KEYS.FAVORITES);
    localStorage.removeItem(STORAGE_KEYS.BOOKING_HISTORY);
    localStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
  }

  // Export data for backup
  exportData(): Record<string, unknown> {
    const data: Record<string, unknown> = {};

    Object.entries(STORAGE_KEYS).forEach(([key, storageKey]) => {
      const value = localStorage.getItem(storageKey);
      if (value) {
        data[key] = this.safeJsonParse(value, null);
      }
    });

    return data;
  }

  // Import data from backup (excluding sensitive auth data)
  importData(data: Record<string, unknown>): void {
    // Don't import tokens for security reasons
    const allowedKeys = ['PREFERENCES', 'THEME_MODE', 'FAVORITES', 'SEARCH_HISTORY'];

    allowedKeys.forEach((key) => {
      if (data[key] && STORAGE_KEYS[key as keyof typeof STORAGE_KEYS]) {
        this.safeJsonStringify(STORAGE_KEYS[key as keyof typeof STORAGE_KEYS], data[key]);
      }
    });
  }

  // Check if storage is available
  isStorageAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  // Get storage usage info
  getStorageInfo(): { used: number; available: number; percentage: number } {
    if (!this.isStorageAvailable()) {
      return { used: 0, available: 0, percentage: 0 };
    }

    let used = 0;
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        used += localStorage[key].length + key.length;
      }
    }

    // Approximate localStorage limit (varies by browser, typically 5-10MB)
    const available = 5 * 1024 * 1024; // 5MB
    const percentage = (used / available) * 100;

    return { used, available, percentage };
  }
}

// Export singleton instance
export const storage = new Storage();

// Export storage keys for reference
export { STORAGE_KEYS };
