/**
 * Biometric Lock Screen
 *
 * Full-screen overlay that requires biometric authentication to unlock.
 * Shown when app returns from background and biometric lock is enabled.
 *
 * Phase 13: Security Hardening
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fingerprint, Scan, LockKey, SignOut } from 'phosphor-react-native';

import { colors, spacing, typeScale, layout } from '@/theme';
import { useBiometrics } from '@/hooks/useBiometrics';

// =============================================================================
// TYPES
// =============================================================================

interface BiometricLockScreenProps {
  /** Called when user successfully authenticates */
  onUnlock: () => void;
  /** Called when user wants to log out instead */
  onLogout: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function BiometricLockScreen({
  onUnlock,
  onLogout,
}: BiometricLockScreenProps) {
  const { authenticate, biometricName, capabilities } = useBiometrics();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine which icon to show based on biometric type
  const isFaceID = capabilities?.biometricTypes.includes('facial');

  const handleUnlock = useCallback(async () => {
    setIsAuthenticating(true);
    setError(null);

    try {
      const result = await authenticate('Unlock LifePlace');

      if (result.success) {
        onUnlock();
      } else if (result.error && result.error !== 'Authentication cancelled') {
        setError(result.error);
      }
    } catch (err) {
      setError('Authentication failed. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  }, [authenticate, onUnlock]);

  const handleLogout = useCallback(() => {
    onLogout();
  }, [onLogout]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Logo Area */}
        <View style={styles.logoContainer}>
          <LockKey size={40} color={colors.neutral.white} weight="fill" />
        </View>

        {/* Title */}
        <Text style={styles.title}>LifePlace is Locked</Text>

        {/* Biometric Icon */}
        <View style={styles.biometricContainer}>
          {isAuthenticating ? (
            <ActivityIndicator size="large" color={colors.neutral.white} />
          ) : isFaceID ? (
            <Scan size={80} color={colors.neutral.white} weight="light" />
          ) : (
            <Fingerprint size={80} color={colors.neutral.white} weight="light" />
          )}
        </View>

        {/* Unlock Button */}
        <TouchableOpacity
          style={styles.unlockButton}
          onPress={handleUnlock}
          disabled={isAuthenticating}
          activeOpacity={0.8}
        >
          <Text style={styles.unlockButtonText}>
            {isAuthenticating ? 'Authenticating...' : `Unlock with ${biometricName}`}
          </Text>
        </TouchableOpacity>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={handleUnlock} style={styles.retryButton}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Logout Option */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <SignOut size={20} color={colors.alpha.white80} />
          <Text style={styles.logoutText}>Log Out Instead</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.black,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typeScale.headlineLarge,
    color: colors.neutral.white,
    textAlign: 'center',
    marginBottom: spacing.xxxl,
  },
  biometricContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  unlockButton: {
    backgroundColor: colors.neutral.white,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: layout.borderRadius.md,
    minWidth: 220,
    alignItems: 'center',
  },
  unlockButtonText: {
    ...typeScale.labelLarge,
    color: colors.primary.black,
  },
  errorContainer: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  errorText: {
    ...typeScale.bodySmall,
    color: colors.semantic.error,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  retryButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  retryText: {
    ...typeScale.labelMedium,
    color: colors.neutral.white,
    textDecorationLine: 'underline',
  },
  spacer: {
    flex: 1,
    minHeight: spacing.xxxl,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  logoutText: {
    ...typeScale.labelMedium,
    color: colors.alpha.white80,
  },
});

export default BiometricLockScreen;
