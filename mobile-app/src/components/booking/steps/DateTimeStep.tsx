/**
 * DateTimeStep
 *
 * Date and time selection with calendar and availability checking.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Calendar, Clock, Info, Check, Warning } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import { useBookingContext } from '@/contexts/BookingContext';
import { formatPhilippinesTime, formatDateForPicker, getTimezoneNotice } from '@/utils/timezone';
import { format, addDays, isBefore, isAfter, startOfDay, parseISO } from 'date-fns';
import type { StepComponentProps } from '../StepRenderer';
import type { DateTimeStepData, DateTimeStepConfiguration } from '@/types/booking';
import * as Haptics from 'expo-haptics';

type DateTimeStepProps = StepComponentProps<DateTimeStepData, DateTimeStepConfiguration>;

// Simple calendar component - in production, use react-native-calendars
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function DateTimeStep({
  step,
  data,
  configuration,
  onDataChange,
  validationErrors,
}: DateTimeStepProps) {
  const { state } = useBookingContext();

  const [selectedDate, setSelectedDate] = useState<Date | null>(
    data.start_date ? parseISO(data.start_date) : null
  );
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<'available' | 'unavailable' | 'unknown'>('unknown');

  const {
    allow_multi_day = false,
    min_event_days = 1,
    max_event_days = 1,
    blocked_dates = [],
    buffer_before_hours = 24,
  } = configuration || {};

  const timezoneNotice = getTimezoneNotice('booking');
  const minDate = addDays(new Date(), Math.ceil(buffer_before_hours / 24));

  useEffect(() => {
    if (data.start_date) {
      setSelectedDate(parseISO(data.start_date));
    }
  }, [data.start_date]);

  const handleDateSelect = useCallback(async (date: Date) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDate(date);
    setAvailabilityStatus('unknown');

    const dateString = formatDateForPicker(date);
    onDataChange({
      start_date: dateString,
      end_date: allow_multi_day ? data.end_date : dateString,
    });

    // Simulate availability check
    setCheckingAvailability(true);
    setTimeout(() => {
      setCheckingAvailability(false);
      setAvailabilityStatus('available');
    }, 500);
  }, [allow_multi_day, data.end_date, onDataChange]);

  const isDateBlocked = (date: Date): boolean => {
    const dateStr = formatDateForPicker(date);
    return blocked_dates.includes(dateStr);
  };

  const isDateDisabled = (date: Date): boolean => {
    return isBefore(startOfDay(date), startOfDay(minDate)) || isDateBlocked(date);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty days for the start of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days in the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Select Date</Text>
        <Text style={styles.subtitle}>Choose when you'd like to host your event</Text>
      </View>

      {/* Timezone Notice */}
      <View style={styles.timezoneNotice}>
        <Info size={16} color={colors.tertiary.teal} />
        <Text style={styles.timezoneText}>{timezoneNotice}</Text>
      </View>

      {/* Calendar */}
      <View style={styles.calendarContainer}>
        {/* Month Navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity
            style={styles.monthNavButton}
            onPress={goToPreviousMonth}
          >
            <Text style={styles.monthNavButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </Text>
          <TouchableOpacity
            style={styles.monthNavButton}
            onPress={goToNextMonth}
          >
            <Text style={styles.monthNavButtonText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Day Headers */}
        <View style={styles.dayHeaders}>
          {DAYS.map((day) => (
            <View key={day} style={styles.dayHeader}>
              <Text style={styles.dayHeaderText}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {days.map((day, index) => {
            if (!day) {
              return <View key={`empty-${index}`} style={styles.dayCell} />;
            }

            const isSelected = selectedDate && formatDateForPicker(day) === formatDateForPicker(selectedDate);
            const isDisabled = isDateDisabled(day);
            const isBlocked = isDateBlocked(day);
            const isToday = formatDateForPicker(day) === formatDateForPicker(new Date());

            return (
              <TouchableOpacity
                key={day.toISOString()}
                style={[
                  styles.dayCell,
                  isSelected && styles.dayCellSelected,
                  isDisabled && styles.dayCellDisabled,
                  isBlocked && styles.dayCellBlocked,
                  isToday && !isSelected && styles.dayCellToday,
                ]}
                onPress={() => !isDisabled && handleDateSelect(day)}
                disabled={isDisabled}
              >
                <Text
                  style={[
                    styles.dayText,
                    isSelected && styles.dayTextSelected,
                    isDisabled && styles.dayTextDisabled,
                    isBlocked && styles.dayTextBlocked,
                    isToday && !isSelected && styles.dayTextToday,
                  ]}
                >
                  {day.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendDotSelected]} />
            <Text style={styles.legendText}>Selected</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendDotBlocked]} />
            <Text style={styles.legendText}>Unavailable</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendDotToday]} />
            <Text style={styles.legendText}>Today</Text>
          </View>
        </View>
      </View>

      {/* Selected Date Info */}
      {selectedDate && (
        <View style={styles.selectedInfo}>
          <View style={styles.selectedInfoHeader}>
            <Calendar size={20} color={colors.primary.black} />
            <Text style={styles.selectedInfoTitle}>Selected Date</Text>
          </View>
          <Text style={styles.selectedDate}>
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </Text>

          {/* Availability Status */}
          {checkingAvailability ? (
            <View style={styles.availabilityStatus}>
              <ActivityIndicator size="small" color={colors.tertiary.teal} />
              <Text style={styles.availabilityText}>Checking availability...</Text>
            </View>
          ) : availabilityStatus === 'available' ? (
            <View style={[styles.availabilityStatus, styles.availabilityAvailable]}>
              <Check size={16} color={colors.secondary.forest} weight="bold" />
              <Text style={[styles.availabilityText, styles.availabilityTextAvailable]}>
                This date is available
              </Text>
            </View>
          ) : availabilityStatus === 'unavailable' ? (
            <View style={[styles.availabilityStatus, styles.availabilityUnavailable]}>
              <Warning size={16} color={colors.semantic.error} />
              <Text style={[styles.availabilityText, styles.availabilityTextUnavailable]}>
                This date is not available
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Validation Error */}
      {validationErrors?.start_date && (
        <Text style={styles.errorText}>
          {validationErrors.start_date[0]}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing.xxxl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typeScale.headlineSmall,
    color: colors.primary.black,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
  },
  timezoneNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tertiary.tealSubtle,
    padding: spacing.sm,
    borderRadius: layout.borderRadius.sm,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  timezoneText: {
    ...typeScale.labelSmall,
    color: colors.tertiary.tealDark,
    flex: 1,
  },
  calendarContainer: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.cardBorderRadius,
    padding: spacing.md,
    ...shadows.sm,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  monthNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavButtonText: {
    fontSize: 24,
    color: colors.primary.black,
    lineHeight: 28,
  },
  monthTitle: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  dayHeaderText: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: layout.borderRadius.sm,
  },
  dayCellSelected: {
    backgroundColor: colors.primary.black,
  },
  dayCellDisabled: {
    opacity: 0.3,
  },
  dayCellBlocked: {
    backgroundColor: colors.semantic.error + '10',
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: colors.tertiary.teal,
  },
  dayText: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
  },
  dayTextSelected: {
    color: colors.neutral.white,
    fontWeight: '600',
  },
  dayTextDisabled: {
    color: colors.neutral.gray,
  },
  dayTextBlocked: {
    color: colors.semantic.error,
    textDecorationLine: 'line-through',
  },
  dayTextToday: {
    color: colors.tertiary.teal,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.warmGray,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendDotSelected: {
    backgroundColor: colors.primary.black,
  },
  legendDotBlocked: {
    backgroundColor: colors.semantic.error + '40',
  },
  legendDotToday: {
    borderWidth: 2,
    borderColor: colors.tertiary.teal,
    backgroundColor: 'transparent',
  },
  legendText: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  selectedInfo: {
    marginTop: spacing.lg,
    backgroundColor: colors.neutral.sand,
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
    gap: spacing.sm,
  },
  selectedInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectedInfoTitle: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
  },
  selectedDate: {
    ...typeScale.bodyLarge,
    color: colors.primary.black,
    fontWeight: '600',
  },
  availabilityStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.warmGray,
  },
  availabilityAvailable: {},
  availabilityUnavailable: {},
  availabilityText: {
    ...typeScale.labelMedium,
    color: colors.tertiary.teal,
  },
  availabilityTextAvailable: {
    color: colors.secondary.forest,
  },
  availabilityTextUnavailable: {
    color: colors.semantic.error,
  },
  errorText: {
    ...typeScale.labelSmall,
    color: colors.semantic.error,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});

export default DateTimeStep;
