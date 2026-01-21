/**
 * DateUnavailableModal Component
 *
 * Modal displayed when a selected date becomes unavailable due to another
 * customer completing their booking first (race condition).
 *
 * KEY FEATURES:
 * - Reassures customer that their card was NOT charged
 * - Explains what happened in clear, friendly language
 * - Provides easy action to select a new date
 *
 * This is part of the race condition prevention system to ensure
 * customers are never charged for dates that become unavailable.
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { X, CalendarX, Warning, ShieldCheck, ArrowRight } from 'phosphor-react-native';
import { theme } from '@/theme';
import { Button } from '@/components/common/Button';

interface DateUnavailableModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** The date that became unavailable (for display) */
  unavailableDate?: string | null;
  /** Callback when user wants to select a new date */
  onSelectNewDate: () => void;
  /** Callback to close the modal */
  onClose: () => void;
  /** Optional custom message */
  message?: string;
}

export function DateUnavailableModal({
  visible,
  unavailableDate,
  onSelectNewDate,
  onClose,
  message,
}: DateUnavailableModalProps) {
  const handleSelectNewDate = () => {
    onClose();
    onSelectNewDate();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.iconContainer}>
                <CalendarX size={28} color={theme.colors.semantic.warning} weight="bold" />
              </View>
              <Text style={styles.title}>Date No Longer Available</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.colors.neutral.gray} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Warning message */}
            <Text style={styles.description}>
              {message ||
                "We're sorry, but another customer completed their booking for this date just before you."}
            </Text>

            {/* Date display */}
            {unavailableDate && (
              <View style={styles.dateBox}>
                <CalendarX size={20} color={theme.colors.semantic.error} />
                <Text style={styles.dateText}>{unavailableDate}</Text>
              </View>
            )}

            {/* Reassurance card - Card NOT charged */}
            <View style={styles.reassuranceCard}>
              <ShieldCheck
                size={24}
                color={theme.colors.secondary.forest}
                weight="fill"
              />
              <View style={styles.reassuranceContent}>
                <Text style={styles.reassuranceTitle}>Your Card Was NOT Charged</Text>
                <Text style={styles.reassuranceText}>
                  Don't worry! We validate availability before processing payment,
                  so no charge was made to your card.
                </Text>
              </View>
            </View>

            {/* What to do next */}
            <View style={styles.nextStepsBox}>
              <Warning size={18} color={theme.colors.tertiary.teal} />
              <Text style={styles.nextStepsText}>
                Please select a different date to continue with your booking.
                Your other selections have been saved.
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Button
              variant="secondary"
              onPress={onClose}
              style={styles.button}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={handleSelectNewDate}
              style={styles.button}
            >
              <View style={styles.buttonContent}>
                <Text style={styles.buttonText}>Select New Date</Text>
                <ArrowRight size={18} color={theme.colors.neutral.white} />
              </View>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    backgroundColor: theme.colors.neutral.white,
    borderRadius: theme.borderRadius.lg,
    width: '90%',
    maxWidth: 400,
    ...theme.shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral.warmGray,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.semantic.warning + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...theme.typeScale.titleLarge,
    color: theme.colors.primary.black,
    flex: 1,
  },
  closeButton: {
    padding: theme.spacing.xs,
    marginLeft: theme.spacing.sm,
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  description: {
    ...theme.typeScale.bodyMedium,
    color: theme.colors.neutral.darkGray,
    lineHeight: 22,
  },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.semantic.error + '10',
    borderWidth: 1,
    borderColor: theme.colors.semantic.error + '30',
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  dateText: {
    ...theme.typeScale.bodyMedium,
    color: theme.colors.semantic.error,
    fontWeight: '600',
    textDecorationLine: 'line-through',
  },
  reassuranceCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.secondary.forest + '10',
    borderWidth: 1,
    borderColor: theme.colors.secondary.forest + '30',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  reassuranceContent: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  reassuranceTitle: {
    ...theme.typeScale.labelMedium,
    color: theme.colors.secondary.forest,
    fontWeight: '600',
  },
  reassuranceText: {
    ...theme.typeScale.bodySmall,
    color: theme.colors.neutral.darkGray,
    lineHeight: 18,
  },
  nextStepsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.tertiary.tealSubtle,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  nextStepsText: {
    ...theme.typeScale.bodySmall,
    color: theme.colors.tertiary.tealDark,
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral.warmGray,
  },
  button: {
    flex: 1,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  buttonText: {
    ...theme.typeScale.labelMedium,
    color: theme.colors.neutral.white,
    fontWeight: '600',
  },
});

export default DateUnavailableModal;
