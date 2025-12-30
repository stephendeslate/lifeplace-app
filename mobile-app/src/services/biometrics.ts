/**
 * Biometric Authentication Service
 *
 * Provides Face ID / Touch ID authentication capabilities.
 * Uses expo-local-authentication for cross-platform biometric support.
 *
 * IMPORTANT: Requires EAS development build (not Expo Go)
 *
 * Phase 13: Security Hardening
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

// =============================================================================
// CONSTANTS
// =============================================================================

const BIOMETRIC_ENABLED_KEY = 'biometric_auth_enabled';

// =============================================================================
// TYPES
// =============================================================================

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  warning?: string;
}

export type BiometricType = 'fingerprint' | 'facial' | 'iris' | 'none';

export interface BiometricCapability {
  isAvailable: boolean;
  isEnrolled: boolean;
  biometricTypes: BiometricType[];
  securityLevel: LocalAuthentication.SecurityLevel;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Map LocalAuthentication types to friendly names
 */
function mapBiometricTypes(
  types: LocalAuthentication.AuthenticationType[]
): BiometricType[] {
  return types.map((type) => {
    switch (type) {
      case LocalAuthentication.AuthenticationType.FINGERPRINT:
        return 'fingerprint';
      case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
        return 'facial';
      case LocalAuthentication.AuthenticationType.IRIS:
        return 'iris';
      default:
        return 'none';
    }
  });
}

/**
 * Get a user-friendly name for the biometric type
 */
export function getBiometricName(types: BiometricType[]): string {
  if (types.includes('facial')) {
    return 'Face ID';
  }
  if (types.includes('fingerprint')) {
    return 'Touch ID';
  }
  if (types.includes('iris')) {
    return 'Iris';
  }
  return 'Biometrics';
}

// =============================================================================
// SERVICE
// =============================================================================

export const BiometricService = {
  /**
   * Check if biometric authentication is available on this device.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch (error) {
      console.error('Biometric availability check failed:', error);
      return false;
    }
  },

  /**
   * Get detailed biometric capabilities of the device.
   */
  async getCapabilities(): Promise<BiometricCapability> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes =
        await LocalAuthentication.supportedAuthenticationTypesAsync();
      const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();

      return {
        isAvailable: hasHardware && isEnrolled,
        isEnrolled,
        biometricTypes: mapBiometricTypes(supportedTypes),
        securityLevel,
      };
    } catch (error) {
      console.error('Failed to get biometric capabilities:', error);
      return {
        isAvailable: false,
        isEnrolled: false,
        biometricTypes: [],
        securityLevel: LocalAuthentication.SecurityLevel.NONE,
      };
    }
  },

  /**
   * Perform biometric authentication.
   *
   * @param promptMessage - Message to show in the biometric prompt
   * @param options - Additional options
   */
  async authenticate(
    promptMessage: string = 'Authenticate with biometrics',
    options?: {
      cancelLabel?: string;
      fallbackLabel?: string;
      disableDeviceFallback?: boolean;
    }
  ): Promise<BiometricAuthResult> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: options?.cancelLabel ?? 'Cancel',
        fallbackLabel: options?.fallbackLabel ?? 'Use Passcode',
        disableDeviceFallback: options?.disableDeviceFallback ?? false,
      });

      if (result.success) {
        return { success: true };
      }

      // Handle specific error types
      let errorMessage = 'Authentication failed';
      let warning: string | undefined;

      if (result.error === 'user_cancel') {
        errorMessage = 'Authentication cancelled';
      } else if (result.error === 'user_fallback') {
        errorMessage = 'User chose fallback authentication';
      } else if (result.error === 'lockout') {
        errorMessage = 'Too many failed attempts. Please try again later.';
        warning = 'Biometric authentication is temporarily locked.';
      } else if (result.error === 'not_enrolled') {
        errorMessage = 'No biometrics enrolled on this device';
      } else if (result.error === 'not_available') {
        errorMessage = 'Biometric authentication not available';
      } else if (result.error === 'system_cancel') {
        errorMessage = 'System cancelled authentication';
      } else if (result.error) {
        errorMessage = result.error;
      }

      return {
        success: false,
        error: errorMessage,
        warning,
      };
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  },

  /**
   * Check if biometric authentication is enabled by the user.
   */
  async isEnabled(): Promise<boolean> {
    try {
      const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      return value === 'true';
    } catch (error) {
      console.error('Failed to check biometric enabled status:', error);
      return false;
    }
  },

  /**
   * Enable or disable biometric authentication.
   *
   * When enabling, performs a biometric check to verify the user.
   */
  async setEnabled(enabled: boolean): Promise<BiometricAuthResult> {
    try {
      if (enabled) {
        // Verify biometrics are available
        const isAvailable = await this.isAvailable();
        if (!isAvailable) {
          return {
            success: false,
            error: 'Biometric authentication is not available on this device',
          };
        }

        // Authenticate before enabling
        const authResult = await this.authenticate(
          'Verify your identity to enable biometric login'
        );

        if (!authResult.success) {
          return authResult;
        }

        await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
      } else {
        await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to set biometric enabled status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update setting',
      };
    }
  },

  /**
   * Clear biometric settings (used during logout)
   */
  async clearSettings(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
    } catch (error) {
      console.error('Failed to clear biometric settings:', error);
    }
  },
};

export default BiometricService;
