// frontend/admin-crm/src/utils/storage.ts

import type { User, AuthTokens } from '../types/auth.types';
import type { WalkthroughPreferences } from '../types/walkthrough.types';

// Storage keys
const STORAGE_KEYS = {
  TOKENS: 'lifeplace_admin_tokens',
  USER: 'lifeplace_admin_user',
  PREFERENCES: 'lifeplace_admin_preferences',
  THEME_MODE: 'lifeplace_admin_theme_mode',
  SIDEBAR_COLLAPSED: 'lifeplace_admin_sidebar_collapsed',
  TABLE_SETTINGS: 'lifeplace_admin_table_settings',
  WALKTHROUGH_PREFERENCES: 'lifeplace_admin_walkthrough_preferences',
} as const;

// User preferences interface
export interface UserPreferences {
  language?: string;
  timezone?: string;
  dateFormat?: string;
  itemsPerPage?: number;
  notifications?: {
    email?: boolean;
    push?: boolean;
    inApp?: boolean;
  };
}

// Table settings interface
export interface TableSettings {
  [tableId: string]: {
    columns?: string[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    pageSize?: number;
    filters?: Record<string, unknown>;
  };
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
      console.warn('Failed to parse JSON from localStorage:', error);
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
      console.error('Failed to store item in localStorage:', error);
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
      itemsPerPage: 10,
      notifications: {
        email: true,
        push: true,
        inApp: true,
      },
    });
  }

  setPreferences(preferences: Partial<UserPreferences>): void {
    const current = this.getPreferences();
    const updated = { ...current, ...preferences };
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

  // Sidebar state management
  getSidebarCollapsed(): boolean {
    const collapsed = localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED);
    return collapsed === 'true';
  }

  setSidebarCollapsed(collapsed: boolean): void {
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, collapsed.toString());
  }

  // Table settings management
  getTableSettings(): TableSettings {
    const settings = localStorage.getItem(STORAGE_KEYS.TABLE_SETTINGS);
    return this.safeJsonParse(settings, {});
  }

  getTableSetting(tableId: string): TableSettings[string] | undefined {
    const settings = this.getTableSettings();
    return settings[tableId];
  }

  setTableSetting(tableId: string, setting: TableSettings[string]): void {
    const settings = this.getTableSettings();
    settings[tableId] = { ...settings[tableId], ...setting };
    this.safeJsonStringify(STORAGE_KEYS.TABLE_SETTINGS, settings);
  }

  // Walkthrough preferences management
  getWalkthroughPreferences(): WalkthroughPreferences {
    const preferences = localStorage.getItem(STORAGE_KEYS.WALKTHROUGH_PREFERENCES);
    return this.safeJsonParse(preferences, {
      autoShowTours: true,
      showWelcomeTour: true,
      completedTours: [],
      dismissedTours: [],
    });
  }

  setWalkthroughPreferences(preferences: WalkthroughPreferences): void {
    this.safeJsonStringify(STORAGE_KEYS.WALKTHROUGH_PREFERENCES, preferences);
  }

  resetWalkthroughPreferences(): void {
    localStorage.removeItem(STORAGE_KEYS.WALKTHROUGH_PREFERENCES);
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
    const allowedKeys = [
      'PREFERENCES',
      'THEME_MODE',
      'SIDEBAR_COLLAPSED',
      'TABLE_SETTINGS',
      'WALKTHROUGH_PREFERENCES',
    ];

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
