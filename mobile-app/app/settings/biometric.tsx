/**
 * Biometric Settings Screen
 *
 * Allows users to enable/disable biometric authentication for the app.
 *
 * Phase 13: Security Hardening
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Fingerprint,
  Scan,
  ShieldCheck,
  Info,
  CheckCircle,
  XCircle,
} from 'phosphor-react-native';

import { colors, spacing, typeScale, layout } from '@/theme';
import { useBiometrics } from '@/hooks/useBiometrics';

// =============================================================================
// COMPONENT
// =============================================================================

export default function BiometricSettingsScreen() {
  const {
    isAvailable,
    isEnabled,
    isLoading,
    isToggling,
    capabilities,
    biometricName,
    enable,
    disable,
  } = useBiometrics();

  const [error, setError] = useState<string | null>(null);

  // Determine icon based on biometric type
  const isFaceID = capabilities?.biometricTypes.includes('facial');

  const handleToggle = useCallback(
    async (value: boolean) => {
      setError(null);

      if (value) {
        const result = await enable();
        if (!result.success) {
          setError(result.error || 'Failed to enable biometrics');
        }
      } else {
        // Confirm before disabling
        Alert.alert(
          `Disable ${biometricName}?`,
          `You will need to enter your password to access the app after returning from background.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Disable',
              style: 'destructive',
              onPress: async () => {
                const result = await disable();
                if (!result.success) {
                  setError(result.error || 'Failed to disable biometrics');
                }
              },
            },
          ]
        );
      }
    },
    [enable, disable, biometricName]
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.black} />
          <Text style={styles.loadingText}>Checking biometric capabilities...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Icon */}
        <View style={styles.headerIcon}>
          {isFaceID ? (
            <Scan size={60} color={colors.secondary.forest} weight="light" />
          ) : (
            <Fingerprint size={60} color={colors.secondary.forest} weight="light" />
          )}
        </View>

        {/* Title & Description */}
        <Text style={styles.title}>{biometricName}</Text>
        <Text style={styles.description}>
          Use {biometricName} to quickly and securely unlock the app when
          returning from the background.
        </Text>

        {/* Availability Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Hardware Available</Text>
            {isAvailable ? (
              <CheckCircle size={20} color={colors.semantic.success} weight="fill" />
            ) : (
              <XCircle size={20} color={colors.semantic.error} weight="fill" />
            )}
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Biometrics Enrolled</Text>
            {capabilities?.isEnrolled ? (
              <CheckCircle size={20} color={colors.semantic.success} weight="fill" />
            ) : (
              <XCircle size={20} color={colors.semantic.error} weight="fill" />
            )}
          </View>
        </View>

        {/* Toggle Switch */}
        {isAvailable ? (
          <View style={styles.toggleCard}>
            <View style={styles.toggleContent}>
              <ShieldCheck size={24} color={colors.primary.black} />
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleTitle}>Enable {biometricName}</Text>
                <Text style={styles.toggleDescription}>
                  Require {biometricName} to access the app
                </Text>
              </View>
            </View>
            {isToggling ? (
              <ActivityIndicator size="small" color={colors.primary.black} />
            ) : (
              <Switch
                value={isEnabled}
                onValueChange={handleToggle}
                trackColor={{
                  false: colors.neutral.warmGray,
                  true: colors.secondary.forest,
                }}
                thumbColor={colors.neutral.white}
              />
            )}
          </View>
        ) : (
          <View style={styles.unavailableCard}>
            <Info size={24} color={colors.semantic.warning} />
            <Text style={styles.unavailableText}>
              {biometricName} is not available on this device. Please ensure you
              have enrolled your biometrics in your device settings.
            </Text>
          </View>
        )}

        {/* Error Message */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              onPress={() => setError(null)}
              style={styles.errorDismiss}
            >
              <Text style={styles.errorDismissText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How it works</Text>
          <View style={styles.infoItem}>
            <View style={styles.infoBullet} />
            <Text style={styles.infoText}>
              When enabled, the app will require {biometricName} authentication
              each time you return from the background
            </Text>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoBullet} />
            <Text style={styles.infoText}>
              Your biometric data never leaves your device and is handled
              entirely by your device's secure hardware
            </Text>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoBullet} />
            <Text style={styles.infoText}>
              You can always use your password as a fallback authentication
              method
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.cream,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
  },
  content: {
    padding: spacing.xl,
  },
  headerIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.secondary.forestSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typeScale.headlineMedium,
    color: colors.primary.black,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  statusCard: {
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  statusLabel: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleTitle: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    marginBottom: spacing.xxs,
  },
  toggleDescription: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
  },
  unavailableCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: 'rgba(229, 168, 75, 0.1)',
    borderRadius: layout.borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  unavailableText: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
    flex: 1,
  },
  errorCard: {
    backgroundColor: 'rgba(214, 69, 69, 0.1)',
    borderRadius: layout.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    ...typeScale.bodySmall,
    color: colors.semantic.error,
    marginBottom: spacing.xs,
  },
  errorDismiss: {
    alignSelf: 'flex-end',
  },
  errorDismissText: {
    ...typeScale.labelSmall,
    color: colors.semantic.error,
    textDecorationLine: 'underline',
  },
  infoSection: {
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.borderRadius.lg,
    padding: spacing.lg,
  },
  infoTitle: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    marginBottom: spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondary.forest,
    marginTop: 7,
  },
  infoText: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    flex: 1,
    lineHeight: 20,
  },
});
