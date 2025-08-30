// frontend/admin-crm/src/hooks/useAvailability.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { availabilityApi } from '../apis/availability.api';
import { useToastActions } from '../contexts/ToastContext';

interface ApiError {
  response?: {
    data?: {
      error?: string;
      [key: string]: unknown;
    };
  };
}
import type {
  DateAvailabilityInfo,
  AvailabilityRequest,
  BookingValidationRequest,
  NextAvailableDateRequest,
  AvailabilityFilters,
  CalendarDateInfo,
  AvailabilityStats,
  AvailabilityStatus,
} from '../types/availability.types';

/**
 * Hook for checking single date availability
 */
export const useDateAvailability = (
  request: AvailabilityRequest,
  enabled = true
) => {
  return useQuery({
    queryKey: ['availability', 'date', request],
    queryFn: () => availabilityApi.checkDateAvailability(request),
    enabled: enabled && !!request.start_date,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook for checking date range availability
 */
export const useDateRangeAvailability = (
  startDate: string,
  endDate: string,
  options?: {
    event_type_id?: number;
    booking_flow_id?: number;
  },
  enabled = true
) => {
  return useQuery({
    queryKey: ['availability', 'range', startDate, endDate, options],
    queryFn: () => availabilityApi.checkDateRangeAvailability(startDate, endDate, options),
    enabled: enabled && !!startDate && !!endDate,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

/**
 * Hook for calendar availability with enhanced features
 */
export const useCalendarAvailability = (
  startDate: string,
  endDate: string,
  filters?: AvailabilityFilters,
  enabled = true
) => {

  const query = useQuery({
    queryKey: ['availability', 'calendar', startDate, endDate, filters],
    queryFn: () => availabilityApi.getCalendarAvailability(startDate, endDate, {
      event_type_id: filters?.event_type_id,
      booking_flow_id: filters?.booking_flow_id,
      include_weekends: true,
    }),
    enabled: enabled && !!startDate && !!endDate,
    staleTime: 1 * 60 * 1000, // 1 minute for calendar
    gcTime: 3 * 60 * 1000,
  });

  // Enhanced calendar data with additional computed properties
  const calendarData: CalendarDateInfo[] = useMemo(() => {
    if (!query.data || !Array.isArray(query.data)) return [];

    return query.data.map((item: DateAvailabilityInfo) => {
      const date = new Date(item.date);
      const today = new Date();
      const currentMonth = new Date(startDate);

      return {
        ...item,
        isToday: date.toDateString() === today.toDateString(),
        isCurrentMonth: date.getMonth() === currentMonth.getMonth() && 
                       date.getFullYear() === currentMonth.getFullYear(),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        hasEvents: item.total_events_count > 0,
        eventCount: item.total_events_count,
      };
    });
  }, [query.data, startDate]);

  // Availability statistics
  const stats: AvailabilityStats = useMemo(() => {
    if (!query.data || !Array.isArray(query.data) || query.data.length === 0) {
      return {
        totalDaysChecked: 0,
        availableDays: 0,
        partiallyBookedDays: 0,
        fullyBookedDays: 0,
        blockedDays: 0,
        availabilityRate: 0,
        conflictRate: 0,
        averageConflictsPerDay: 0,
      };
    }

    const total = query.data.length;
    const available = query.data.filter((d: DateAvailabilityInfo) => d.can_book_event).length;
    const partiallyBooked = query.data.filter((d: DateAvailabilityInfo) => d.status === 'partially_booked').length;
    const fullyBooked = query.data.filter((d: DateAvailabilityInfo) => d.status === 'fully_booked').length;
    const blocked = query.data.filter((d: DateAvailabilityInfo) => d.status === 'blocked').length;
    const withConflicts = query.data.filter((d: DateAvailabilityInfo) => d.conflicts?.length > 0).length;
    const totalConflicts = query.data.reduce((sum: number, d: DateAvailabilityInfo) => sum + (d.conflicts?.length || 0), 0);

    return {
      totalDaysChecked: total,
      availableDays: available,
      partiallyBookedDays: partiallyBooked,
      fullyBookedDays: fullyBooked,
      blockedDays: blocked,
      availabilityRate: (available / total) * 100,
      conflictRate: (withConflicts / total) * 100,
      averageConflictsPerDay: totalConflicts / total,
    };
  }, [query.data]);

  return {
    ...query,
    calendarData,
    stats,
    // Helper functions
    getDateAvailability: useCallback((date: string) => {
      return calendarData.find(item => item.date === date);
    }, [calendarData]),
    getAvailabilityColor: useCallback((status: AvailabilityStatus) => {
      switch (status) {
        case 'available':
          return 'success';
        case 'partially_booked':
          return 'warning';
        case 'fully_booked':
          return 'error';
        case 'blocked':
          return 'error';
        case 'outside_range':
          return 'default';
        default:
          return 'default';
      }
    }, []),
  };
};

/**
 * Hook for booking validation
 */
export const useBookingValidation = () => {
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (request: BookingValidationRequest) => 
      availabilityApi.validateBookingRequest(request),
    onSuccess: (result) => {
      if (result.is_valid) {
        showSuccess('Validation Success', 'Booking request is valid');
      } else {
        showError('Validation Failed', result.errors.join(', '));
      }
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.error || 'Validation failed';
      showError('Validation Error', message);
    },
  });
};

/**
 * Hook for finding next available date
 */
export const useNextAvailableDate = (
  request: NextAvailableDateRequest,
  enabled = true
) => {
  return useQuery({
    queryKey: ['availability', 'next', request],
    queryFn: () => availabilityApi.getNextAvailableDate(request),
    enabled: enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook for batch availability checking
 */
export const useBatchAvailability = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dates, options }: { 
      dates: string[], 
      options?: { event_type_id?: number; booking_flow_id?: number; }
    }) => availabilityApi.batchCheckAvailability(dates, options),
    onSuccess: (results, variables) => {
      // Cache individual results
      results.forEach(result => {
        queryClient.setQueryData(
          ['availability', 'date', { 
            start_date: result.date,
            ...variables.options 
          }],
          result
        );
      });
    },
  });
};

/**
 * Hook for monthly availability summary
 */
export const useMonthlyAvailability = (
  year: number,
  month: number,
  options?: {
    event_type_id?: number;
    booking_flow_id?: number;
  },
  enabled = true
) => {
  return useQuery({
    queryKey: ['availability', 'monthly', year, month, options],
    queryFn: () => availabilityApi.getMonthlyAvailabilitySummary(year, month, options),
    enabled: enabled && !!year && !!month,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000, // Cache monthly data longer
  });
};

/**
 * Hook for cache management
 */
export const useAvailabilityCache = () => {
  const queryClient = useQueryClient();
  const { showSuccess } = useToastActions();

  const invalidateCacheMutation = useMutation({
    mutationFn: (dateRange?: { start_date: string; end_date: string }) => 
      availabilityApi.invalidateCache(dateRange),
    onSuccess: () => {
      // Invalidate all availability queries
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      showSuccess('Cache Cleared', 'Availability cache has been refreshed');
    },
  });

  const invalidateCache = (dateRange?: { start_date: string; end_date: string }) => {
    invalidateCacheMutation.mutate(dateRange);
  };

  const refreshCalendar = useCallback(async (startDate: string, endDate: string) => {
    // Invalidate specific calendar queries
    await queryClient.invalidateQueries({ 
      queryKey: ['availability', 'calendar', startDate, endDate] 
    });
  }, [queryClient]);

  return {
    invalidateCache,
    isInvalidating: invalidateCacheMutation.isPending,
    refreshCalendar,
    // Programmatic cache operations
    clearAllCache: () => queryClient.removeQueries({ queryKey: ['availability'] }),
    prefetchDateRange: useCallback(async (
      startDate: string, 
      endDate: string, 
      options?: { event_type_id?: number; booking_flow_id?: number; }
    ) => {
      await queryClient.prefetchQuery({
        queryKey: ['availability', 'range', startDate, endDate, options],
        queryFn: () => availabilityApi.checkDateRangeAvailability(startDate, endDate, options),
        staleTime: 2 * 60 * 1000,
      });
    }, [queryClient]),
  };
};

/**
 * Real-time availability hook with periodic refresh
 */
export const useRealTimeAvailability = (
  startDate: string,
  endDate: string,
  options?: {
    event_type_id?: number;
    booking_flow_id?: number;
    refreshInterval?: number; // milliseconds
  }
) => {
  const refreshInterval = options?.refreshInterval || 30000; // 30 seconds default

  return useQuery({
    queryKey: ['availability', 'realtime', startDate, endDate, options],
    queryFn: () => availabilityApi.getCalendarAvailability(startDate, endDate, {
      event_type_id: options?.event_type_id,
      booking_flow_id: options?.booking_flow_id,
    }),
    enabled: !!startDate && !!endDate,
    refetchInterval: refreshInterval,
    staleTime: 0, // Always fetch fresh data
    gcTime: 1 * 60 * 1000, // Short cache for real-time data
  });
};