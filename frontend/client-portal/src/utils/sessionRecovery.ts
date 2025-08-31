// frontend/client-portal/src/utils/sessionRecovery.ts

import React from 'react';

interface BookingSessionData {
  id: string;
  created_at: string;
  last_updated: string;
  current_step: string;
  current_step_index: number;
  completed_steps: string[];
  step_data: Record<string, unknown>;
  flow_id?: string;
  user_id?: string;
  expires_at: string;
}

interface SessionRecoveryOptions {
  maxSessionAge?: number; // milliseconds (default: 1 hour)
  autoSaveInterval?: number; // milliseconds (default: 30 seconds)
  storageKey?: string;
}

class SessionRecoveryManager {
  private storageKey: string;
  private maxSessionAge: number;
  private autoSaveInterval: number;
  private autoSaveTimer?: NodeJS.Timeout;

  constructor(options: SessionRecoveryOptions = {}) {
    this.storageKey = options.storageKey || 'lifeplace_booking_session';
    this.maxSessionAge = options.maxSessionAge || 60 * 60 * 1000; // 1 hour
    this.autoSaveInterval = options.autoSaveInterval || 30 * 1000; // 30 seconds
  }

  /**
   * Save current booking session data
   */
  saveSession(sessionData: Omit<BookingSessionData, 'last_updated' | 'expires_at'>): void {
    try {
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + this.maxSessionAge).toISOString();
      
      const fullSessionData: BookingSessionData = {
        ...sessionData,
        last_updated: now,
        expires_at: expiresAt,
      };

      localStorage.setItem(this.storageKey, JSON.stringify(fullSessionData));
      
      // Also save to sessionStorage as backup
      sessionStorage.setItem(this.storageKey + '_backup', JSON.stringify(fullSessionData));
      
      console.log('Booking session saved:', sessionData.current_step);
    } catch (error) {
      console.warn('Failed to save booking session:', error);
    }
  }

  /**
   * Load saved booking session data
   */
  loadSession(): BookingSessionData | null {
    try {
      // Try localStorage first
      let sessionDataStr = localStorage.getItem(this.storageKey);
      
      // Fallback to sessionStorage
      if (!sessionDataStr) {
        sessionDataStr = sessionStorage.getItem(this.storageKey + '_backup');
      }

      if (!sessionDataStr) {
        return null;
      }

      const sessionData: BookingSessionData = JSON.parse(sessionDataStr);
      
      // Check if session is expired
      if (this.isSessionExpired(sessionData)) {
        this.clearSession();
        return null;
      }

      return sessionData;
    } catch (error) {
      console.warn('Failed to load booking session:', error);
      this.clearSession(); // Clear corrupted data
      return null;
    }
  }

  /**
   * Check if there's a recoverable session
   */
  hasRecoverableSession(): boolean {
    const session = this.loadSession();
    return session !== null && !this.isSessionExpired(session);
  }

  /**
   * Check if session is expired
   */
  private isSessionExpired(session: BookingSessionData): boolean {
    const now = new Date();
    const expiresAt = new Date(session.expires_at);
    const createdAt = new Date(session.created_at);
    
    // Session expired by time
    if (now > expiresAt) {
      return true;
    }
    
    // Session too old (beyond max age)
    if (now.getTime() - createdAt.getTime() > this.maxSessionAge) {
      return true;
    }

    return false;
  }

  /**
   * Clear saved session data
   */
  clearSession(): void {
    try {
      localStorage.removeItem(this.storageKey);
      sessionStorage.removeItem(this.storageKey + '_backup');
      console.log('Booking session cleared');
    } catch (error) {
      console.warn('Failed to clear booking session:', error);
    }
  }

  /**
   * Start auto-save functionality
   */
  startAutoSave(getCurrentData: () => Omit<BookingSessionData, 'last_updated' | 'expires_at'>): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(() => {
      try {
        const currentData = getCurrentData();
        if (currentData && currentData.step_data && Object.keys(currentData.step_data).length > 0) {
          this.saveSession(currentData);
        }
      } catch (error) {
        console.warn('Auto-save failed:', error);
      }
    }, this.autoSaveInterval);

    console.log('Auto-save started with interval:', this.autoSaveInterval, 'ms');
  }

  /**
   * Stop auto-save functionality
   */
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = undefined;
      console.log('Auto-save stopped');
    }
  }

  /**
   * Get session recovery info for user display
   */
  getRecoveryInfo(): {
    canRecover: boolean;
    lastUpdated?: string;
    currentStep?: string;
    progressPercentage?: number;
    totalSteps?: number;
  } {
    const session = this.loadSession();
    
    if (!session) {
      return { canRecover: false };
    }

    const progressPercentage = session.completed_steps.length > 0 
      ? Math.round((session.completed_steps.length / (session.current_step_index + 1)) * 100)
      : 0;

    return {
      canRecover: true,
      lastUpdated: session.last_updated,
      currentStep: session.current_step,
      progressPercentage,
      totalSteps: session.current_step_index + 1,
    };
  }

  /**
   * Generate unique session ID
   */
  generateSessionId(): string {
    return `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check browser support for storage
   */
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

  /**
   * Handle page unload - save current state
   */
  setupUnloadHandler(getCurrentData: () => Omit<BookingSessionData, 'last_updated' | 'expires_at'>): () => void {
    const handleUnload = () => {
      try {
        const currentData = getCurrentData();
        if (currentData && currentData.step_data && Object.keys(currentData.step_data).length > 0) {
          this.saveSession(currentData);
        }
      } catch (error) {
        console.warn('Failed to save on unload:', error);
      }
    };

    // Save on page unload
    window.addEventListener('beforeunload', handleUnload);
    
    // Save on visibility change (tab switch, minimize)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        handleUnload();
      }
    });

    // Save on page hide (mobile browsers)
    window.addEventListener('pagehide', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      document.removeEventListener('visibilitychange', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }
}

// Export singleton instance
export const sessionRecovery = new SessionRecoveryManager();

// React hook for session recovery
export const useSessionRecovery = () => {
  const [recoveryInfo, setRecoveryInfo] = React.useState(sessionRecovery.getRecoveryInfo());

  React.useEffect(() => {
    // Update recovery info when component mounts
    setRecoveryInfo(sessionRecovery.getRecoveryInfo());
  }, []);

  const saveSession = React.useCallback((sessionData: Omit<BookingSessionData, 'last_updated' | 'expires_at'>) => {
    sessionRecovery.saveSession(sessionData);
    setRecoveryInfo(sessionRecovery.getRecoveryInfo());
  }, []);

  const loadSession = React.useCallback(() => {
    return sessionRecovery.loadSession();
  }, []);

  const clearSession = React.useCallback(() => {
    sessionRecovery.clearSession();
    setRecoveryInfo({ canRecover: false });
  }, []);

  return {
    recoveryInfo,
    saveSession,
    loadSession,
    clearSession,
    hasRecoverableSession: recoveryInfo.canRecover,
  };
};

export type { BookingSessionData };