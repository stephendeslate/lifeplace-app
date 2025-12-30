/**
 * Security Blocked Screen
 *
 * Shown when critical security threats are detected on the device.
 * This screen has no bypass - the app cannot be used on compromised devices.
 *
 * Phase 13: Security Hardening
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Linking,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldWarning, EnvelopeSimple, Warning } from 'phosphor-react-native';

import { colors, spacing, typeScale, layout } from '@/theme';
import { getThreatDescription, type ThreatType } from '@/services/securityChecks';

// =============================================================================
// CONSTANTS
// =============================================================================

const SUPPORT_EMAIL = 'support@lifeplace.com';

// =============================================================================
// TYPES
// =============================================================================

interface SecurityBlockedScreenProps {
  /** List of detected threats */
  threats: ThreatType[];
}

// =============================================================================
// COMPONENT
// =============================================================================

export function SecurityBlockedScreen({ threats }: SecurityBlockedScreenProps) {
  const handleContactSupport = () => {
    const subject = 'Security Alert - App Blocked';
    const body = `I received a security alert when trying to use the LifePlace app.\n\nDetected issues:\n${threats
      .map((t) => `- ${getThreatDescription(t)}`)
      .join('\n')}\n\nDevice info:\n[Please describe your device]`;

    Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Warning Icon */}
        <View style={styles.iconContainer}>
          <ShieldWarning size={80} color={colors.semantic.error} weight="fill" />
        </View>

        {/* Title */}
        <Text style={styles.title}>Security Alert</Text>

        {/* Main Message */}
        <Text style={styles.message}>
          LifePlace cannot run on this device due to security concerns. Your
          data and privacy are important to us.
        </Text>

        {/* Detected Issues */}
        <View style={styles.issuesContainer}>
          <Text style={styles.issuesTitle}>Detected Issues</Text>
          {threats.map((threat, index) => (
            <View key={threat} style={styles.issueItem}>
              <Warning size={18} color={colors.semantic.error} weight="fill" />
              <Text style={styles.issueText}>
                {getThreatDescription(threat)}
              </Text>
            </View>
          ))}
        </View>

        {/* Explanation */}
        <View style={styles.explanationContainer}>
          <Text style={styles.explanationTitle}>Why is this happening?</Text>
          <Text style={styles.explanationText}>
            We detected modifications to your device that could compromise the
            security of your personal and payment information. This includes
            device modifications like rooting or jailbreaking, or the presence
            of tools that could intercept app data.
          </Text>
        </View>

        {/* What You Can Do */}
        <View style={styles.solutionContainer}>
          <Text style={styles.solutionTitle}>What you can do</Text>
          <Text style={styles.solutionItem}>
            • Use an unmodified device without root/jailbreak
          </Text>
          <Text style={styles.solutionItem}>
            • Disable any hooking frameworks (Frida, Xposed, etc.)
          </Text>
          <Text style={styles.solutionItem}>
            • Install the app from the official app store
          </Text>
          <Text style={styles.solutionItem}>
            • Contact support if you believe this is an error
          </Text>
        </View>

        {/* Contact Support Button */}
        <TouchableOpacity
          style={styles.supportButton}
          onPress={handleContactSupport}
          activeOpacity={0.8}
        >
          <EnvelopeSimple size={20} color={colors.neutral.white} />
          <Text style={styles.supportButtonText}>Contact Support</Text>
        </TouchableOpacity>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          This security measure protects your account and sensitive information
          from potential threats.
        </Text>
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
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(214, 69, 69, 0.1)', // error color with alpha
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typeScale.displayMedium,
    color: colors.semantic.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  message: {
    ...typeScale.bodyLarge,
    color: colors.neutral.darkGray,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  issuesContainer: {
    width: '100%',
    backgroundColor: 'rgba(214, 69, 69, 0.08)',
    borderRadius: layout.borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  issuesTitle: {
    ...typeScale.titleSmall,
    color: colors.semantic.error,
    marginBottom: spacing.md,
  },
  issueItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  issueText: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
    flex: 1,
  },
  explanationContainer: {
    width: '100%',
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  explanationTitle: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    marginBottom: spacing.sm,
  },
  explanationText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    lineHeight: 22,
  },
  solutionContainer: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  solutionTitle: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    marginBottom: spacing.sm,
  },
  solutionItem: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    marginBottom: spacing.xs,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary.black,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: layout.borderRadius.md,
    marginBottom: spacing.lg,
  },
  supportButtonText: {
    ...typeScale.labelLarge,
    color: colors.neutral.white,
  },
  disclaimer: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
    textAlign: 'center',
  },
});

export default SecurityBlockedScreen;
