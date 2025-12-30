/**
 * Session Timeout Hook
 *
 * Monitors user activity and automatically logs out after inactivity.
 * Uses AppState to detect when app goes to background/foreground.
 *
 * Phase 13: Security Hardening
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { useAuthContext } from '@/contexts/AuthContext';
import {
  SESSION_TIMEOUT_MS,
  SESSION_WARNING_MS,
  LAST_ACTIVITY_KEY,
  SESSION_CHECK_INTERVAL_MS,
} from '@/constants/session';

// =============================================================================
// TYPES
// =============================================================================

interface SessionTimeoutConfig {
  /** Timeout duration in milliseconds (default: 30 minutes) */
  timeoutMs?: number;
  /** Time before timeout to show warning in milliseconds (default: 5 minutes) */
  warningMs?: number;
  /** Callback when warning should be shown */
  onWarning?: (remainingMs: number) => void;
  /** Callback when session times out */
  onTimeout?: () => void;
  /** Enable/disable session timeout (default: true) */
  enabled?: boolean;
}

interface SessionTimeoutReturn {
  /** Call this to update last activity timestamp */
  updateActivity: () => Promise<void>;
  /** Manually check if session has timed out */
  checkSession: () => Promise<boolean>;
  /** Get remaining session time in milliseconds */
  getRemainingTime: () => Promise<number>;
}

// =============================================================================
// HOOK
// =============================================================================

export function useSessionTimeout(
  config: SessionTimeoutConfig = {}
): SessionTimeoutReturn {
  const {
    timeoutMs = SESSION_TIMEOUT_MS,
    warningMs = SESSION_WARNING_MS,
    onWarning,
    onTimeout,
    enabled = true,
  } = config;

  const { isAuthenticated, logout } = useAuthContext();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const warningShownRef = useRef(false);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Update the last activity timestamp
   */
  const updateActivity = useCallback(async () => {
    if (!enabled || !isAuthenticated) return;

    try {
      await SecureStore.setItemAsync(LAST_ACTIVITY_KEY, Date.now().toString());
      warningShownRef.current = false;
    } catch (error) {
      console.error('Failed to update activity timestamp:', error);
    }
  }, [enabled, isAuthenticated]);

  /**
   * Get the remaining session time in milliseconds
   */
  const getRemainingTime = useCallback(async (): Promise<number> => {
    try {
      const lastActivity = await SecureStore.getItemAsync(LAST_ACTIVITY_KEY);
      if (!lastActivity) return timeoutMs;

      const elapsed = Date.now() - parseInt(lastActivity, 10);
      return Math.max(0, timeoutMs - elapsed);
    } catch {
      return timeoutMs;
    }
  }, [timeoutMs]);

  /**
   * Check if session has timed out
   * Returns true if session is still valid, false if timed out
   */
  const checkSession = useCallback(async (): Promise<boolean> => {
    if (!enabled || !isAuthenticated) return true;

    try {
      const lastActivity = await SecureStore.getItemAsync(LAST_ACTIVITY_KEY);
      if (!lastActivity) {
        // No activity recorded, update it now
        await updateActivity();
        return true;
      }

      const elapsed = Date.now() - parseInt(lastActivity, 10);
      const remaining = timeoutMs - elapsed;

      // Session has timed out
      if (remaining <= 0) {
        onTimeout?.();
        await logout();
        // Clear the activity timestamp
        await SecureStore.deleteItemAsync(LAST_ACTIVITY_KEY);
        return false;
      }

      // Show warning if within warning period
      if (remaining <= warningMs && !warningShownRef.current) {
        warningShownRef.current = true;
        onWarning?.(remaining);
      }

      return true;
    } catch (error) {
      console.error('Session check failed:', error);
      return true; // Fail open to avoid locking out users
    }
  }, [enabled, isAuthenticated, timeoutMs, warningMs, onTimeout, onWarning, logout, updateActivity]);

  /**
   * Handle app state changes
   */
  useEffect(() => {
    if (!enabled) return;

    const subscription = AppState.addEventListener('change', async (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      // App coming to foreground
      if (previousState.match(/inactive|background/) && nextState === 'active') {
        await checkSession();
      }

      // App going to background - save current activity
      if (nextState.match(/inactive|background/) && previousState === 'active') {
        await updateActivity();
      }
    });

    return () => subscription.remove();
  }, [enabled, checkSession, updateActivity]);

  /**
   * Periodic session check while app is in foreground
   */
  useEffect(() => {
    if (!enabled || !isAuthenticated) {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      return;
    }

    // Check periodically while app is active
    checkIntervalRef.current = setInterval(() => {
      if (AppState.currentState === 'active') {
        checkSession();
      }
    }, SESSION_CHECK_INTERVAL_MS);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [enabled, isAuthenticated, checkSession]);

  /**
   * Initialize activity timestamp on mount
   */
  useEffect(() => {
    if (enabled && isAuthenticated) {
      updateActivity();
    }
  }, [enabled, isAuthenticated, updateActivity]);

  /**
   * Clear activity timestamp on logout
   */
  useEffect(() => {
    if (!isAuthenticated) {
      SecureStore.deleteItemAsync(LAST_ACTIVITY_KEY).catch(() => {});
    }
  }, [isAuthenticated]);

  return {
    updateActivity,
    checkSession,
    getRemainingTime,
  };
}

export default useSessionTimeout;
