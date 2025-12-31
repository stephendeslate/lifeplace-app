/**
 * SessionTimer
 *
 * Session expiry countdown display with warning states.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Timer, Warning } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import { getSessionRemainingTime, formatSessionTime } from '@/utils/bookingHelpers';

interface SessionTimerProps {
  expiresAt: string;
  onExpired?: () => void;
  onExtendSession?: () => void;
  warningThresholdMinutes?: number;
  criticalThresholdMinutes?: number;
  showExtendOption?: boolean;
  compact?: boolean;
}

type TimerState = 'normal' | 'warning' | 'critical' | 'expired';

export function SessionTimer({
  expiresAt,
  onExpired,
  onExtendSession,
  warningThresholdMinutes = 10,
  criticalThresholdMinutes = 5,
  showExtendOption = false,
  compact = false,
}: SessionTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(() => getSessionRemainingTime(expiresAt));
  const [timerState, setTimerState] = useState<TimerState>('normal');

  // Use ref for onExpired to avoid recreating updateTimer when the callback changes
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;

  // Track if we've already called onExpired to prevent multiple calls
  const hasExpiredRef = useRef(false);

  const updateTimer = useCallback(() => {
    const remaining = getSessionRemainingTime(expiresAt);

    // Only update state if values actually changed
    setTimeRemaining(prev => {
      if (prev.hours === remaining.hours &&
          prev.minutes === remaining.minutes &&
          prev.seconds === remaining.seconds &&
          prev.isExpired === remaining.isExpired) {
        return prev;
      }
      return remaining;
    });

    const totalMinutes = remaining.hours * 60 + remaining.minutes;

    if (remaining.isExpired) {
      setTimerState('expired');
      if (!hasExpiredRef.current) {
        hasExpiredRef.current = true;
        onExpiredRef.current?.();
      }
    } else if (totalMinutes <= criticalThresholdMinutes) {
      setTimerState('critical');
    } else if (totalMinutes <= warningThresholdMinutes) {
      setTimerState('warning');
    } else {
      setTimerState('normal');
    }
  }, [expiresAt, warningThresholdMinutes, criticalThresholdMinutes]);

  useEffect(() => {
    // Reset expired state when expiresAt changes
    hasExpiredRef.current = false;
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [updateTimer]);

  const formattedTime = formatSessionTime(expiresAt);

  const getStateStyles = () => {
    switch (timerState) {
      case 'warning':
        return {
          container: styles.containerWarning,
          text: styles.textWarning,
          icon: colors.semantic.warning,
        };
      case 'critical':
        return {
          container: styles.containerCritical,
          text: styles.textCritical,
          icon: colors.semantic.error,
        };
      case 'expired':
        return {
          container: styles.containerExpired,
          text: styles.textExpired,
          icon: colors.semantic.error,
        };
      default:
        return {
          container: styles.containerNormal,
          text: styles.textNormal,
          icon: colors.neutral.darkGray,
        };
    }
  };

  const stateStyles = getStateStyles();

  if (compact) {
    return (
      <View style={[styles.compactContainer, stateStyles.container]}>
        <Timer size={14} color={stateStyles.icon} weight="bold" />
        <Text style={[styles.compactText, stateStyles.text]}>
          {timerState === 'expired' ? 'Expired' : formattedTime}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, stateStyles.container]}>
      <View style={styles.iconContainer}>
        {timerState === 'critical' || timerState === 'expired' ? (
          <Warning size={20} color={stateStyles.icon} weight="fill" />
        ) : (
          <Timer size={20} color={stateStyles.icon} weight="bold" />
        )}
      </View>

      <View style={styles.textContainer}>
        <Text style={[styles.label, stateStyles.text]}>
          {timerState === 'expired' ? 'Session Expired' : 'Session expires in'}
        </Text>
        {timerState !== 'expired' && (
          <Text style={[styles.time, stateStyles.text]}>{formattedTime}</Text>
        )}
      </View>

      {showExtendOption && timerState !== 'expired' && onExtendSession && (
        <TouchableOpacity
          style={styles.extendButton}
          onPress={onExtendSession}
          activeOpacity={0.7}
        >
          <Text style={styles.extendButtonText}>Extend</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: layout.borderRadius.md,
    gap: spacing.sm,
  },
  containerNormal: {
    backgroundColor: colors.neutral.sand,
  },
  containerWarning: {
    backgroundColor: '#FEF6E7',
  },
  containerCritical: {
    backgroundColor: '#FCE8E8',
  },
  containerExpired: {
    backgroundColor: '#FCE8E8',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.alpha.white80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  label: {
    ...typeScale.labelSmall,
  },
  textNormal: {
    color: colors.neutral.darkGray,
  },
  textWarning: {
    color: '#AA7032',
  },
  textCritical: {
    color: colors.semantic.error,
  },
  textExpired: {
    color: colors.semantic.error,
  },
  time: {
    ...typeScale.titleSmall,
    fontWeight: '700',
  },
  extendButton: {
    backgroundColor: colors.primary.black,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: layout.borderRadius.sm,
  },
  extendButtonText: {
    ...typeScale.labelSmall,
    color: colors.neutral.white,
    fontWeight: '600',
  },

  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: layout.borderRadius.full,
    gap: spacing.xxs,
  },
  compactText: {
    ...typeScale.labelSmall,
    fontWeight: '600',
  },
});

export default SessionTimer;
