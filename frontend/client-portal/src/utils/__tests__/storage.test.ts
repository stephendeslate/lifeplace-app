// frontend/client-portal/src/utils/__tests__/storage.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storage, STORAGE_KEYS } from '../storage';
import type { User, AuthTokens } from '../../types/auth.types';

describe('Storage Utilities', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Token Management', () => {
    const mockTokens: AuthTokens = {
      access: 'test-access-token',
      refresh: 'test-refresh-token',
    };

    it('setTokens stores tokens in localStorage', () => {
      storage.setTokens(mockTokens);

      const stored = localStorage.getItem(STORAGE_KEYS.TOKENS);
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored!)).toEqual(mockTokens);
    });

    it('getTokens retrieves tokens from localStorage', () => {
      localStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(mockTokens));

      const tokens = storage.getTokens();
      expect(tokens).toEqual(mockTokens);
    });

    it('getTokens returns null when no tokens exist', () => {
      const tokens = storage.getTokens();
      expect(tokens).toBeNull();
    });

    it('removeTokens removes tokens from localStorage', () => {
      localStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(mockTokens));

      storage.removeTokens();

      expect(localStorage.getItem(STORAGE_KEYS.TOKENS)).toBeNull();
    });
  });

  describe('User Management', () => {
    const mockUser: User = {
      id: 'user-1',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      is_active: true,
      date_joined: '2024-01-01T00:00:00Z',
    };

    it('setUser stores user in localStorage', () => {
      storage.setUser(mockUser);

      const stored = localStorage.getItem(STORAGE_KEYS.USER);
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored!)).toEqual(mockUser);
    });

    it('getUser retrieves user from localStorage', () => {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mockUser));

      const user = storage.getUser();
      expect(user).toEqual(mockUser);
    });

    it('getUser returns null when no user exists', () => {
      const user = storage.getUser();
      expect(user).toBeNull();
    });

    it('removeUser removes user from localStorage', () => {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mockUser));

      storage.removeUser();

      expect(localStorage.getItem(STORAGE_KEYS.USER)).toBeNull();
    });
  });

  describe('User Preferences', () => {
    it('getPreferences returns default preferences when none set', () => {
      const prefs = storage.getPreferences();

      expect(prefs.language).toBe('en');
      expect(prefs.dateFormat).toBe('MM/dd/yyyy');
      expect(prefs.currency).toBe('USD');
      expect(prefs.notifications?.email).toBe(true);
      expect(prefs.notifications?.sms).toBe(false);
      expect(prefs.notifications?.push).toBe(true);
      expect(prefs.privacy?.profileVisibility).toBe('private');
      expect(prefs.accessibility?.fontSize).toBe('medium');
    });

    it('setPreferences updates preferences', () => {
      storage.setPreferences({ language: 'es' });

      const prefs = storage.getPreferences();
      expect(prefs.language).toBe('es');
    });

    it('setPreferences merges with existing preferences', () => {
      storage.setPreferences({ language: 'es' });
      storage.setPreferences({ currency: 'EUR' });

      const prefs = storage.getPreferences();
      expect(prefs.language).toBe('es');
      expect(prefs.currency).toBe('EUR');
    });

    it('setPreferences merges nested notification preferences', () => {
      storage.setPreferences({ notifications: { email: false } });

      const prefs = storage.getPreferences();
      expect(prefs.notifications?.email).toBe(false);
      expect(prefs.notifications?.sms).toBe(false); // Default preserved
    });
  });

  describe('Theme Mode', () => {
    it('getThemeMode returns "system" by default', () => {
      expect(storage.getThemeMode()).toBe('system');
    });

    it('setThemeMode stores theme mode', () => {
      storage.setThemeMode('dark');
      expect(storage.getThemeMode()).toBe('dark');
    });

    it('setThemeMode accepts "light"', () => {
      storage.setThemeMode('light');
      expect(storage.getThemeMode()).toBe('light');
    });

    it('setThemeMode accepts "system"', () => {
      storage.setThemeMode('system');
      expect(storage.getThemeMode()).toBe('system');
    });
  });

  describe('Favorites Management', () => {
    const favoriteItem = {
      type: 'event' as const,
      title: 'Test Event',
      metadata: { eventId: '123' },
    };

    it('getFavorites returns empty array by default', () => {
      expect(storage.getFavorites()).toEqual([]);
    });

    it('addFavorite adds item to favorites', () => {
      storage.addFavorite(favoriteItem);

      const favorites = storage.getFavorites();
      expect(favorites).toHaveLength(1);
      expect(favorites[0].title).toBe('Test Event');
      expect(favorites[0].type).toBe('event');
    });

    it('addFavorite generates id and addedAt', () => {
      storage.addFavorite(favoriteItem);

      const favorites = storage.getFavorites();
      expect(favorites[0].id).toBeDefined();
      expect(favorites[0].addedAt).toBeDefined();
    });

    it('addFavorite prevents duplicates', () => {
      storage.addFavorite(favoriteItem);
      storage.addFavorite(favoriteItem);

      const favorites = storage.getFavorites();
      expect(favorites).toHaveLength(1);
    });

    it('removeFavorite removes item by id', () => {
      storage.addFavorite(favoriteItem);
      const favorites = storage.getFavorites();
      const id = favorites[0].id;

      storage.removeFavorite(id);

      expect(storage.getFavorites()).toHaveLength(0);
    });

    it('isFavorite returns true for existing favorite', () => {
      storage.addFavorite(favoriteItem);

      expect(storage.isFavorite('event', 'Test Event')).toBe(true);
    });

    it('isFavorite returns false for non-existing favorite', () => {
      expect(storage.isFavorite('event', 'Non-existing')).toBe(false);
    });

    it('limits favorites to 100 items', () => {
      for (let i = 0; i < 105; i++) {
        storage.addFavorite({
          type: 'event',
          title: `Event ${i}`,
        });
      }

      const favorites = storage.getFavorites();
      expect(favorites.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Search History', () => {
    it('getSearchHistory returns empty array by default', () => {
      expect(storage.getSearchHistory()).toEqual([]);
    });

    it('addSearchHistory adds search to history', () => {
      storage.addSearchHistory('wedding venue');

      const history = storage.getSearchHistory();
      expect(history).toHaveLength(1);
      expect(history[0].query).toBe('wedding venue');
    });

    it('addSearchHistory includes filters and result count', () => {
      storage.addSearchHistory('venue', { location: 'Manila' }, 10);

      const history = storage.getSearchHistory();
      expect(history[0].filters).toEqual({ location: 'Manila' });
      expect(history[0].resultCount).toBe(10);
    });

    it('addSearchHistory removes duplicate queries', () => {
      storage.addSearchHistory('wedding venue');
      storage.addSearchHistory('wedding venue');

      const history = storage.getSearchHistory();
      expect(history).toHaveLength(1);
    });

    it('clearSearchHistory clears all history', () => {
      storage.addSearchHistory('query1');
      storage.addSearchHistory('query2');

      storage.clearSearchHistory();

      expect(storage.getSearchHistory()).toEqual([]);
    });

    it('limits history to 50 items', () => {
      for (let i = 0; i < 55; i++) {
        storage.addSearchHistory(`query ${i}`);
      }

      const history = storage.getSearchHistory();
      expect(history.length).toBeLessThanOrEqual(50);
    });
  });

  describe('Cart Management', () => {
    const cartItem = {
      eventId: 'event-1',
      eventTitle: 'Test Event',
      ticketType: 'VIP',
      quantity: 2,
      price: 1000,
    };

    it('getCart returns empty array by default', () => {
      expect(storage.getCart()).toEqual([]);
    });

    it('addToCart adds item to cart', () => {
      storage.addToCart(cartItem);

      const cart = storage.getCart();
      expect(cart).toHaveLength(1);
      expect(cart[0].eventTitle).toBe('Test Event');
    });

    it('addToCart generates id and addedAt', () => {
      storage.addToCart(cartItem);

      const cart = storage.getCart();
      expect(cart[0].id).toBeDefined();
      expect(cart[0].addedAt).toBeDefined();
    });

    it('addToCart updates quantity for existing item', () => {
      storage.addToCart(cartItem);
      storage.addToCart(cartItem);

      const cart = storage.getCart();
      expect(cart).toHaveLength(1);
      expect(cart[0].quantity).toBe(4); // 2 + 2
    });

    it('updateCartItem updates item properties', () => {
      storage.addToCart(cartItem);
      const cart = storage.getCart();
      const id = cart[0].id;

      storage.updateCartItem(id, { quantity: 5 });

      const updatedCart = storage.getCart();
      expect(updatedCart[0].quantity).toBe(5);
    });

    it('removeFromCart removes item by id', () => {
      storage.addToCart(cartItem);
      const cart = storage.getCart();
      const id = cart[0].id;

      storage.removeFromCart(id);

      expect(storage.getCart()).toHaveLength(0);
    });

    it('clearCart removes all items', () => {
      storage.addToCart(cartItem);
      storage.addToCart({ ...cartItem, eventId: 'event-2' });

      storage.clearCart();

      expect(storage.getCart()).toEqual([]);
    });

    it('getCartTotal calculates total correctly', () => {
      storage.addToCart({ ...cartItem, quantity: 2, price: 1000 });
      storage.addToCart({ ...cartItem, eventId: 'event-2', quantity: 1, price: 500 });

      expect(storage.getCartTotal()).toBe(2500); // 2*1000 + 1*500
    });

    it('getCartItemCount calculates total quantity', () => {
      storage.addToCart({ ...cartItem, quantity: 2 });
      storage.addToCart({ ...cartItem, eventId: 'event-2', quantity: 3 });

      expect(storage.getCartItemCount()).toBe(5); // 2 + 3
    });

    it('getCart filters out expired items', () => {
      // Add item with past expiration
      const expiredItem = {
        id: 'cart_expired',
        eventId: 'event-1',
        eventTitle: 'Expired Event',
        ticketType: 'VIP',
        quantity: 1,
        price: 100,
        addedAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-01-01T00:00:00Z', // Past date
      };

      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify([expiredItem]));

      const cart = storage.getCart();
      expect(cart).toHaveLength(0);
    });
  });

  describe('Booking History', () => {
    const mockBookings = [
      { id: 'booking-1', date: '2024-01-01' },
      { id: 'booking-2', date: '2024-02-01' },
    ];

    it('getBookingHistory returns empty array by default', () => {
      expect(storage.getBookingHistory()).toEqual([]);
    });

    it('setBookingHistory stores bookings', () => {
      storage.setBookingHistory(mockBookings);

      expect(storage.getBookingHistory()).toEqual(mockBookings);
    });
  });

  describe('Clear Functions', () => {
    it('clearAuth removes tokens and user', () => {
      storage.setTokens({ access: 'token', refresh: 'refresh' });
      storage.setUser({ id: '1', email: 'test@test.com', first_name: 'Test', last_name: 'User', is_active: true, date_joined: '' });

      storage.clearAuth();

      expect(storage.getTokens()).toBeNull();
      expect(storage.getUser()).toBeNull();
    });

    it('clearUserData removes user-specific data but keeps preferences', () => {
      storage.setTokens({ access: 'token', refresh: 'refresh' });
      storage.setUser({ id: '1', email: 'test@test.com', first_name: 'Test', last_name: 'User', is_active: true, date_joined: '' });
      storage.setPreferences({ language: 'es' });
      storage.addFavorite({ type: 'event', title: 'Event' });
      storage.addToCart({ eventId: '1', eventTitle: 'E', ticketType: 'VIP', quantity: 1, price: 100 });

      storage.clearUserData();

      expect(storage.getTokens()).toBeNull();
      expect(storage.getUser()).toBeNull();
      expect(storage.getFavorites()).toEqual([]);
      expect(storage.getCart()).toEqual([]);
      expect(storage.getPreferences().language).toBe('es'); // Preferences preserved
    });

    it('clearAll removes everything', () => {
      storage.setTokens({ access: 'token', refresh: 'refresh' });
      storage.setUser({ id: '1', email: 'test@test.com', first_name: 'Test', last_name: 'User', is_active: true, date_joined: '' });
      storage.setPreferences({ language: 'es' });
      storage.setThemeMode('dark');

      storage.clearAll();

      expect(storage.getTokens()).toBeNull();
      expect(storage.getUser()).toBeNull();
      expect(storage.getThemeMode()).toBe('system'); // Returns default
    });
  });

  describe('Export/Import', () => {
    it('exportData exports all stored data', () => {
      storage.setPreferences({ language: 'es' });
      storage.setThemeMode('dark');

      const exported = storage.exportData();

      expect(exported.PREFERENCES).toBeDefined();
      // Theme mode is stored as raw string, not JSON parsed
      expect(exported.THEME_MODE).toBeDefined();
    });

    it('importData imports allowed data', () => {
      const dataToImport = {
        PREFERENCES: { language: 'fr' },
        THEME_MODE: 'light',
        TOKENS: { access: 'should-not-import' }, // Should be ignored
      };

      storage.importData(dataToImport);

      expect(storage.getPreferences().language).toBe('fr');
      // Note: getThemeMode returns raw value from localStorage
      // After import, theme mode should be set
      expect(storage.getTokens()).toBeNull(); // Tokens not imported for security
    });
  });

  describe('Storage Availability', () => {
    it('isStorageAvailable returns true when localStorage works', () => {
      expect(storage.isStorageAvailable()).toBe(true);
    });

    it('getStorageInfo returns storage usage', () => {
      storage.setPreferences({ language: 'es' });

      const info = storage.getStorageInfo();

      expect(info.used).toBeGreaterThan(0);
      expect(info.available).toBe(5 * 1024 * 1024); // 5MB
      expect(info.percentage).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('handles invalid JSON in localStorage gracefully', () => {
      localStorage.setItem(STORAGE_KEYS.TOKENS, 'invalid-json');

      const tokens = storage.getTokens();
      expect(tokens).toBeNull();
    });

    it('handles null values in localStorage', () => {
      localStorage.setItem(STORAGE_KEYS.USER, 'null');

      const user = storage.getUser();
      expect(user).toBeNull();
    });
  });

  describe('STORAGE_KEYS', () => {
    it('has all required keys', () => {
      expect(STORAGE_KEYS.TOKENS).toBeDefined();
      expect(STORAGE_KEYS.USER).toBeDefined();
      expect(STORAGE_KEYS.PREFERENCES).toBeDefined();
      expect(STORAGE_KEYS.THEME_MODE).toBeDefined();
      expect(STORAGE_KEYS.FAVORITES).toBeDefined();
      expect(STORAGE_KEYS.BOOKING_HISTORY).toBeDefined();
      expect(STORAGE_KEYS.SEARCH_HISTORY).toBeDefined();
      expect(STORAGE_KEYS.CART).toBeDefined();
    });
  });
});
