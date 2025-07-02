// frontend/client-portal/src/utils/session-storage.ts

import type { SessionStorageData } from '../types/booking-session.types';

/**
 * Session storage utility for booking progress persistence
 * Used by useBookingSession for auto-save and progress recovery
 */

const STORAGE_KEYS = {
  BOOKING_SESSION: 'booking_session',
  STEP_DATA: 'step_data',
  PROGRESS: 'booking_progress',
} as const;

/**
 * Storage interface for consistent local storage operations
 */
interface StorageInterface {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

/**
 * Safe storage wrapper that handles localStorage errors
 * Falls back to memory storage if localStorage is unavailable
 */
class SafeStorage implements StorageInterface {
  private memoryStorage: Map<string, string> = new Map();
  private isLocalStorageAvailable: boolean;

  constructor() {
    this.isLocalStorageAvailable = this.checkLocalStorageAvailability();
  }

  private checkLocalStorageAvailability(): boolean {
    try {
      const testKey = '__test_local_storage__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  getItem(key: string): string | null {
    if (this.isLocalStorageAvailable) {
      try {
        return localStorage.getItem(key);
      } catch {
        // Fall through to memory storage
      }
    }
    return this.memoryStorage.get(key) || null;
  }

  setItem(key: string, value: string): void {
    if (this.isLocalStorageAvailable) {
      try {
        localStorage.setItem(key, value);
        return;
      } catch {
        // Fall through to memory storage
      }
    }
    this.memoryStorage.set(key, value);
  }

  removeItem(key: string): void {
    if (this.isLocalStorageAvailable) {
      try {
        localStorage.removeItem(key);
      } catch {
        // Fall through to memory storage
      }
    }
    this.memoryStorage.delete(key);
  }

  clear(): void {
    if (this.isLocalStorageAvailable) {
      try {
        // Only clear booking-related keys, not all localStorage
        Object.values(STORAGE_KEYS).forEach(key => {
          localStorage.removeItem(key);
        });
      } catch {
        // Fall through to memory storage
      }
    }
    this.memoryStorage.clear();
  }
}

const storage = new SafeStorage();

/**
 * Save session data to local storage
 * Used by useBookingSession for progress persistence
 */
export const saveSessionData = (sessionData: SessionStorageData): void => {
  try {
    const dataToStore = {
      ...sessionData,
      lastUpdated: new Date().toISOString(),
    };
    
    storage.setItem(STORAGE_KEYS.BOOKING_SESSION, JSON.stringify(dataToStore));
  } catch (error) {
    console.warn('Failed to save session data to storage:', error);
  }
};

/**
 * Load session data from local storage
 * Used by useBookingSession for session recovery
 */
export const loadSessionData = (): SessionStorageData | null => {
  try {
    const storedData = storage.getItem(STORAGE_KEYS.BOOKING_SESSION);
    
    if (!storedData) {
      return null;
    }

    const parsed = JSON.parse(storedData) as SessionStorageData;
    
    // Check if session has expired
    if (parsed.expiresAt && new Date(parsed.expiresAt) <= new Date()) {
      clearSessionData();
      return null;
    }

    return parsed;
  } catch (error) {
    console.warn('Failed to load session data from storage:', error);
    return null;
  }
};

/**
 * Update step data in stored session
 * Used by useBookingSession for incremental updates
 */
export const updateStepData = (stepId: number, stepData: Record<string, any>): void => {
  try {
    const existingData = loadSessionData();
    
    if (!existingData) {
      return;
    }

    const updatedData: SessionStorageData = {
      ...existingData,
      stepData: {
        ...existingData.stepData,
        [`step_${stepId}`]: stepData,
      },
      lastUpdated: new Date().toISOString(),
    };

    saveSessionData(updatedData);
  } catch (error) {
    console.warn('Failed to update step data in storage:', error);
  }
};

/**
 * Get step data for a specific step
 * Used by step components to load saved progress
 */
export const getStepData = (stepId: number): Record<string, any> | null => {
  try {
    const sessionData = loadSessionData();
    
    if (!sessionData) {
      return null;
    }

    return sessionData.stepData[`step_${stepId}`] || null;
  } catch (error) {
    console.warn('Failed to get step data from storage:', error);
    return null;
  }
};

/**
 * Clear all session data from storage
 * Used when session is completed or abandoned
 */
export const clearSessionData = (): void => {
  try {
    storage.clear();
  } catch (error) {
    console.warn('Failed to clear session data from storage:', error);
  }
};

/**
 * Check if stored session is still valid
 * Used to determine if stored session can be restored
 */
export const isSessionValid = (sessionUUID?: string): boolean => {
  try {
    const sessionData = loadSessionData();
    
    if (!sessionData) {
      return false;
    }

    // Check if session UUID matches (if provided)
    if (sessionUUID && sessionData.sessionId !== sessionUUID) {
      return false;
    }

    // Check if session has expired
    if (sessionData.expiresAt && new Date(sessionData.expiresAt) <= new Date()) {
      return false;
    }

    return true;
  } catch (error) {
    console.warn('Failed to validate session from storage:', error);
    return false;
  }
};

/**
 * Get session expiry time from storage
 * Used to display session timeout warnings
 */
export const getSessionExpiry = (): Date | null => {
  try {
    const sessionData = loadSessionData();
    
    if (!sessionData || !sessionData.expiresAt) {
      return null;
    }

    return new Date(sessionData.expiresAt);
  } catch (error) {
    console.warn('Failed to get session expiry from storage:', error);
    return null;
  }
};

/**
 * Calculate time remaining until session expires
 * Used for session timeout warnings and auto-refresh
 */
export const getTimeUntilExpiry = (): number | null => {
  try {
    const expiryDate = getSessionExpiry();
    
    if (!expiryDate) {
      return null;
    }

    const now = new Date();
    const timeRemaining = expiryDate.getTime() - now.getTime();
    
    return Math.max(0, timeRemaining);
  } catch (error) {
    console.warn('Failed to calculate time until expiry:', error);
    return null;
  }
};

/**
 * Check if session is about to expire (within specified minutes)
 * Used for proactive session renewal warnings
 */
export const isSessionNearExpiry = (warningMinutes: number = 10): boolean => {
  try {
    const timeRemaining = getTimeUntilExpiry();
    
    if (timeRemaining === null) {
      return false;
    }

    const warningThreshold = warningMinutes * 60 * 1000; // Convert to milliseconds
    
    return timeRemaining <= warningThreshold;
  } catch (error) {
    console.warn('Failed to check if session is near expiry:', error);
    return false;
  }
};

/**
 * Create session storage data structure
 * Used when initializing a new session
 */
export const createSessionStorageData = (
  sessionId: string,
  flowId: number,
  expiresAt: string,
  initialStepData: Record<string, any> = {}
): SessionStorageData => {
  return {
    sessionId,
    flowId,
    stepData: initialStepData,
    lastUpdated: new Date().toISOString(),
    expiresAt,
  };
};

/**
 * Get all stored step data
 * Used for session restoration and debugging
 */
export const getAllStepData = (): Record<string, any> => {
  try {
    const sessionData = loadSessionData();
    
    if (!sessionData) {
      return {};
    }

    return sessionData.stepData;
  } catch (error) {
    console.warn('Failed to get all step data from storage:', error);
    return {};
  }
};

/**
 * Update session expiry time
 * Used when session is refreshed or extended
 */
export const updateSessionExpiry = (newExpiryDate: string): void => {
  try {
    const existingData = loadSessionData();
    
    if (!existingData) {
      return;
    }

    const updatedData: SessionStorageData = {
      ...existingData,
      expiresAt: newExpiryDate,
      lastUpdated: new Date().toISOString(),
    };

    saveSessionData(updatedData);
  } catch (error) {
    console.warn('Failed to update session expiry in storage:', error);
  }
};

/**
 * Check if there's any stored session data
 * Used to determine if session recovery is possible
 */
export const hasStoredSession = (): boolean => {
  try {
    const sessionData = loadSessionData();
    return sessionData !== null;
  } catch (error) {
    console.warn('Failed to check for stored session:', error);
    return false;
  }
};

/**
 * Get stored session ID
 * Used for session identification and recovery
 */
export const getStoredSessionId = (): string | null => {
  try {
    const sessionData = loadSessionData();
    return sessionData?.sessionId || null;
  } catch (error) {
    console.warn('Failed to get stored session ID:', error);
    return null;
  }
};