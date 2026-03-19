// design-system/visualizations/EventAvailabilityCalendar/useEventAvailabilityCalendarLogic.ts

import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
  isBefore,
  isAfter,
  startOfDay,
  differenceInDays,
  addDays,
} from 'date-fns';
import type { EventData, AvailabilitySlot, EventAvailabilityCalendarProps } from './types';

interface UseEventAvailabilityCalendarLogicParams {
  events: EventData[];
  selectedDate?: Date;
  onDateSelect?: EventAvailabilityCalendarProps['onDateSelect'];
  onMonthChange?: EventAvailabilityCalendarProps['onMonthChange'];
  minAdvanceBookingDays: number;
  maxAdvanceBookingDays: number;
  isRangeMode: boolean;
  selectedEndDate?: Date;
  minRangeDays: number;
  maxRangeDays: number;
  onRangeSelect?: EventAvailabilityCalendarProps['onRangeSelect'];
}

export function useEventAvailabilityCalendarLogic({
  events,
  selectedDate,
  onDateSelect,
  onMonthChange,
  minAdvanceBookingDays,
  maxAdvanceBookingDays,
  isRangeMode,
  selectedEndDate,
  minRangeDays,
  maxRangeDays,
  onRangeSelect,
}: UseEventAvailabilityCalendarLogicParams) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  // Track if we're selecting the end date in range mode
  const [isSelectingEndDate, setIsSelectingEndDate] = useState(false);

  // Calculate availability for each day
  const monthAvailability = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const monthDays = eachDayOfInterval({ start, end });

    return monthDays.map((date) => {
      // Filter events by comparing date portions only
      // API returns datetimes already in Philippines timezone format (e.g., "2025-10-30T14:00:00")
      const dayEvents = events.filter((event) => {
        // Extract just the date portion (YYYY-MM-DD) from the event's start_date
        const eventDateStr = event.start_date.split('T')[0];
        const calendarDateStr = format(date, 'yyyy-MM-dd');
        // Compare date strings directly
        return eventDateStr === calendarDateStr;
      });

      // Check booking constraints from backend business rules
      const today = new Date();
      const daysDiff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      const isPastDate = isBefore(date, startOfDay(today));
      const tooSoon = daysDiff < minAdvanceBookingDays;
      const tooFar = daysDiff > maxAdvanceBookingDays;
      // Block date if ANY CONFIRMED event exists (business requirement)
      const hasConfirmedEvent = dayEvents.some((e) => e.status === 'CONFIRMED');
      const fullyBooked = hasConfirmedEvent;

      let isBookable = true;
      let reason = '';

      if (isPastDate) {
        isBookable = false;
        reason = 'Past date';
      } else if (tooSoon) {
        isBookable = false;
        reason = `Minimum ${minAdvanceBookingDays} days advance booking required`;
      } else if (tooFar) {
        isBookable = false;
        reason = `Maximum ${maxAdvanceBookingDays} days advance booking allowed`;
      } else if (fullyBooked) {
        isBookable = false;
        reason = 'Fully booked';
      }

      return {
        date,
        isAvailable: !fullyBooked && !isPastDate && !tooSoon && !tooFar,
        hasEvents: dayEvents,
        isBookable,
        reason,
      };
    });
  }, [currentMonth, events, minAdvanceBookingDays, maxAdvanceBookingDays]);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const monthDays = eachDayOfInterval({ start, end });

    // Add padding days for calendar grid
    const startPadding = getDay(start);
    const endPadding = 6 - getDay(end);

    const paddingStart = Array(startPadding)
      .fill(null)
      .map((_, i) => new Date(start.getFullYear(), start.getMonth(), -startPadding + i + 1));
    const paddingEnd = Array(endPadding)
      .fill(null)
      .map((_, i) => new Date(end.getFullYear(), end.getMonth() + 1, i + 1));

    return [...paddingStart, ...monthDays, ...paddingEnd];
  }, [currentMonth]);

  const handlePrevMonth = () => {
    const newMonth = subMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    if (onMonthChange) {
      onMonthChange(newMonth);
    }
  };

  const handleNextMonth = () => {
    const newMonth = addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    if (onMonthChange) {
      onMonthChange(newMonth);
    }
  };

  // Helper functions for range selection
  const isDateInRange = (date: Date): boolean => {
    if (!isRangeMode || !selectedDate || !selectedEndDate) return false;
    const start = startOfDay(selectedDate);
    const end = startOfDay(selectedEndDate);
    const current = startOfDay(date);
    return isAfter(current, start) && isBefore(current, end);
  };

  const isDateOutOfRange = (date: Date): boolean => {
    if (!isRangeMode || !selectedDate || !isSelectingEndDate) return false;
    const start = startOfDay(selectedDate);
    const current = startOfDay(date);
    // Out of range if before start date or more than maxRangeDays from start
    if (isBefore(current, start)) return true;
    const daysDiff = differenceInDays(current, start);
    return daysDiff > maxRangeDays - 1; // -1 because the range includes both start and end
  };

  const getMaxEndDate = (): Date | null => {
    if (!selectedDate) return null;
    return addDays(selectedDate, maxRangeDays - 1);
  };

  const handleDateClick = (date: Date, slot: AvailabilitySlot) => {
    if (!slot.isBookable) return;

    if (isRangeMode) {
      // Range selection logic
      if (!isSelectingEndDate || !selectedDate) {
        // First click: select start date
        if (onDateSelect) {
          onDateSelect(date, slot);
        }
        setIsSelectingEndDate(true);
      } else {
        // Second click: select end date
        // Check if the date is within the allowed range
        const daysDiff = differenceInDays(date, selectedDate);

        // Allow same-day selection when minRangeDays is 1 (single-day events)
        if (daysDiff === 0 && minRangeDays === 1) {
          if (onRangeSelect) {
            onRangeSelect(selectedDate, date); // Same start and end date
          }
          setIsSelectingEndDate(false);
          return;
        }

        if (daysDiff < 0) {
          // If clicking before start date, reset and select as new start
          if (onDateSelect) {
            onDateSelect(date, slot);
          }
          setIsSelectingEndDate(true);
          return;
        }
        if (daysDiff > maxRangeDays - 1) {
          // Out of range, don't allow
          return;
        }
        // Valid end date selected
        if (onRangeSelect) {
          onRangeSelect(selectedDate, date);
        }
        setIsSelectingEndDate(false);
      }
    } else {
      // Single date selection (original behavior)
      if (onDateSelect) {
        onDateSelect(date, slot);
      }
    }
  };

  const getSlotForDate = (date: Date): AvailabilitySlot => {
    return (
      monthAvailability.find((slot) => isSameDay(slot.date, date)) || {
        date,
        isAvailable: false,
        hasEvents: [],
        isBookable: false,
        reason: 'No data',
      }
    );
  };

  return {
    currentMonth,
    isSelectingEndDate,
    monthAvailability,
    days,
    handlePrevMonth,
    handleNextMonth,
    isDateInRange,
    isDateOutOfRange,
    getMaxEndDate,
    handleDateClick,
    getSlotForDate,
  };
}
