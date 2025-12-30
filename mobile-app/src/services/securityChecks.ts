/**
 * Security Checks Service
 *
 * Detects compromised devices (root/jailbreak) and security threats.
 * Uses freeRASP for comprehensive security monitoring.
 *
 * IMPORTANT: Requires EAS development build (not Expo Go)
 *
 * Phase 13: Security Hardening
 */

import { securityLogger as logger } from '@/utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export type ThreatType =
  | 'privilegedAccess'
  | 'hooks'
  | 'appIntegrity'
  | 'simulator'
  | 'debug'
  | 'deviceBinding'
  | 'unofficialStore'
  | 'secureHardwareNotAvailable'
  | 'passcode'
  | 'obfuscationIssues';

export interface SecurityStatus {
  isSecure: boolean;
  threats: ThreatType[];
  shouldBlockApp: boolean;
  isInitialized: boolean;
}

// =============================================================================
// STATE
// =============================================================================

/**
 * List of threats that should block app usage
 */
const CRITICAL_THREATS: ThreatType[] = [
  'privilegedAccess', // Root/Jailbreak
  'hooks', // Frida, Xposed, etc.
  'appIntegrity', // App has been tampered
];

/**
 * Detected threats during runtime
 */
let detectedThreats: ThreatType[] = [];

/**
 * Whether security checks have been initialized
 */
let isInitialized = false;

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * freeRASP configuration
 *
 * TODO: Update with actual signing certificate hash and team ID
 */
const getSecurityConfig = () => ({
  androidConfig: {
    packageName: 'com.lifeplace.app',
    certificateHashes: ['YOUR_SIGNING_CERTIFICATE_HASH'], // Get from: keytool -printcert -jarfile app.aab
    supportedAlternativeStores: ['com.sec.android.app.samsungapps'],
  },
  iosConfig: {
    appBundleId: 'com.lifeplace.app',
    appTeamId: 'YOUR_TEAM_ID', // Get from Apple Developer Portal
  },
  watcherMail: 'security@lifeplace.com',
  isProd: !__DEV__,
});

// =============================================================================
// THREAT HANDLERS
// =============================================================================

/**
 * Create threat callback handlers for freeRASP
 */
function createThreatCallbacks() {
  return {
    // Critical threats - block app
    privilegedAccess: () => {
      detectedThreats.push('privilegedAccess');
      logger.warn('Device is rooted/jailbroken');
    },
    hooks: () => {
      detectedThreats.push('hooks');
      logger.warn('Hooking framework detected (Frida, Xposed, etc.)');
    },
    appIntegrity: () => {
      detectedThreats.push('appIntegrity');
      logger.warn('App integrity compromised');
    },

    // Warning threats - log but allow
    simulator: () => {
      detectedThreats.push('simulator');
      logger.warn('Running on simulator/emulator');
    },
    debug: () => {
      detectedThreats.push('debug');
      logger.warn('App is being debugged');
    },
    deviceBinding: () => {
      detectedThreats.push('deviceBinding');
      logger.warn('Device binding issue');
    },
    unofficialStore: () => {
      detectedThreats.push('unofficialStore');
      logger.warn('App installed from unofficial store');
    },

    // Info threats - log only
    secureHardwareNotAvailable: () => {
      detectedThreats.push('secureHardwareNotAvailable');
      logger.warn('Secure hardware not available');
    },
    passcode: () => {
      detectedThreats.push('passcode');
      logger.warn('Device passcode not set');
    },
    obfuscationIssues: () => {
      detectedThreats.push('obfuscationIssues');
      logger.warn('Obfuscation issues detected');
    },
  };
}

// =============================================================================
// SERVICE
// =============================================================================

/**
 * Initialize security checks.
 *
 * Should be called early in app initialization.
 * Skipped in development mode.
 */
export async function initSecurityChecks(): Promise<void> {
  // Skip in development
  if (__DEV__) {
    logger.debug('Checks skipped in development mode');
    isInitialized = true;
    return;
  }

  try {
    // Dynamic import to avoid issues when not installed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Talsec = (await import('freerasp-react-native')) as any;

    const config = getSecurityConfig();
    const callbacks = createThreatCallbacks();

    // Use the default export's start method (API varies by version)
    if (Talsec.default?.start) {
      await Talsec.default.start(config, callbacks);
    } else if (Talsec.start) {
      await Talsec.start(config, callbacks);
    } else {
      logger.warn('freeRASP API not found, skipping initialization');
    }

    logger.info('Checks initialized successfully');
    isInitialized = true;
  } catch (error) {
    logger.error('Initialization failed:', error);
    isInitialized = true; // Still mark as initialized to not block forever
  }
}

/**
 * Get current security status.
 *
 * Call this after initialization to check for threats.
 */
export function getSecurityStatus(): SecurityStatus {
  const hasCriticalThreat = detectedThreats.some((threat) =>
    CRITICAL_THREATS.includes(threat)
  );

  return {
    isSecure: detectedThreats.length === 0,
    threats: [...detectedThreats],
    shouldBlockApp: hasCriticalThreat && !__DEV__,
    isInitialized,
  };
}

/**
 * Check if a specific threat has been detected.
 */
export function hasThreat(threat: ThreatType): boolean {
  return detectedThreats.includes(threat);
}

/**
 * Get human-readable descriptions for threats.
 */
export function getThreatDescription(threat: ThreatType): string {
  const descriptions: Record<ThreatType, string> = {
    privilegedAccess: 'Device has elevated privileges (rooted/jailbroken)',
    hooks: 'Hooking framework detected (potential security tool)',
    appIntegrity: 'App has been modified or tampered with',
    simulator: 'Running on a simulator or emulator',
    debug: 'Debugger is attached to the app',
    deviceBinding: 'Device binding verification failed',
    unofficialStore: 'App was installed from an unofficial source',
    secureHardwareNotAvailable: 'Secure hardware is not available',
    passcode: 'Device does not have a passcode set',
    obfuscationIssues: 'Code obfuscation issues detected',
  };

  return descriptions[threat] || 'Unknown security issue';
}

/**
 * Clear detected threats (for testing purposes only)
 */
export function clearThreats(): void {
  if (__DEV__) {
    detectedThreats = [];
    isInitialized = false;
  }
}

/**
 * Check if security checks are available on this platform.
 */
export async function isSecurityChecksAvailable(): Promise<boolean> {
  if (__DEV__) {
    return false;
  }

  try {
    await import('freerasp-react-native');
    return true;
  } catch {
    return false;
  }
}

export default {
  initSecurityChecks,
  getSecurityStatus,
  hasThreat,
  getThreatDescription,
  clearThreats,
  isSecurityChecksAvailable,
};
