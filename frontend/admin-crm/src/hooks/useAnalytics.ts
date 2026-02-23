// frontend/admin-crm/src/hooks/useAnalytics.ts
// Simplified analytics hooks using React Query

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../apis/analytics.api';
import type { DateRange, PeriodType } from '../types/analytics.types';

// ============================================================================
// Date Range Hook with Presets
// ============================================================================

export const useDateRange = (defaultDays: number = 30) => {
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - defaultDays);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  });

  const presets = {
    last7Days: useCallback(() => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);
      setDateRange({
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      });
    }, []),

    last30Days: useCallback(() => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      setDateRange({
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      });
    }, []),

    last90Days: useCallback(() => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 90);
      setDateRange({
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      });
    }, []),

    thisYear: useCallback(() => {
      const end = new Date();
      const start = new Date(end.getFullYear(), 0, 1);
      setDateRange({
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      });
    }, []),

    lastYear: useCallback(() => {
      const end = new Date();
      const start = new Date();
      start.setFullYear(start.getFullYear() - 1);
      setDateRange({
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      });
    }, []),
  };

  return { dateRange, setDateRange, presets };
};

// ============================================================================
// Dashboard Hook
// ============================================================================

export const useDashboardKPIs = (dateRange: DateRange) => {
  return useQuery({
    queryKey: ['analytics', 'dashboard', dateRange],
    queryFn: () => analyticsApi.getDashboardKPIs(dateRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// ============================================================================
// Sales & Reservations Hooks
// ============================================================================

export const useBookingsSummary = (dateRange: DateRange, period: PeriodType = 'daily') => {
  return useQuery({
    queryKey: ['analytics', 'bookings', dateRange, period],
    queryFn: () => analyticsApi.getBookingsSummary(dateRange, period),
    staleTime: 5 * 60 * 1000,
  });
};

export const useReservationPipeline = (dateRange: DateRange) => {
  return useQuery({
    queryKey: ['analytics', 'pipeline', dateRange],
    queryFn: () => analyticsApi.getReservationPipeline(dateRange),
    staleTime: 5 * 60 * 1000,
  });
};

export const useRevenueByType = (dateRange: DateRange) => {
  return useQuery({
    queryKey: ['analytics', 'revenue', dateRange],
    queryFn: () => analyticsApi.getRevenueByType(dateRange),
    staleTime: 5 * 60 * 1000,
  });
};

export const usePaymentTracking = (dateRange: DateRange) => {
  return useQuery({
    queryKey: ['analytics', 'payments', dateRange],
    queryFn: () => analyticsApi.getPaymentTracking(dateRange),
    staleTime: 5 * 60 * 1000,
  });
};

// ============================================================================
// Events & Guests Hooks
// ============================================================================

export const useEventAttendance = (dateRange: DateRange) => {
  return useQuery({
    queryKey: ['analytics', 'attendance', dateRange],
    queryFn: () => analyticsApi.getEventAttendance(dateRange),
    staleTime: 5 * 60 * 1000,
  });
};

export const usePackagePerformance = (dateRange: DateRange, limit: number = 10) => {
  return useQuery({
    queryKey: ['analytics', 'packages', dateRange, limit],
    queryFn: () => analyticsApi.getPackagePerformance(dateRange, limit),
    staleTime: 5 * 60 * 1000,
  });
};

export const useFeedbackScores = (dateRange: DateRange) => {
  return useQuery({
    queryKey: ['analytics', 'feedback', dateRange],
    queryFn: () => analyticsApi.getFeedbackScores(dateRange),
    staleTime: 5 * 60 * 1000,
  });
};

export const useEventTypeBreakdown = (dateRange: DateRange) => {
  return useQuery({
    queryKey: ['analytics', 'event-types', dateRange],
    queryFn: () => analyticsApi.getEventTypeBreakdown(dateRange),
    staleTime: 5 * 60 * 1000,
  });
};

// ============================================================================
// Customers & Leads Hooks
// ============================================================================

export const useLeadSources = (dateRange: DateRange) => {
  return useQuery({
    queryKey: ['analytics', 'leads', dateRange],
    queryFn: () => analyticsApi.getLeadSources(dateRange),
    staleTime: 5 * 60 * 1000,
  });
};

export const useConversionRates = (dateRange: DateRange) => {
  return useQuery({
    queryKey: ['analytics', 'conversion', dateRange],
    queryFn: () => analyticsApi.getConversionRates(dateRange),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCustomerList = (dateRange?: DateRange, limit?: number) => {
  return useQuery({
    queryKey: ['analytics', 'customers', dateRange, limit],
    queryFn: () => analyticsApi.getCustomerList(dateRange, limit),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCustomerGrowth = (dateRange: DateRange) => {
  return useQuery({
    queryKey: ['analytics', 'customer-growth', dateRange],
    queryFn: () => analyticsApi.getCustomerGrowth(dateRange),
    staleTime: 5 * 60 * 1000,
  });
};

// ============================================================================
// Operations Hooks
// ============================================================================

export const useVenueUsage = (dateRange: DateRange) => {
  return useQuery({
    queryKey: ['analytics', 'venues', dateRange],
    queryFn: () => analyticsApi.getVenueUsage(dateRange),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCalendarUtilization = (dateRange: DateRange) => {
  return useQuery({
    queryKey: ['analytics', 'calendar', dateRange],
    queryFn: () => analyticsApi.getCalendarUtilization(dateRange),
    staleTime: 5 * 60 * 1000,
  });
};

export const useBookingTimeAnalysis = (dateRange: DateRange) => {
  return useQuery({
    queryKey: ['analytics', 'booking-times', dateRange],
    queryFn: () => analyticsApi.getBookingTimeAnalysis(dateRange),
    staleTime: 5 * 60 * 1000,
  });
};

// ============================================================================
// Booking Flow Analytics Hooks
// ============================================================================

export const useBookingFlowFunnel = (dateRange: DateRange, flowId?: string) => {
  return useQuery({
    queryKey: ['analytics', 'booking-flow', 'funnel', dateRange, flowId],
    queryFn: () => analyticsApi.getBookingFlowFunnel(dateRange, flowId),
    staleTime: 5 * 60 * 1000,
  });
};

export const useBookingFlowPerformance = (dateRange: DateRange) => {
  return useQuery({
    queryKey: ['analytics', 'booking-flow', 'performance', dateRange],
    queryFn: () => analyticsApi.getBookingFlowPerformance(dateRange),
    staleTime: 5 * 60 * 1000,
  });
};

export const useBookingFlowAbandonment = (dateRange: DateRange, flowId?: string) => {
  return useQuery({
    queryKey: ['analytics', 'booking-flow', 'abandonment', dateRange, flowId],
    queryFn: () => analyticsApi.getBookingFlowAbandonment(dateRange, flowId),
    staleTime: 5 * 60 * 1000,
  });
};

export const useBookingFlowTrends = (dateRange: DateRange, flowId?: string) => {
  return useQuery({
    queryKey: ['analytics', 'booking-flow', 'trends', dateRange, flowId],
    queryFn: () => analyticsApi.getBookingFlowTrends(dateRange, flowId),
    staleTime: 5 * 60 * 1000,
  });
};

// ============================================================================
// Questionnaire Analytics Hooks
// ============================================================================

export const useQuestionnaireSummary = (dateRange: DateRange) => {
  return useQuery({
    queryKey: ['analytics', 'questionnaires', 'summary', dateRange],
    queryFn: () => analyticsApi.getQuestionnaireSummary(dateRange),
    staleTime: 5 * 60 * 1000,
  });
};

export const useQuestionnaireFieldHeatmap = (
  questionnaireId: number | null,
  dateRange: DateRange,
) => {
  return useQuery({
    queryKey: ['analytics', 'questionnaires', 'heatmap', questionnaireId, dateRange],
    queryFn: () => analyticsApi.getQuestionnaireFieldHeatmap(questionnaireId!, dateRange),
    enabled: questionnaireId !== null,
    staleTime: 5 * 60 * 1000,
  });
};

export const useQuestionnaireProblemFields = (dateRange: DateRange, threshold: number = 80) => {
  return useQuery({
    queryKey: ['analytics', 'questionnaires', 'problems', dateRange, threshold],
    queryFn: () => analyticsApi.getQuestionnaireProblemFields(dateRange, threshold),
    staleTime: 5 * 60 * 1000,
  });
};

// ============================================================================
// Export Functions (not hooks, just utilities)
// ============================================================================

export const exportBookingsSummary = analyticsApi.exportBookingsSummary;
export const exportRevenueReport = analyticsApi.exportRevenueReport;
export const exportLeadSources = analyticsApi.exportLeadSources;
export const exportCustomers = analyticsApi.exportCustomers;
