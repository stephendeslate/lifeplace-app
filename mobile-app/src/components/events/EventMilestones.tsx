/**
 * EventMilestones Component
 *
 * Displays a simplified 4-phase progress indicator for events:
 * Booking → Contract → Payment → Event Day
 *
 * Shows client-facing milestones (not operational workflow stages).
 */

import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CheckCircle, RadioButton, Minus } from 'phosphor-react-native';
import { theme } from '@/theme';
import type { Event } from '@/types/events.types';

// =============================================================================
// TYPES
// =============================================================================

export type MilestoneStatus = 'completed' | 'current' | 'pending' | 'na';

export interface Milestone {
  key: string;
  label: string;
  status: MilestoneStatus;
}

export interface EventMilestonesProps {
  event: Event;
  /** Compact mode for inline display in cards */
  compact?: boolean;
  testID?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Compute milestone statuses from event data
 */
function computeMilestones(event: Event): Milestone[] {
  const milestones: Milestone[] = [];
  const now = new Date();
  const eventDate = new Date(event.start_date);
  const isPastEvent = eventDate < now && event.days_until_event !== 0;
  const isToday = event.days_until_event === 0;

  // 1. BOOKING - Complete if event exists and not cancelled/draft
  const bookingComplete = event.status !== 'CANCELLED' && event.status !== 'DRAFT';
  milestones.push({
    key: 'booking',
    label: 'Booked',
    status: bookingComplete ? 'completed' : 'pending',
  });

  // 2. CONTRACT - Check if contracts exist and their status
  // Use the contracts array from API (ClientEventSerializer returns this)
  const contracts = event.contracts ?? [];
  const hasContracts = contracts.length > 0;

  let contractStatus: MilestoneStatus = 'na';
  if (hasContracts) {
    // Check if all contracts are signed
    const allContractsSigned = contracts.every(c => c.status === 'SIGNED');
    // Or use pending_signature_required as the definitive check
    const contractSigned = allContractsSigned || event.pending_signature_required === false;

    if (contractSigned) {
      contractStatus = 'completed';
    } else if (bookingComplete) {
      // Contract pending and booking done = current step
      contractStatus = 'current';
    } else {
      contractStatus = 'pending';
    }
  }

  milestones.push({
    key: 'contract',
    label: 'Contract',
    status: contractStatus,
  });

  // 3. PAYMENT - Based on payment_status
  let paymentStatus: MilestoneStatus = 'pending';
  if (event.payment_status === 'PAID') {
    paymentStatus = 'completed';
  } else if (
    event.payment_status === 'PARTIALLY_PAID' ||
    event.payment_status === 'PARTIAL'
  ) {
    // Partially paid = current/in progress
    paymentStatus = 'current';
  } else if (
    (contractStatus === 'completed' || contractStatus === 'na') &&
    bookingComplete
  ) {
    // If contract is done (or N/A) and payment not started, it's the current step
    paymentStatus = 'current';
  }

  milestones.push({
    key: 'payment',
    label: 'Payment',
    status: paymentStatus,
  });

  // 4. EVENT DAY - Based on date
  let eventDayStatus: MilestoneStatus = 'pending';
  let eventDayLabel = 'Event Day';

  if (isPastEvent || event.status === 'COMPLETED') {
    eventDayStatus = 'completed';
    eventDayLabel = 'Completed';
  } else if (isToday) {
    eventDayStatus = 'current';
    eventDayLabel = 'Today!';
  }

  milestones.push({
    key: 'eventDay',
    label: eventDayLabel,
    status: eventDayStatus,
  });

  return milestones;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const EventMilestones = memo(function EventMilestones({
  event,
  compact = false,
  testID,
}: EventMilestonesProps) {
  const milestones = useMemo(() => computeMilestones(event), [event]);

  // Don't render for cancelled events
  if (event.status === 'CANCELLED') {
    return null;
  }

  if (compact) {
    return (
      <View style={styles.compactContainer} testID={testID}>
        {milestones.map((milestone, index) => (
          <View key={milestone.key} style={styles.compactItem}>
            <MilestoneIcon status={milestone.status} size={14} />
            {index < milestones.length - 1 && (
              <View
                style={[
                  styles.compactConnector,
                  milestone.status === 'completed' && styles.connectorCompleted,
                ]}
              />
            )}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID}>
      {milestones.map((milestone, index) => (
        <View key={milestone.key} style={styles.milestoneItem}>
          {/* Icon and connector */}
          <View style={styles.iconRow}>
            <MilestoneIcon status={milestone.status} size={20} />
            {index < milestones.length - 1 && (
              <View
                style={[
                  styles.connector,
                  milestone.status === 'completed' && styles.connectorCompleted,
                ]}
              />
            )}
          </View>
          {/* Label */}
          <Text
            style={[
              styles.label,
              milestone.status === 'completed' && styles.labelCompleted,
              milestone.status === 'current' && styles.labelCurrent,
              milestone.status === 'na' && styles.labelNA,
            ]}
            numberOfLines={1}
          >
            {milestone.label}
          </Text>
        </View>
      ))}
    </View>
  );
});

// =============================================================================
// MILESTONE ICON
// =============================================================================

interface MilestoneIconProps {
  status: MilestoneStatus;
  size: number;
}

function MilestoneIcon({ status, size }: MilestoneIconProps) {
  switch (status) {
    case 'completed':
      return (
        <CheckCircle
          size={size}
          color={theme.colors.success[500]}
          weight="fill"
        />
      );
    case 'current':
      return (
        <View style={[styles.currentDot, { width: size, height: size }]}>
          <View style={styles.currentDotInner} />
        </View>
      );
    case 'na':
      return (
        <Minus
          size={size}
          color={theme.colors.neutral[300]}
          weight="bold"
        />
      );
    default:
      return (
        <RadioButton
          size={size}
          color={theme.colors.neutral[300]}
          weight="regular"
        />
      );
  }
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  milestoneItem: {
    alignItems: 'center',
    flex: 1,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  connector: {
    height: 2,
    flex: 1,
    backgroundColor: theme.colors.neutral[200],
    marginHorizontal: theme.spacing.xs,
    minWidth: 20,
  },
  connectorCompleted: {
    backgroundColor: theme.colors.success[500],
  },
  label: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.neutral[500],
    textAlign: 'center',
  },
  labelCompleted: {
    color: theme.colors.success[600],
  },
  labelCurrent: {
    color: theme.colors.primary[600],
    fontFamily: theme.typography.fonts.semibold,
  },
  labelNA: {
    color: theme.colors.neutral[300],
  },
  // Current step indicator (pulsing dot effect)
  currentDot: {
    borderRadius: 10,
    backgroundColor: theme.colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary[500],
  },
  // Compact mode styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactConnector: {
    width: 12,
    height: 2,
    backgroundColor: theme.colors.neutral[200],
    marginHorizontal: 2,
  },
});

export default EventMilestones;
