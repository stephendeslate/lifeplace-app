/**
 * Security Provider
 *
 * Wraps the app with security initialization and protection.
 * Handles:
 * - SSL certificate pinning initialization
 * - Root/jailbreak detection
 * - Biometric lock screen on app resume
 * - Session timeout management
 *
 * IMPORTANT: Must wrap all other providers in the app.
 *
 * Phase 13: Security Hardening
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { initSSLPinning } from '@/utils/sslPinning';
import {
  initSecurityChecks,
  getSecurityStatus,
  type ThreatType,
} from '@/services/securityChecks';
import { BiometricService } from '@/services/biometrics';
import { SecurityBlockedScreen } from '@/components/security/SecurityBlockedScreen';
import { BiometricLockScreen } from '@/components/security/BiometricLockScreen';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { useAuthStore } from '@/stores/authStore';

// =============================================================================
// TYPES
// =============================================================================

interface SecurityContextValue {
  /** Whether security initialization is complete */
  isInitialized: boolean;
  /** Whether the app is blocked due to security threats */
  isBlocked: boolean;
  /** Whether the app is locked and requires biometric unlock */
  isLocked: boolean;
  /** List of detected security threats */
  threats: ThreatType[];
  /** Manually lock the app (requires biometric to unlock) */
  lockApp: () => void;
  /** Called after successful biometric unlock */
  unlockApp: () => void;
}

// =============================================================================
// CONTEXT
// =============================================================================

const SecurityContext = createContext<SecurityContextValue | undefined>(
  undefined
);

// =============================================================================
// PROVIDER
// =============================================================================

interface SecurityProviderProps {
  children: ReactNode;
}

export function SecurityProvider({ children }: SecurityProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [threats, setThreats] = useState<ThreatType[]>([]);

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  useEffect(() => {
    const initSecurity = async () => {
      try {
        // Initialize SSL pinning
        await initSSLPinning();

        // Initialize security checks (root/jailbreak detection)
        await initSecurityChecks();

        // Allow time for threat detection callbacks to fire
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Check security status
        const status = getSecurityStatus();

        if (status.shouldBlockApp) {
          setIsBlocked(true);
          setThreats(status.threats);
        }
      } catch (error) {
        console.error('[Security] Initialization error:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    initSecurity();
  }, []);

  // ==========================================================================
  // APP STATE HANDLING (Biometric Lock)
  // ==========================================================================

  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      // App returning from background
      if (
        previousState.match(/inactive|background/) &&
        nextState === 'active' &&
        isAuthenticated
      ) {
        // Check if biometric lock is enabled
        const biometricEnabled = await BiometricService.isEnabled();

        if (biometricEnabled) {
          setIsLocked(true);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => subscription.remove();
  }, [isAuthenticated]);

  // ==========================================================================
  // LOCK/UNLOCK HANDLERS
  // ==========================================================================

  const lockApp = useCallback(() => {
    if (isAuthenticated) {
      setIsLocked(true);
    }
  }, [isAuthenticated]);

  const unlockApp = useCallback(() => {
    setIsLocked(false);
  }, []);

  const handleLogout = useCallback(() => {
    setIsLocked(false);
    clearAuth();
  }, [clearAuth]);

  // ==========================================================================
  // CONTEXT VALUE
  // ==========================================================================

  const contextValue: SecurityContextValue = {
    isInitialized,
    isBlocked,
    isLocked,
    threats,
    lockApp,
    unlockApp,
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  // Show loading while initializing
  if (!isInitialized) {
    return <LoadingScreen message="Initializing security..." />;
  }

  // Show blocked screen if security threats detected
  if (isBlocked) {
    return <SecurityBlockedScreen threats={threats} />;
  }

  // Show biometric lock screen if app is locked
  if (isLocked && isAuthenticated) {
    return (
      <BiometricLockScreen onUnlock={unlockApp} onLogout={handleLogout} />
    );
  }

  return (
    <SecurityContext.Provider value={contextValue}>
      {children}
    </SecurityContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useSecurity(): SecurityContextValue {
  const context = useContext(SecurityContext);

  if (context === undefined) {
    throw new Error('useSecurity must be used within SecurityProvider');
  }

  return context;
}

export default SecurityProvider;
