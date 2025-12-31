/**
 * CheckInTab Component
 *
 * Displays event check-in status and allows self check-in on event day.
 * Matches client-portal EventCheckIn component patterns.
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  SignIn,
  CheckCircle,
  SignOut,
  XCircle,
  Clock,
  CalendarCheck,
} from 'phosphor-react-native';
import { theme } from '@/theme';
import { useEvent, useSelfCheckIn } from '@/hooks/useEvents';
import { Skeleton, Card, Button, EmptyState } from '@/components/common';
import { formatCardDate } from '@/utils/formatting';
import type { CheckInStatus, EventDetail } from '@/types/events.types';

export interface CheckInTabProps {
  eventId: number;
}

interface StatusConfig {
  label: string;
  color: string;
  backgroundColor: string;
  icon: React.ReactNode;
  description: string;
}

const getStatusConfig = (status: CheckInStatus): StatusConfig => {
  switch (status) {
    case 'PENDING':
      return {
        label: 'Pending Check-in',
        color: theme.colors.warning[700],
        backgroundColor: theme.colors.warning[50],
        icon: <Clock size={24} color={theme.colors.warning[600]} weight="duotone" />,
        description: 'Your event is ready for check-in on the event day.',
      };
    case 'CHECKED_IN':
      return {
        label: 'Checked In',
        color: theme.colors.success[700],
        backgroundColor: theme.colors.success[50],
        icon: <CheckCircle size={24} color={theme.colors.success[600]} weight="fill" />,
        description: 'You have successfully checked in for this event.',
      };
    case 'CHECKED_OUT':
      return {
        label: 'Checked Out',
        color: theme.colors.neutral[700],
        backgroundColor: theme.colors.neutral[100],
        icon: <SignOut size={24} color={theme.colors.neutral[600]} weight="duotone" />,
        description: 'This event has been completed and checked out.',
      };
    case 'NO_SHOW':
      return {
        label: 'No Show',
        color: theme.colors.error[700],
        backgroundColor: theme.colors.error[50],
        icon: <XCircle size={24} color={theme.colors.error[600]} weight="fill" />,
        description: 'This event was marked as a no-show.',
      };
    default:
      return {
        label: 'Unknown',
        color: theme.colors.neutral[700],
        backgroundColor: theme.colors.neutral[100],
        icon: <Clock size={24} color={theme.colors.neutral[600]} />,
        description: '',
      };
  }
};

export function CheckInTab({ eventId }: CheckInTabProps) {
  const { data: event, isLoading, refetch, isRefetching } = useEvent(eventId);
  const selfCheckIn = useSelfCheckIn();
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  const handleCheckIn = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsCheckingIn(true);

    try {
      await selfCheckIn.mutateAsync(eventId);
    } finally {
      setIsCheckingIn(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Skeleton variant="rounded" height={200} style={styles.skeleton} />
        <Skeleton variant="rounded" height={100} style={styles.skeleton} />
      </View>
    );
  }

  if (!event) {
    return (
      <EmptyState
        icon="calendar"
        title="Event Not Found"
        description="Unable to load event details for check-in."
      />
    );
  }

  const statusConfig = getStatusConfig(event.check_in_status);

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          colors={[theme.colors.primary[500]]}
          tintColor={theme.colors.primary[500]}
        />
      }
    >
      <Card style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <SignIn size={24} color={theme.colors.primary[500]} weight="duotone" />
          </View>
          <Text style={styles.title}>Event Check-in</Text>
        </View>

        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.backgroundColor }]}>
          {statusConfig.icon}
          <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>

        {/* Status Description */}
        <View style={[styles.alertBox, { backgroundColor: statusConfig.backgroundColor }]}>
          <Text style={[styles.alertText, { color: statusConfig.color }]}>
            {statusConfig.description}
          </Text>
        </View>

        {/* Time Information */}
        <View style={styles.timeSection}>
          <View style={styles.timeRow}>
            <CalendarCheck size={18} color={theme.colors.neutral[500]} />
            <Text style={styles.timeLabel}>Scheduled Check-in:</Text>
            <Text style={styles.timeValue}>
              {event.scheduled_check_in_time
                ? formatCardDate(event.scheduled_check_in_time)
                : formatCardDate(event.start_date)}
            </Text>
          </View>

          {event.actual_check_in_time && (
            <View style={styles.timeRow}>
              <CheckCircle size={18} color={theme.colors.success[500]} weight="fill" />
              <Text style={styles.timeLabel}>Actual Check-in:</Text>
              <Text style={[styles.timeValue, styles.successText]}>
                {formatCardDate(event.actual_check_in_time)}
              </Text>
            </View>
          )}
        </View>

        {/* Check-in Button */}
        {event.can_self_check_in && (
          <View style={styles.actionSection}>
            <Button
              onPress={handleCheckIn}
              variant="primary"
              loading={isCheckingIn || selfCheckIn.isPending}
              disabled={isCheckingIn || selfCheckIn.isPending}
              style={styles.checkInButton}
            >
              {isCheckingIn || selfCheckIn.isPending ? 'Checking In...' : 'Check In Now'}
            </Button>
            <Text style={styles.checkInHint}>
              Check-in is available on your event day only
            </Text>
          </View>
        )}

        {/* Not Yet Time Message */}
        {event.check_in_status === 'PENDING' && !event.can_self_check_in && (
          <View style={styles.infoBox}>
            <Clock size={20} color={theme.colors.primary[600]} />
            <Text style={styles.infoText}>
              Check-in will be available on your event day. Please return on{' '}
              <Text style={styles.infoBold}>
                {formatCardDate(event.scheduled_check_in_time || event.start_date).split(',')[0]}
              </Text>{' '}
              to check in.
            </Text>
          </View>
        )}

        {/* Success Message for Checked In */}
        {event.check_in_status === 'CHECKED_IN' && (
          <View style={styles.successBox}>
            <CheckCircle size={20} color={theme.colors.success[600]} weight="fill" />
            <Text style={styles.successBoxText}>
              You checked in at {formatCardDate(event.actual_check_in_time)}. Enjoy your event!
            </Text>
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    padding: theme.spacing.md,
  },
  skeleton: {
    marginBottom: theme.spacing.md,
  },
  card: {
    padding: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  title: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.xl,
    color: theme.colors.neutral[800],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  statusLabel: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.sm,
  },
  alertBox: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  alertText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.md,
    lineHeight: 22,
  },
  timeSection: {
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  timeLabel: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[600],
  },
  timeValue: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[800],
  },
  successText: {
    color: theme.colors.success[600],
  },
  actionSection: {
    marginBottom: theme.spacing.md,
  },
  checkInButton: {
    marginBottom: theme.spacing.sm,
  },
  checkInHint: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[500],
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.primary[50],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  infoText: {
    flex: 1,
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.primary[700],
    lineHeight: 22,
  },
  infoBold: {
    fontFamily: theme.typography.fonts.semibold,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.success[50],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  successBoxText: {
    flex: 1,
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.success[700],
    lineHeight: 22,
  },
});

export default CheckInTab;
