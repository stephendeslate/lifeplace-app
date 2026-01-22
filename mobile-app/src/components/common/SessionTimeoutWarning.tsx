/**
 * Session Timeout Warning Modal
 *
 * Shows a countdown warning before the session expires.
 * Allows users to extend their session or log out.
 *
 * Phase 13: Security Hardening
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Clock, SignOut, ArrowClockwise } from 'phosphor-react-native';

import { colors, spacing, typeScale, layout, shadows } from '@/theme';

// =============================================================================
// TYPES
// =============================================================================

interface SessionTimeoutWarningProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Remaining time in milliseconds */
  remainingMs: number;
  /** Called when user wants to continue session */
  onContinue: () => void;
  /** Called when user wants to log out */
  onLogout: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function SessionTimeoutWarning({
  visible,
  remainingMs,
  onContinue,
  onLogout,
}: SessionTimeoutWarningProps) {
  const [timeLeft, setTimeLeft] = useState(remainingMs);

  // Update countdown timer
  useEffect(() => {
    if (!visible) return;

    setTimeLeft(remainingMs);

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1000;
        if (newTime <= 0) {
          clearInterval(interval);
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [visible, remainingMs]);

  // Handle logout when time reaches zero (separate effect to avoid setState during render)
  useEffect(() => {
    if (visible && timeLeft <= 0) {
      onLogout();
    }
  }, [visible, timeLeft, onLogout]);

  const handleContinue = useCallback(() => {
    onContinue();
  }, [onContinue]);

  const handleLogout = useCallback(() => {
    onLogout();
  }, [onLogout]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={handleContinue}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Clock size={48} color={colors.semantic.warning} weight="fill" />
          </View>

          {/* Title */}
          <Text style={styles.title}>Session Expiring Soon</Text>

          {/* Message */}
          <Text style={styles.message}>
            Your session will expire due to inactivity. Would you like to
            continue?
          </Text>

          {/* Countdown */}
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownLabel}>Time remaining</Text>
            <Text style={styles.countdown}>{formatTime(timeLeft)}</Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
              activeOpacity={0.8}
            >
              <ArrowClockwise size={20} color={colors.neutral.white} weight="bold" />
              <Text style={styles.continueButtonText}>Continue Session</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <SignOut size={18} color={colors.neutral.darkGray} />
              <Text style={styles.logoutButtonText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.alpha.black60,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modal: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    ...shadows.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(229, 168, 75, 0.15)', // warning color with alpha
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typeScale.headlineSmall,
    color: colors.primary.black,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.borderRadius.md,
    width: '100%',
  },
  countdownLabel: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
    marginBottom: spacing.xxs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countdown: {
    ...typeScale.displayMedium,
    color: colors.semantic.warning,
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.secondary.forest,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: layout.borderRadius.md,
    minHeight: layout.buttonHeight,
  },
  continueButtonText: {
    ...typeScale.labelLarge,
    color: colors.neutral.white,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  logoutButtonText: {
    ...typeScale.labelMedium,
    color: colors.neutral.darkGray,
  },
});

export default SessionTimeoutWarning;
