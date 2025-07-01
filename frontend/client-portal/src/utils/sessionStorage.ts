// frontend/client-portal/src/utils/sessionStorage.ts

import type { SessionStepData } from '../types/bookingflow.types';

// Session metadata interface
export interface SessionMetadata {
  flowId: number;
  flowName: string;
  startedAt: string;
  lastAccessedAt?: string;
  userAgent?: string;
}

// Storage keys for session data
const STORAGE_KEYS = {
  SESSION_PREFIX: 'lifeplace_booking_session_',
  METADATA_SUFFIX: '_metadata',
  STEP_DATA_SUFFIX: '_step_data',
  NAVIGATION_SUFFIX: '_navigation',
  VALIDATION_SUFFIX: '_validation',
  AUTO_SAVE_SUFFIX: '_autosave',
} as const;

// Session storage utility class
class BookingSessionStorage {
  /**
   * Generate storage key for session data
   */
  private getSessionKey(sessionId: string, suffix: string = ''): string {
    return `${STORAGE_KEYS.SESSION_PREFIX}${sessionId}${suffix}`;
  }

  /**
   * Safely parse JSON from sessionStorage
   */
  private safeJsonParse<T>(value: string | null, fallback: T): T {
    if (!value) return fallback;
    
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn('Failed to parse JSON from sessionStorage:', error);
      return fallback;
    }
  }

  /**
   * Safely stringify and store JSON in sessionStorage
   */
  private safeJsonStringify<T>(key: string, value: T): void {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to store item in sessionStorage:', error);
      // Handle storage quota exceeded
      if (error instanceof DOMException && error.code === 22) {
        this.clearOldSessions();
        // Try again after cleanup
        try {
          sessionStorage.setItem(key, JSON.stringify(value));
        } catch (retryError) {
          console.error('Failed to store item even after cleanup:', retryError);
        }
      }
    }
  }

  /**
   * Save session metadata
   */
  saveSessionMetadata(sessionId: string, metadata: SessionMetadata): void {
    const key = this.getSessionKey(sessionId, STORAGE_KEYS.METADATA_SUFFIX);
    const metadataWithTimestamp = {
      ...metadata,
      lastAccessedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };
    this.safeJsonStringify(key, metadataWithTimestamp);
  }

  /**
   * Get session metadata
   */
  getSessionMetadata(sessionId: string): SessionMetadata | null {
    const key = this.getSessionKey(sessionId, STORAGE_KEYS.METADATA_SUFFIX);
    const metadata = sessionStorage.getItem(key);
    return this.safeJsonParse(metadata, null);
  }

  /**
   * Update last accessed time for session
   */
  touchSession(sessionId: string): void {
    const metadata = this.getSessionMetadata(sessionId);
    if (metadata) {
      this.saveSessionMetadata(sessionId, {
        ...metadata,
        lastAccessedAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Save step data for a specific step
   */
  saveStepData(sessionId: string, stepIndex: number, data: SessionStepData): void {
    const key = this.getSessionKey(sessionId, STORAGE_KEYS.STEP_DATA_SUFFIX);
    const allStepData = this.getAllStepData(sessionId) || {};
    
    allStepData[stepIndex] = {
      ...allStepData[stepIndex],
      ...data,
      savedAt: new Date().toISOString(),
    };
    
    this.safeJsonStringify(key, allStepData);
    this.touchSession(sessionId);
  }

  /**
   * Get step data for a specific step
   */
  getStepData(sessionId: string, stepIndex: number): SessionStepData | null {
    const allStepData = this.getAllStepData(sessionId);
    return allStepData?.[stepIndex] || null;
  }

  /**
   * Get all step data for a session
   */
  getAllStepData(sessionId: string): Record<number, SessionStepData> | null {
    const key = this.getSessionKey(sessionId, STORAGE_KEYS.STEP_DATA_SUFFIX);
    const stepData = sessionStorage.getItem(key);
    return this.safeJsonParse(stepData, null);
  }

  /**
   * Save navigation state
   */
  saveNavigationState(sessionId: string, state: {
    currentStepIndex: number;
    completedStepIds: number[];
    lastNavigatedAt: string;
  }): void {
    const key = this.getSessionKey(sessionId, STORAGE_KEYS.NAVIGATION_SUFFIX);
    this.safeJsonStringify(key, state);
    this.touchSession(sessionId);
  }

  /**
   * Get navigation state
   */
  getNavigationState(sessionId: string): {
    currentStepIndex: number;
    completedStepIds: number[];
    lastNavigatedAt: string;
  } | null {
    const key = this.getSessionKey(sessionId, STORAGE_KEYS.NAVIGATION_SUFFIX);
    const navState = sessionStorage.getItem(key);
    return this.safeJsonParse(navState, null);
  }

  /**
   * Save validation errors for current step
   */
  saveValidationErrors(sessionId: string, stepIndex: number, errors: Record<string, string[]>): void {
    const key = this.getSessionKey(sessionId, STORAGE_KEYS.VALIDATION_SUFFIX);
    const allValidationData = this.getAllValidationErrors(sessionId) || {};
    
    allValidationData[stepIndex] = {
      errors,
      savedAt: new Date().toISOString(),
    };
    
    this.safeJsonStringify(key, allValidationData);
  }

  /**
   * Get validation errors for a specific step
   */
  getValidationErrors(sessionId: string, stepIndex: number): Record<string, string[]> | null {
    const allValidationData = this.getAllValidationErrors(sessionId);
    return allValidationData?.[stepIndex]?.errors || null;
  }

  /**
   * Get all validation errors for a session
   */
  getAllValidationErrors(sessionId: string): Record<number, {
    errors: Record<string, string[]>;
    savedAt: string;
  }> | null {
    const key = this.getSessionKey(sessionId, STORAGE_KEYS.VALIDATION_SUFFIX);
    const validationData = sessionStorage.getItem(key);
    return this.safeJsonParse(validationData, null);
  }

  /**
   * Save auto-save checkpoint
   */
  saveAutoSaveCheckpoint(sessionId: string, data: {
    stepIndex: number;
    stepData: SessionStepData;
    timestamp: string;
    isValid: boolean;
  }): void {
    const key = this.getSessionKey(sessionId, STORAGE_KEYS.AUTO_SAVE_SUFFIX);
    this.safeJsonStringify(key, data);
  }

  /**
   * Get auto-save checkpoint
   */
  getAutoSaveCheckpoint(sessionId: string): {
    stepIndex: number;
    stepData: SessionStepData;
    timestamp: string;
    isValid: boolean;
  } | null {
    const key = this.getSessionKey(sessionId, STORAGE_KEYS.AUTO_SAVE_SUFFIX);
    const checkpoint = sessionStorage.getItem(key);
    return this.safeJsonParse(checkpoint, null);
  }

  /**
   * Clear all data for a specific session
   */
  clearSession(sessionId: string): void {
    const suffixes = [
      STORAGE_KEYS.METADATA_SUFFIX,
      STORAGE_KEYS.STEP_DATA_SUFFIX,
      STORAGE_KEYS.NAVIGATION_SUFFIX,
      STORAGE_KEYS.VALIDATION_SUFFIX,
      STORAGE_KEYS.AUTO_SAVE_SUFFIX,
    ];

    suffixes.forEach(suffix => {
      const key = this.getSessionKey(sessionId, suffix);
      sessionStorage.removeItem(key);
    });
  }

  /**
   * Get all active session IDs
   */
  getAllSessionIds(): string[] {
    const sessionIds: string[] = [];
    const prefix = STORAGE_KEYS.SESSION_PREFIX;
    const metadataSuffix = STORAGE_KEYS.METADATA_SUFFIX;

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(prefix) && key.endsWith(metadataSuffix)) {
        // Extract session ID from key
        const sessionId = key
          .replace(prefix, '')
          .replace(metadataSuffix, '');
        sessionIds.push(sessionId);
      }
    }

    return sessionIds;
  }

  /**
   * Get session summary information
   */
  getSessionSummary(sessionId: string): {
    metadata: SessionMetadata | null;
    stepCount: number;
    lastModified: string | null;
    dataSize: number;
  } {
    const metadata = this.getSessionMetadata(sessionId);
    const stepData = this.getAllStepData(sessionId);
    const stepCount = stepData ? Object.keys(stepData).length : 0;
    
    // Calculate approximate data size
    let dataSize = 0;
    const suffixes = [
      STORAGE_KEYS.METADATA_SUFFIX,
      STORAGE_KEYS.STEP_DATA_SUFFIX,
      STORAGE_KEYS.NAVIGATION_SUFFIX,
      STORAGE_KEYS.VALIDATION_SUFFIX,
      STORAGE_KEYS.AUTO_SAVE_SUFFIX,
    ];

    suffixes.forEach(suffix => {
      const key = this.getSessionKey(sessionId, suffix);
      const value = sessionStorage.getItem(key);
      if (value) {
        dataSize += value.length;
      }
    });

    // Find last modified time from step data
    let lastModified: string | null = null;
    if (stepData) {
      const allTimes = Object.values(stepData)
        .map(data => (data as any).savedAt)
        .filter(Boolean) as string[];
      if (allTimes.length > 0) {
        lastModified = allTimes.sort().pop() || null;
      }
    }

    return {
      metadata,
      stepCount,
      lastModified,
      dataSize,
    };
  }

  /**
   * Clear old sessions to free up storage space
   */
  clearOldSessions(maxAge: number = 24 * 60 * 60 * 1000): number {
    const now = new Date().getTime();
    const sessionIds = this.getAllSessionIds();
    let clearedCount = 0;

    sessionIds.forEach(sessionId => {
      const metadata = this.getSessionMetadata(sessionId);
      if (metadata?.lastAccessedAt) {
        const lastAccessed = new Date(metadata.lastAccessedAt).getTime();
        if (now - lastAccessed > maxAge) {
          this.clearSession(sessionId);
          clearedCount++;
        }
      }
    });

    return clearedCount;
  }

  /**
   * Clear all booking sessions
   */
  clearAllSessions(): void {
    const sessionIds = this.getAllSessionIds();
    sessionIds.forEach(sessionId => {
      this.clearSession(sessionId);
    });
  }

  /**
   * Export session data for debugging or support
   */
  exportSessionData(sessionId: string): {
    sessionId: string;
    metadata: SessionMetadata | null;
    stepData: Record<number, SessionStepData> | null;
    navigationState: {
      currentStepIndex: number;
      completedStepIds: number[];
      lastNavigatedAt: string;
    } | null;
    validationErrors: Record<number, {
      errors: Record<string, string[]>;
      savedAt: string;
    }> | null;
    autoSaveCheckpoint: {
      stepIndex: number;
      stepData: SessionStepData;
      timestamp: string;
      isValid: boolean;
    } | null;
    exportedAt: string;
  } {
    return {
      sessionId,
      metadata: this.getSessionMetadata(sessionId),
      stepData: this.getAllStepData(sessionId),
      navigationState: this.getNavigationState(sessionId),
      validationErrors: this.getAllValidationErrors(sessionId),
      autoSaveCheckpoint: this.getAutoSaveCheckpoint(sessionId),
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Import session data (for debugging or recovery)
   */
  importSessionData(data: {
    sessionId: string;
    metadata: SessionMetadata | null;
    stepData: Record<number, SessionStepData> | null;
    navigationState: {
      currentStepIndex: number;
      completedStepIds: number[];
      lastNavigatedAt: string;
    } | null;
    validationErrors: Record<number, {
      errors: Record<string, string[]>;
      savedAt: string;
    }> | null;
    autoSaveCheckpoint: {
      stepIndex: number;
      stepData: SessionStepData;
      timestamp: string;
      isValid: boolean;
    } | null;
  }): boolean {
    try {
      const { sessionId } = data;

      if (data.metadata) {
        this.saveSessionMetadata(sessionId, data.metadata);
      }

      if (data.stepData) {
        const key = this.getSessionKey(sessionId, STORAGE_KEYS.STEP_DATA_SUFFIX);
        this.safeJsonStringify(key, data.stepData);
      }

      if (data.navigationState) {
        const key = this.getSessionKey(sessionId, STORAGE_KEYS.NAVIGATION_SUFFIX);
        this.safeJsonStringify(key, data.navigationState);
      }

      if (data.validationErrors) {
        const key = this.getSessionKey(sessionId, STORAGE_KEYS.VALIDATION_SUFFIX);
        this.safeJsonStringify(key, data.validationErrors);
      }

      if (data.autoSaveCheckpoint) {
        const key = this.getSessionKey(sessionId, STORAGE_KEYS.AUTO_SAVE_SUFFIX);
        this.safeJsonStringify(key, data.autoSaveCheckpoint);
      }

      return true;
    } catch (error) {
      console.error('Failed to import session data:', error);
      return false;
    }
  }

  /**
   * Check if storage is available and working
   */
  isStorageAvailable(): boolean {
    try {
      const test = '__booking_session_storage_test__';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get storage usage information
   */
  getStorageInfo(): {
    isAvailable: boolean;
    totalSessions: number;
    totalSize: number;
    oldestSession: string | null;
    newestSession: string | null;
  } {
    if (!this.isStorageAvailable()) {
      return {
        isAvailable: false,
        totalSessions: 0,
        totalSize: 0,
        oldestSession: null,
        newestSession: null,
      };
    }

    const sessionIds = this.getAllSessionIds();
    let totalSize = 0;
    let oldestTime = Infinity;
    let newestTime = 0;
    let oldestSession: string | null = null;
    let newestSession: string | null = null;

    sessionIds.forEach(sessionId => {
      const summary = this.getSessionSummary(sessionId);
      totalSize += summary.dataSize;

      if (summary.metadata?.lastAccessedAt) {
        const time = new Date(summary.metadata.lastAccessedAt).getTime();
        if (time < oldestTime) {
          oldestTime = time;
          oldestSession = sessionId;
        }
        if (time > newestTime) {
          newestTime = time;
          newestSession = sessionId;
        }
      }
    });

    return {
      isAvailable: true,
      totalSessions: sessionIds.length,
      totalSize,
      oldestSession,
      newestSession,
    };
  }

  /**
   * Validate session data integrity
   */
  validateSessionData(sessionId: string): {
    isValid: boolean;
    issues: string[];
    metadata: SessionMetadata | null;
  } {
    const issues: string[] = [];
    const metadata = this.getSessionMetadata(sessionId);

    if (!metadata) {
      issues.push('Missing session metadata');
      return { isValid: false, issues, metadata: null };
    }

    // Check if session is too old
    if (metadata.lastAccessedAt) {
      const lastAccessed = new Date(metadata.lastAccessedAt);
      const now = new Date();
      const hoursSinceAccess = (now.getTime() - lastAccessed.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceAccess > 24) {
        issues.push('Session is older than 24 hours');
      }
    }

    // Check step data consistency
    const stepData = this.getAllStepData(sessionId);
    if (stepData) {
      const stepIndexes = Object.keys(stepData).map(Number);
      if (stepIndexes.length > 1) {
        stepIndexes.sort((a, b) => a - b);
        const hasGaps = stepIndexes.some((index, i) => {
          return i > 0 && index !== stepIndexes[i - 1] + 1;
        });
        
        if (hasGaps) {
          issues.push('Step data has gaps in sequence');
        }
      }
    }

    // Check navigation state
    const navState = this.getNavigationState(sessionId);
    if (navState && stepData) {
      const maxStepIndex = Math.max(...Object.keys(stepData).map(Number));
      if (navState.currentStepIndex > maxStepIndex) {
        issues.push('Current step index is beyond available step data');
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      metadata,
    };
  }

  /**
   * Merge step data from multiple sources (useful for recovery)
   */
  mergeStepData(sessionId: string, newStepData: Record<number, SessionStepData>): void {
    const existingData = this.getAllStepData(sessionId) || {};
    const mergedData = { ...existingData };

    Object.entries(newStepData).forEach(([stepIndex, data]) => {
      const index = Number(stepIndex);
      mergedData[index] = {
        ...mergedData[index],
        ...data,
        mergedAt: new Date().toISOString(),
      };
    });

    const key = this.getSessionKey(sessionId, STORAGE_KEYS.STEP_DATA_SUFFIX);
    this.safeJsonStringify(key, mergedData);
    this.touchSession(sessionId);
  }

  /**
   * Create a backup of session data
   */
  createBackup(sessionId: string): string {
    const exportData = this.exportSessionData(sessionId);
    return JSON.stringify(exportData);
  }

  /**
   * Restore session from backup
   */
  restoreFromBackup(backupData: string): boolean {
    try {
      const data = JSON.parse(backupData);
      return this.importSessionData(data);
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      return false;
    }
  }
}

// Export singleton instance with a distinct name to avoid conflict with global sessionStorage
export const bookingSessionStorage = new BookingSessionStorage();

// Export the class for potential extension
export { BookingSessionStorage };

// Export types and constants
export { STORAGE_KEYS };