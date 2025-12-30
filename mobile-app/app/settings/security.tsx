/**
 * Security Settings Screen
 *
 * Central hub for all security-related settings including:
 * - Biometric authentication
 * - Session timeout settings
 * - Security status
 *
 * Phase 13: Security Hardening
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ShieldCheck,
  Fingerprint,
  FaceScan,
  Clock,
  CaretRight,
  CheckCircle,
  LockSimple,
} from 'phosphor-react-native';

import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import { useBiometrics } from '@/hooks/useBiometrics';
import { useSecurity } from '@/providers/SecurityProvider';

// =============================================================================
// COMPONENT
// =============================================================================

export default function SecuritySettingsScreen() {
  const router = useRouter();
  const { isAvailable, isEnabled, biometricName, capabilities } = useBiometrics();
  const { isInitialized } = useSecurity();

  // Determine icon based on biometric type
  const isFaceID = capabilities?.biometricTypes.includes('facial');

  const navigateToBiometrics = () => {
    router.push('/settings/biometric');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Security Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <ShieldCheck size={32} color={colors.secondary.forest} weight="fill" />
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusTitle}>Security Status</Text>
              <Text style={styles.statusSubtitle}>
                Your account is protected
              </Text>
            </View>
          </View>
          <View style={styles.statusChecks}>
            <View style={styles.statusCheckItem}>
              <CheckCircle size={18} color={colors.secondary.forest} weight="fill" />
              <Text style={styles.statusCheckText}>Secure token storage</Text>
            </View>
            <View style={styles.statusCheckItem}>
              <CheckCircle size={18} color={colors.secondary.forest} weight="fill" />
              <Text style={styles.statusCheckText}>Encrypted connection (HTTPS)</Text>
            </View>
            {isEnabled && (
              <View style={styles.statusCheckItem}>
                <CheckCircle size={18} color={colors.secondary.forest} weight="fill" />
                <Text style={styles.statusCheckText}>{biometricName} enabled</Text>
              </View>
            )}
          </View>
        </View>

        {/* Section: Authentication */}
        <Text style={styles.sectionTitle}>Authentication</Text>

        {/* Biometric Authentication */}
        <TouchableOpacity
          style={styles.settingItem}
          onPress={navigateToBiometrics}
          activeOpacity={0.7}
        >
          <View style={styles.settingIconContainer}>
            {isFaceID ? (
              <FaceScan size={24} color={colors.primary.black} />
            ) : (
              <Fingerprint size={24} color={colors.primary.black} />
            )}
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>{biometricName}</Text>
            <Text style={styles.settingDescription}>
              {isEnabled
                ? 'Enabled - Unlock with biometrics'
                : isAvailable
                ? 'Available - Tap to enable'
                : 'Not available on this device'}
            </Text>
          </View>
          <View style={styles.settingAction}>
            {isEnabled && (
              <View style={styles.enabledBadge}>
                <Text style={styles.enabledBadgeText}>ON</Text>
              </View>
            )}
            <CaretRight size={20} color={colors.neutral.gray} />
          </View>
        </TouchableOpacity>

        {/* Session Timeout Info */}
        <View style={styles.settingItem}>
          <View style={styles.settingIconContainer}>
            <Clock size={24} color={colors.primary.black} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Session Timeout</Text>
            <Text style={styles.settingDescription}>
              Automatically log out after 30 minutes of inactivity
            </Text>
          </View>
          <View style={styles.settingAction}>
            <View style={styles.enabledBadge}>
              <Text style={styles.enabledBadgeText}>30 min</Text>
            </View>
          </View>
        </View>

        {/* Section: Device Security */}
        <Text style={styles.sectionTitle}>Device Security</Text>

        {/* Lock App */}
        <View style={styles.settingItem}>
          <View style={styles.settingIconContainer}>
            <LockSimple size={24} color={colors.primary.black} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>App Lock on Background</Text>
            <Text style={styles.settingDescription}>
              {isEnabled
                ? `Lock app when switching apps (requires ${biometricName})`
                : 'Enable biometrics to use app lock'}
            </Text>
          </View>
          <Switch
            value={isEnabled}
            disabled={!isAvailable}
            onValueChange={navigateToBiometrics}
            trackColor={{
              false: colors.neutral.warmGray,
              true: colors.secondary.forest,
            }}
            thumbColor={colors.neutral.white}
          />
        </View>

        {/* Security Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Security Tips</Text>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>1.</Text>
            <Text style={styles.tipText}>
              Enable biometric authentication for quick and secure access
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>2.</Text>
            <Text style={styles.tipText}>
              Use a strong, unique password for your LifePlace account
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>3.</Text>
            <Text style={styles.tipText}>
              Keep your device's operating system and apps up to date
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>4.</Text>
            <Text style={styles.tipText}>
              Never share your login credentials with others
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
  content: {
    padding: spacing.xl,
  },
  statusCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.warmGray,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
    marginBottom: spacing.xxs,
  },
  statusSubtitle: {
    ...typeScale.bodySmall,
    color: colors.secondary.forest,
  },
  statusChecks: {
    gap: spacing.sm,
  },
  statusCheckItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusCheckText: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
  },
  sectionTitle: {
    ...typeScale.labelLarge,
    color: colors.neutral.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  settingIconContainer: {
    width: 44,
    height: 44,
    borderRadius: layout.borderRadius.md,
    backgroundColor: colors.neutral.sand,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    marginBottom: spacing.xxs,
  },
  settingDescription: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
  },
  settingAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  enabledBadge: {
    backgroundColor: colors.secondary.forestSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: layout.borderRadius.sm,
  },
  enabledBadgeText: {
    ...typeScale.labelSmall,
    color: colors.secondary.forest,
    fontWeight: '600',
  },
  tipsSection: {
    marginTop: spacing.xl,
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.borderRadius.lg,
    padding: spacing.lg,
  },
  tipsTitle: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    marginBottom: spacing.md,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  tipBullet: {
    ...typeScale.bodySmall,
    color: colors.secondary.forest,
    fontWeight: '600',
    width: 20,
  },
  tipText: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    flex: 1,
    lineHeight: 20,
  },
});
