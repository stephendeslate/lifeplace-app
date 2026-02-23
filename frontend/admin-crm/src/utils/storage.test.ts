// frontend/admin-crm/src/utils/storage.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storage, STORAGE_KEYS, UserPreferences } from './storage';
import type { User, AuthTokens } from '../types/auth.types';

describe('Storage Utility', () => {
  beforeEach(() => {
    // Clear localStorage before each test (done in setup.ts but also here for clarity)
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ============================================
  // Token Management
  // ============================================
  describe('Token Management', () => {
    const mockTokens: AuthTokens = {
      access: 'test-access-token-12345',
      refresh: 'test-refresh-token-67890',
    };

    it('stores and retrieves tokens', () => {
      storage.setTokens(mockTokens);

      const retrieved = storage.getTokens();
      expect(retrieved).toEqual(mockTokens);
    });

    it('returns null when no tokens exist', () => {
      const tokens = storage.getTokens();
      expect(tokens).toBeNull();
    });

    it('removes tokens', () => {
      storage.setTokens(mockTokens);
      storage.removeTokens();

      const tokens = storage.getTokens();
      expect(tokens).toBeNull();
    });

    it('handles corrupted token JSON gracefully', () => {
      // Directly set invalid JSON
      localStorage.setItem(STORAGE_KEYS.TOKENS, 'not-valid-json');

      const tokens = storage.getTokens();
      expect(tokens).toBeNull();
    });
  });

  // ============================================
  // User Data Management
  // ============================================
  describe('User Data Management', () => {
    const mockUser: User = {
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'ADMIN',
      is_active: true,
      date_joined: '2024-01-01T00:00:00Z',
      profile: {
        phone: '555-0100',
        company: 'Test Corp',
      },
    };

    it('stores and retrieves user', () => {
      storage.setUser(mockUser);

      const retrieved = storage.getUser();
      expect(retrieved).toEqual(mockUser);
    });

    it('returns null when no user exists', () => {
      const user = storage.getUser();
      expect(user).toBeNull();
    });

    it('removes user', () => {
      storage.setUser(mockUser);
      storage.removeUser();

      const user = storage.getUser();
      expect(user).toBeNull();
    });

    it('handles corrupted user JSON gracefully', () => {
      localStorage.setItem(STORAGE_KEYS.USER, '{invalid json}');

      const user = storage.getUser();
      expect(user).toBeNull();
    });
  });

  // ============================================
  // User Preferences
  // ============================================
  describe('User Preferences', () => {
    it('returns default preferences when none exist', () => {
      const preferences = storage.getPreferences();

      expect(preferences).toMatchObject({
        language: 'en',
        dateFormat: 'MM/dd/yyyy',
        itemsPerPage: 10,
        notifications: {
          email: true,
          push: true,
          inApp: true,
        },
      });
      // Timezone is dynamic, just check it exists
      expect(preferences.timezone).toBeDefined();
    });

    it('stores and retrieves preferences', () => {
      const customPreferences: UserPreferences = {
        language: 'es',
        timezone: 'America/New_York',
        dateFormat: 'dd/MM/yyyy',
        itemsPerPage: 25,
        notifications: {
          email: true,
          push: false,
          inApp: true,
        },
      };

      storage.setPreferences(customPreferences);

      const retrieved = storage.getPreferences();
      expect(retrieved).toEqual(customPreferences);
    });

    it('merges partial preference updates', () => {
      // Set initial preferences
      storage.setPreferences({ language: 'en', itemsPerPage: 10 });

      // Update only one property
      storage.setPreferences({ language: 'fr' });

      const preferences = storage.getPreferences();
      expect(preferences.language).toBe('fr');
      expect(preferences.itemsPerPage).toBe(10);
    });
  });

  // ============================================
  // Theme Mode
  // ============================================
  describe('Theme Mode', () => {
    it('returns system as default theme mode', () => {
      const mode = storage.getThemeMode();
      expect(mode).toBe('system');
    });

    it('stores and retrieves light mode', () => {
      storage.setThemeMode('light');
      expect(storage.getThemeMode()).toBe('light');
    });

    it('stores and retrieves dark mode', () => {
      storage.setThemeMode('dark');
      expect(storage.getThemeMode()).toBe('dark');
    });

    it('stores and retrieves system mode', () => {
      storage.setThemeMode('system');
      expect(storage.getThemeMode()).toBe('system');
    });
  });

  // ============================================
  // Sidebar State
  // ============================================
  describe('Sidebar State', () => {
    it('returns false (expanded) by default', () => {
      const collapsed = storage.getSidebarCollapsed();
      expect(collapsed).toBe(false);
    });

    it('stores and retrieves collapsed state', () => {
      storage.setSidebarCollapsed(true);
      expect(storage.getSidebarCollapsed()).toBe(true);

      storage.setSidebarCollapsed(false);
      expect(storage.getSidebarCollapsed()).toBe(false);
    });
  });

  // ============================================
  // Table Settings
  // ============================================
  describe('Table Settings', () => {
    it('returns empty object when no settings exist', () => {
      const settings = storage.getTableSettings();
      expect(settings).toEqual({});
    });

    it('returns undefined for non-existent table', () => {
      const setting = storage.getTableSetting('non-existent-table');
      expect(setting).toBeUndefined();
    });

    it('stores and retrieves table settings', () => {
      const clientsTableSettings = {
        columns: ['name', 'email', 'status'],
        sortBy: 'name',
        sortOrder: 'asc' as const,
        pageSize: 25,
      };

      storage.setTableSetting('clients', clientsTableSettings);

      const retrieved = storage.getTableSetting('clients');
      expect(retrieved).toEqual(clientsTableSettings);
    });

    it('merges table setting updates', () => {
      storage.setTableSetting('events', { sortBy: 'date', sortOrder: 'desc' });
      storage.setTableSetting('events', { pageSize: 50 });

      const settings = storage.getTableSetting('events');
      expect(settings?.sortBy).toBe('date');
      expect(settings?.sortOrder).toBe('desc');
      expect(settings?.pageSize).toBe(50);
    });

    it('stores multiple table settings independently', () => {
      storage.setTableSetting('clients', { pageSize: 10 });
      storage.setTableSetting('events', { pageSize: 25 });

      expect(storage.getTableSetting('clients')?.pageSize).toBe(10);
      expect(storage.getTableSetting('events')?.pageSize).toBe(25);
    });
  });

  // ============================================
  // Clear Operations
  // ============================================
  describe('Clear Operations', () => {
    it('clearAuth removes tokens and user', () => {
      storage.setTokens({ access: 'token', refresh: 'refresh' });
      storage.setUser({
        id: 1,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'ADMIN',
        is_active: true,
        date_joined: '2024-01-01',
        profile: {},
      });
      storage.setThemeMode('dark');

      storage.clearAuth();

      expect(storage.getTokens()).toBeNull();
      expect(storage.getUser()).toBeNull();
      // Theme should remain
      expect(storage.getThemeMode()).toBe('dark');
    });

    it('clearAll removes all storage keys', () => {
      storage.setTokens({ access: 'token', refresh: 'refresh' });
      storage.setUser({
        id: 1,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'ADMIN',
        is_active: true,
        date_joined: '2024-01-01',
        profile: {},
      });
      storage.setThemeMode('dark');
      storage.setSidebarCollapsed(true);
      storage.setPreferences({ language: 'es' });

      storage.clearAll();

      expect(storage.getTokens()).toBeNull();
      expect(storage.getUser()).toBeNull();
      expect(storage.getThemeMode()).toBe('system'); // Falls back to default
      expect(storage.getSidebarCollapsed()).toBe(false); // Falls back to default
    });
  });

  // ============================================
  // Export/Import Data
  // ============================================
  describe('Export/Import Data', () => {
    it('exports JSON-stored data (tokens and preferences)', () => {
      storage.setTokens({ access: 'token', refresh: 'refresh' });
      storage.setPreferences({ language: 'es' });

      const exported = storage.exportData();

      // JSON-stored values export correctly
      expect(exported.TOKENS).toEqual({ access: 'token', refresh: 'refresh' });
      expect(exported.PREFERENCES).toMatchObject({ language: 'es' });
    });

    it('importData does not import tokens for security', () => {
      const dataToImport = {
        TOKENS: { access: 'malicious-token', refresh: 'malicious-refresh' },
        PREFERENCES: { language: 'fr' },
      };

      storage.importData(dataToImport);

      // Tokens should NOT be imported
      expect(storage.getTokens()).toBeNull();
      // Preferences should be imported
      expect(storage.getPreferences().language).toBe('fr');
    });

    it('importData imports preferences and table settings', () => {
      const dataToImport = {
        PREFERENCES: { language: 'de' },
        TABLE_SETTINGS: { clients: { pageSize: 50 } },
      };

      storage.importData(dataToImport);

      expect(storage.getPreferences().language).toBe('de');
      expect(storage.getTableSetting('clients')?.pageSize).toBe(50);
    });
  });

  // ============================================
  // Storage Availability
  // ============================================
  describe('Storage Availability', () => {
    it('isStorageAvailable returns true when localStorage works', () => {
      expect(storage.isStorageAvailable()).toBe(true);
    });
  });

  // ============================================
  // Storage Info
  // ============================================
  describe('Storage Info', () => {
    it('getStorageInfo returns storage info structure', () => {
      // Note: With mocked localStorage, for...in iteration may not work as expected
      // We verify the method returns the expected structure
      const info = storage.getStorageInfo();

      expect(info).toHaveProperty('used');
      expect(info).toHaveProperty('available');
      expect(info).toHaveProperty('percentage');
      expect(info.available).toBe(5 * 1024 * 1024); // 5MB constant
    });
  });
});
