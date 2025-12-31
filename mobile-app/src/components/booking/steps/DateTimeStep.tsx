/**
 * DateTimeStep
 *
 * Date and time selection with calendar and real availability checking.
 * Aligned with: frontend/client-portal/src/components/booking/steps/IntelligentDateTimeStep.tsx
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Calendar, Clock, Info, Check, Warning, CheckCircle } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import { useBookingContext } from '@/contexts/BookingContext';
import { formatDateForPicker, getTimezoneNotice } from '@/utils/timezone';
import { format, addDays, isBefore, startOfDay, parseISO, differenceInDays } from 'date-fns';
import { useEventAvailability } from '@/hooks/useEventAvailability';
import { VenuesAPI } from '@/apis/booking';
import type { StepComponentProps } from '../StepRenderer';
import type { DateTimeStepData, DateTimeStepConfiguration, VenuePublic } from '@/types/booking';
import * as Haptics from 'expo-haptics';

type DateTimeStepProps = StepComponentProps<DateTimeStepData, DateTimeStepConfiguration>;

// Calendar constants
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

  // Core state
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    data.start_date ? parseISO(data.start_date) : null
  );
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(
    data.end_date ? parseISO(data.end_date) : null
  );
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [venue, setVenue] = useState<VenuePublic | null>(null);
  const [venueLoading, setVenueLoading] = useState(false);

  // Configuration
  const {
    allow_multi_day = false,
    min_event_days = 1,
    max_event_days = 7,
    blocked_dates: configBlockedDates = [],
    buffer_before_hours = 24,
  } = configuration || {};

  // Get event type ID from flow (event_type is the ID directly)
  const eventTypeId = state.currentFlow?.event_type;

  // Fetch real availability from API
  const {
    blockedDates: apiBlockedDates,
    isLoading: availabilityLoading,
    isError: availabilityError,
  } = useEventAvailability({
    currentMonth,
    eventTypeId,
    enabled: true,
  });

  // Combine config blocked dates with API blocked dates
  const allBlockedDates = useMemo(() => {
    return [...new Set([...configBlockedDates, ...apiBlockedDates])];
  }, [configBlockedDates, apiBlockedDates]);

  const timezoneNotice = getTimezoneNotice('booking');
  const minDate = addDays(new Date(), Math.ceil(buffer_before_hours / 24));

  // Load venue info if a package is selected (for check-in/checkout times)
  useEffect(() => {
    const selectedPackages = state.stepData.package_selection?.selected_packages;
    if (selectedPackages && selectedPackages.length > 0 && selectedPackages[0].product_id) {
      setVenueLoading(true);
      // Get the primary venue from the first package
      // In a real implementation, this would come from the package data
      // For now, we'll use the venue_id from step data if available
      const venueId = data.venue_id;
      if (venueId) {
        VenuesAPI.getVenue(venueId)
          .then((v) => setVenue(v as VenuePublic))
          .catch(console.error)
          .finally(() => setVenueLoading(false));
      } else {
        setVenueLoading(false);
      }
    }
  }, [state.stepData.package_selection, data.venue_id]);

  // Sync initial data
  useEffect(() => {
    if (data.start_date && !selectedDate) {
      setSelectedDate(parseISO(data.start_date));
    }
    if (data.end_date && !selectedEndDate) {
      setSelectedEndDate(parseISO(data.end_date));
    }
  }, [data.start_date, data.end_date]);

  // Handle date selection
  const handleDateSelect = useCallback(async (date: Date) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (allow_multi_day) {
      // Range mode: first click sets start, second click sets end
      if (!selectedDate || selectedEndDate) {
        // Start new selection
        setSelectedDate(date);
        setSelectedEndDate(null);
        onDataChange({
          start_date: formatDateForPicker(date),
          end_date: undefined,
          venue_id: venue?.id,
        });
      } else {
        // Set end date
        if (isBefore(date, selectedDate)) {
          // If clicking before start, swap
          setSelectedEndDate(selectedDate);
          setSelectedDate(date);
          onDataChange({
            start_date: formatDateForPicker(date),
            end_date: formatDateForPicker(selectedDate),
            venue_id: venue?.id,
          });
        } else {
          // Check range constraints
          const daysDiff = differenceInDays(date, selectedDate) + 1;
          if (daysDiff > max_event_days) {
            // Limit to max days
            const maxEndDate = addDays(selectedDate, max_event_days - 1);
            setSelectedEndDate(maxEndDate);
            onDataChange({
              start_date: formatDateForPicker(selectedDate),
              end_date: formatDateForPicker(maxEndDate),
              venue_id: venue?.id,
            });
          } else {
            setSelectedEndDate(date);
            onDataChange({
              start_date: formatDateForPicker(selectedDate),
              end_date: formatDateForPicker(date),
              venue_id: venue?.id,
            });
          }
        }
      }
    } else {
      // Single date mode
      setSelectedDate(date);
      setSelectedEndDate(null);
      onDataChange({
        start_date: formatDateForPicker(date),
        end_date: undefined,
        venue_id: venue?.id,
      });
    }
  }, [allow_multi_day, selectedDate, selectedEndDate, max_event_days, venue, onDataChange]);

  // Check if a date is blocked
  const isDateBlocked = useCallback((date: Date): boolean => {
    const dateStr = formatDateForPicker(date);
    return allBlockedDates.includes(dateStr);
  }, [allBlockedDates]);

  // Check if a date is disabled
  const isDateDisabled = useCallback((date: Date): boolean => {
    return isBefore(startOfDay(date), startOfDay(minDate)) || isDateBlocked(date);
  }, [minDate, isDateBlocked]);

  // Check if a date is in the selected range
  const isInRange = useCallback((date: Date): boolean => {
    if (!selectedDate || !selectedEndDate || !allow_multi_day) return false;
    return date > selectedDate && date < selectedEndDate;
  }, [selectedDate, selectedEndDate, allow_multi_day]);

  // Get days in current month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

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

  // Calculate selection summary
  const selectionSummary = useMemo(() => {
    if (!selectedDate) return null;

    const startDateStr = format(selectedDate, 'EEEE, MMMM d, yyyy');

    if (allow_multi_day && selectedEndDate) {
      const endDateStr = format(selectedEndDate, 'EEEE, MMMM d, yyyy');
      const nightCount = differenceInDays(selectedEndDate, selectedDate);
      const dayCount = nightCount + 1;
      return {
        date: `${startDateStr} - ${endDateStr}`,
        nightCount,
        dayCount,
        isRange: true,
      };
    }

    return {
      date: startDateStr,
      nightCount: 0,
      dayCount: 1,
      isRange: false,
    };
  }, [selectedDate, selectedEndDate, allow_multi_day]);

  // Check if selection is complete
  const isComplete = useMemo(() => {
    if (allow_multi_day) {
      return !!selectedDate && !!selectedEndDate;
    }
    return !!selectedDate;
  }, [selectedDate, selectedEndDate, allow_multi_day]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {allow_multi_day ? 'Select Your Event Dates' : 'Select Your Event Date'}
        </Text>
        <Text style={styles.subtitle}>
          {allow_multi_day
            ? `Choose the start and end dates for your event (up to ${max_event_days} ${max_event_days === 1 ? 'day' : 'days'})`
            : 'Choose the date for your event'}
        </Text>
      </View>

      {/* Timezone Notice */}
      <View style={styles.timezoneNotice}>
        <Info size={16} color={colors.tertiary.teal} />
        <Text style={styles.timezoneText}>{timezoneNotice}</Text>
      </View>

      {/* Loading indicator for availability */}
      {availabilityLoading && (
        <View style={styles.loadingNotice}>
          <ActivityIndicator size="small" color={colors.tertiary.teal} />
          <Text style={styles.loadingText}>Loading availability...</Text>
        </View>
      )}

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

            const dateStr = formatDateForPicker(day);
            const isStart = selectedDate && dateStr === formatDateForPicker(selectedDate);
            const isEnd = selectedEndDate && dateStr === formatDateForPicker(selectedEndDate);
            const isSelected = isStart || isEnd;
            const inRange = isInRange(day);
            const isDisabled = isDateDisabled(day);
            const isBlocked = isDateBlocked(day);
            const isToday = dateStr === formatDateForPicker(new Date());

            return (
              <TouchableOpacity
                key={day.toISOString()}
                style={[
                  styles.dayCell,
                  inRange && styles.dayCellInRange,
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
                    inRange && styles.dayTextInRange,
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
            <Text style={styles.selectedInfoTitle}>
              {allow_multi_day && selectedEndDate ? 'Selected Dates' : 'Selected Date'}
            </Text>
          </View>
          <Text style={styles.selectedDate}>
            {selectionSummary?.date}
          </Text>

          {/* Range Info */}
          {selectionSummary?.isRange && (
            <Text style={styles.rangeInfo}>
              {selectionSummary.dayCount} {selectionSummary.dayCount === 1 ? 'Day' : 'Days'}
              {selectionSummary.nightCount >= 1 &&
                ` • ${selectionSummary.nightCount} ${selectionSummary.nightCount === 1 ? 'Night' : 'Nights'}`}
            </Text>
          )}

          {/* Range Selection Prompt */}
          {allow_multi_day && selectedDate && !selectedEndDate && (
            <View style={styles.promptContainer}>
              <Info size={16} color={colors.tertiary.teal} />
              <Text style={styles.promptText}>Select an end date to complete your range</Text>
            </View>
          )}

          {/* Venue Info */}
          {venue && venue.operating_rules && (
            <View style={styles.venueInfo}>
              <View style={styles.venueInfoHeader}>
                <Clock size={16} color={colors.tertiary.teal} />
                <Text style={styles.venueInfoTitle}>Venue: {venue.name}</Text>
              </View>
              <View style={styles.venueInfoDetails}>
                <Text style={styles.venueInfoText}>
                  Check-in: {VenuesAPI.formatTime(venue.operating_rules.default_check_in_time || '')}
                </Text>
                <Text style={styles.venueInfoText}>
                  Checkout: {VenuesAPI.formatTime(venue.operating_rules.default_check_out_time || '')}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Completion Status */}
      {isComplete && (
        <View style={styles.completionCard}>
          <CheckCircle size={24} color={colors.secondary.forest} weight="fill" />
          <View style={styles.completionContent}>
            <Text style={styles.completionTitle}>
              {selectionSummary?.isRange ? 'Dates Selected' : 'Date Selected'}
            </Text>
            <Text style={styles.completionText}>
              {selectionSummary?.date}
            </Text>
          </View>
        </View>
      )}

      {/* Validation Errors */}
      {validationErrors && Object.keys(validationErrors).length > 0 && (
        <View style={styles.errorContainer}>
          <Warning size={16} color={colors.semantic.error} />
          <View style={styles.errorContent}>
            <Text style={styles.errorTitle}>Please complete your selection:</Text>
            {Object.entries(validationErrors).map(([field, errors]) => (
              <Text key={field} style={styles.errorText}>• {errors[0]}</Text>
            ))}
          </View>
        </View>
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
  loadingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  loadingText: {
    ...typeScale.labelSmall,
    color: colors.tertiary.teal,
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
  dayCellInRange: {
    backgroundColor: colors.primary.black + '15',
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
  dayTextInRange: {
    color: colors.primary.black,
    fontWeight: '500',
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
  rangeInfo: {
    ...typeScale.labelMedium,
    color: colors.neutral.darkGray,
  },
  promptContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.warmGray,
  },
  promptText: {
    ...typeScale.labelMedium,
    color: colors.tertiary.teal,
  },
  venueInfo: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.warmGray,
    gap: spacing.xs,
  },
  venueInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  venueInfoTitle: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
    fontWeight: '600',
  },
  venueInfoDetails: {
    marginLeft: spacing.lg + spacing.sm,
    gap: spacing.xxs,
  },
  venueInfoText: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  completionCard: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.secondary.forest + '10',
    borderWidth: 1,
    borderColor: colors.secondary.forest + '30',
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
  },
  completionContent: {
    flex: 1,
    gap: spacing.xxs,
  },
  completionTitle: {
    ...typeScale.titleSmall,
    color: colors.secondary.forest,
    fontWeight: '600',
  },
  completionText: {
    ...typeScale.bodySmall,
    color: colors.primary.black,
  },
  errorContainer: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.semantic.error + '10',
    borderWidth: 1,
    borderColor: colors.semantic.error + '30',
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
  },
  errorContent: {
    flex: 1,
    gap: spacing.xs,
  },
  errorTitle: {
    ...typeScale.labelMedium,
    color: colors.semantic.error,
    fontWeight: '600',
  },
  errorText: {
    ...typeScale.labelSmall,
    color: colors.semantic.error,
  },
});

export default DateTimeStep;
