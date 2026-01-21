/**
 * SessionRecoverySheet
 *
 * Bottom sheet for recovering interrupted booking sessions.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Animated,
} from 'react-native';
import { ArrowRight, X, ClockClockwise, Trash } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import type { RecoverableSession, SessionRecoveryInfo } from '@/types/booking';
import { formatDistanceToNow } from 'date-fns';

interface SessionRecoverySheetProps {
  visible: boolean;
  session: RecoverableSession | SessionRecoveryInfo | null;
  onResume: () => void;
  onDiscard: () => void;
  onDismiss: () => void;
}

export function SessionRecoverySheet({
  visible,
  session,
  onResume,
  onDiscard,
  onDismiss,
}: SessionRecoverySheetProps) {
  if (!session) return null;

  const lastUpdated = formatDistanceToNow(
    new Date('lastUpdated' in session ? session.lastUpdated : session.last_updated),
    { addSuffix: true }
  );

  const progress = 'progressPercentage' in session
    ? session.progressPercentage
    : session.progress_percentage;

  const eventName = 'eventTypeName' in session
    ? session.eventTypeName
    : session.event_type_name;

  const stepName = 'stepName' in session
    ? session.stepName
    : session.current_step_name;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <ClockClockwise size={28} color={colors.tertiary.teal} weight="fill" />
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={colors.neutral.darkGray} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title}>Continue where you left off?</Text>
            <Text style={styles.description}>
              You have an unfinished booking that you can resume.
            </Text>

            {/* Session Info */}
            <View style={styles.sessionInfo}>
              {eventName && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Event Type</Text>
                  <Text style={styles.infoValue}>{eventName}</Text>
                </View>
              )}
              {stepName && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Current Step</Text>
                  <Text style={styles.infoValue}>{stepName}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Progress</Text>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{progress}%</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Last Updated</Text>
                <Text style={styles.infoValue}>{lastUpdated}</Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.resumeButton}
              onPress={onResume}
              activeOpacity={0.8}
            >
              <Text style={styles.resumeButtonText}>Resume Booking</Text>
              <ArrowRight size={20} color={colors.neutral.white} weight="bold" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.discardButton}
              onPress={onDiscard}
              activeOpacity={0.7}
            >
              <Trash size={18} color={colors.semantic.error} />
              <Text style={styles.discardButtonText}>Discard & Start Fresh</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.alpha.black40,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: layout.borderRadius.xl,
    borderTopRightRadius: layout.borderRadius.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.lg,
    ...shadows.xl,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.neutral.warmGray,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.tertiary.tealSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typeScale.headlineSmall,
    color: colors.primary.black,
    marginBottom: spacing.xs,
  },
  description: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    marginBottom: spacing.lg,
  },
  sessionInfo: {
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
  },
  infoValue: {
    ...typeScale.bodySmall,
    color: colors.primary.black,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressBar: {
    width: 80,
    height: 6,
    backgroundColor: colors.neutral.warmGray,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.secondary.forest,
    borderRadius: 3,
  },
  progressText: {
    ...typeScale.labelSmall,
    color: colors.primary.black,
    fontWeight: '600',
  },
  actions: {
    gap: spacing.sm,
  },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.black,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: layout.borderRadius.md,
    gap: spacing.sm,
  },
  resumeButtonText: {
    ...typeScale.labelLarge,
    color: colors.neutral.white,
    fontWeight: '600',
  },
  discardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  discardButtonText: {
    ...typeScale.labelMedium,
    color: colors.semantic.error,
  },
});

export default SessionRecoverySheet;
