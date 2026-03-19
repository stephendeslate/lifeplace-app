// frontend/client-portal/src/apis/booking/session-storage.ts

import { getServerNow } from '../../utils/serverClock';

/**
 * Local storage helpers for booking session persistence
 */
export class BookingSessionStorage {
  /**
   * Check if session is expired (uses server-adjusted clock)
   */
  private static isSessionExpired(expiresAt: string): boolean {
    return new Date(expiresAt).getTime() <= getServerNow();
  }

  /**
   * Save session data to local storage
   */
  static saveSessionToLocal(sessionId: string, sessionData: Record<string, unknown>): void {
    try {
      const storageKey = `booking_session_${sessionId}`;
      const dataToStore = {
        ...sessionData,
        lastSaved: new Date().toISOString(),
      };
      localStorage.setItem(storageKey, JSON.stringify(dataToStore));
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Failed to save session to local storage:', error);
    }
  }

  /**
   * Load session from local storage
   */
  static loadSessionFromLocal(sessionId: string): Record<string, unknown> | null {
    try {
      const storageKey = `booking_session_${sessionId}`;
      const storedData = localStorage.getItem(storageKey);

      if (!storedData) {
        return null;
      }

      const sessionData = JSON.parse(storedData);

      // Check if session is expired
      if (
        sessionData.expires_at &&
        BookingSessionStorage.isSessionExpired(sessionData.expires_at)
      ) {
        BookingSessionStorage.clearSessionFromLocal(sessionId);
        return null;
      }

      return sessionData;
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Failed to load session from local storage:', error);
      return null;
    }
  }

  /**
   * Clear session from local storage
   */
  static clearSessionFromLocal(sessionId: string): void {
    try {
      const storageKey = `booking_session_${sessionId}`;
      localStorage.removeItem(storageKey);
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Failed to clear session from local storage:', error);
    }
  }

  /**
   * Clean up expired sessions from local storage
   */
  static cleanupExpiredSessions(): void {
    try {
      const keys = Object.keys(localStorage);
      const sessionKeys = keys.filter((key) => key.startsWith('booking_session_'));

      sessionKeys.forEach((key) => {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.expires_at && BookingSessionStorage.isSessionExpired(data.expires_at)) {
            localStorage.removeItem(key);
          }
        } catch {
          // Remove invalid data
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Failed to cleanup expired sessions:', error);
    }
  }

  /**
   * Clear ALL booking sessions from local storage
   * Used when user clicks "Start Over" to ensure a clean slate
   */
  static clearAllSessionsFromLocal(): void {
    try {
      const keys = Object.keys(localStorage);
      const sessionKeys = keys.filter((key) => key.startsWith('booking_session_'));
      sessionKeys.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      if (import.meta.env.DEV)
        console.warn('Failed to clear all sessions from local storage:', error);
    }
  }
}
