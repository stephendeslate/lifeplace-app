// frontend/admin-crm/src/apis/analytics.api.ts
// Simplified analytics API layer

import api from '../utils/api';
import type {
  DateRange,
  PeriodType,
  ExportFormat,
  DashboardKPIs,
  BookingSummary,
  ReservationPipeline,
  RevenueByType,
  PaymentTracking,
  EventAttendance,
  PackagePerformance,
  FeedbackScores,
  EventTypeBreakdown,
  LeadSource,
  ConversionRates,
  CustomerRecord,
  CustomerGrowth,
  VenueUsage,
  CalendarUtilization,
  BookingTimeAnalysis,
  PlaceholderResponse,
  BookingFlowFunnelStep,
  BookingFlowPerformance,
  BookingFlowAbandonment,
  BookingFlowTrend,
  QuestionnaireSummary,
  QuestionnaireFieldHeatmap,
  QuestionnaireProblemField,
} from '../types/analytics.types';

// Helper to build URL params from date range
const buildParams = (dateRange: DateRange, extra?: Record<string, string>): string => {
  const params = new URLSearchParams();
  params.append('start_date', dateRange.startDate);
  params.append('end_date', dateRange.endDate);
  if (extra) {
    Object.entries(extra).forEach(([key, value]) => params.append(key, value));
  }
  return params.toString();
};

// Helper to trigger file download
const downloadFile = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const analyticsApi = {
  // =========================================================================
  // Dashboard
  // =========================================================================

  getDashboardKPIs: async (dateRange: DateRange): Promise<DashboardKPIs> => {
    const response = await api.get<DashboardKPIs>(
      `/analytics/dashboard/?${buildParams(dateRange)}`,
    );
    return response.data;
  },

  // =========================================================================
  // Sales & Reservations
  // =========================================================================

  getBookingsSummary: async (
    dateRange: DateRange,
    period: PeriodType = 'daily',
  ): Promise<BookingSummary[]> => {
    const response = await api.get<BookingSummary[]>(
      `/analytics/sales/bookings/?${buildParams(dateRange, { period })}`,
    );
    return response.data;
  },

  exportBookingsSummary: async (
    dateRange: DateRange,
    period: PeriodType = 'daily',
    format: ExportFormat = 'csv',
  ): Promise<void> => {
    const response = await api.get<Blob>(
      `/analytics/sales/bookings/?${buildParams(dateRange, { period, format })}`,
      { responseType: 'blob' },
    );
    const filename = `bookings_${dateRange.startDate}_${dateRange.endDate}.${format === 'excel' ? 'xlsx' : 'csv'}`;
    downloadFile(response.data, filename);
  },

  getReservationPipeline: async (dateRange: DateRange): Promise<ReservationPipeline[]> => {
    const response = await api.get<ReservationPipeline[]>(
      `/analytics/sales/pipeline/?${buildParams(dateRange)}`,
    );
    return response.data;
  },

  getRevenueByType: async (dateRange: DateRange): Promise<RevenueByType[]> => {
    const response = await api.get<RevenueByType[]>(
      `/analytics/sales/revenue/?${buildParams(dateRange)}`,
    );
    return response.data;
  },

  exportRevenueReport: async (
    dateRange: DateRange,
    format: ExportFormat = 'csv',
  ): Promise<void> => {
    const response = await api.get<Blob>(
      `/analytics/sales/revenue/?${buildParams(dateRange, { format })}`,
      { responseType: 'blob' },
    );
    const filename = `revenue_${dateRange.startDate}_${dateRange.endDate}.${format === 'excel' ? 'xlsx' : 'csv'}`;
    downloadFile(response.data, filename);
  },

  getPaymentTracking: async (dateRange: DateRange): Promise<PaymentTracking> => {
    const response = await api.get<PaymentTracking>(
      `/analytics/sales/payments/?${buildParams(dateRange)}`,
    );
    return response.data;
  },

  // =========================================================================
  // Events & Guests
  // =========================================================================

  getEventAttendance: async (dateRange: DateRange): Promise<EventAttendance[]> => {
    const response = await api.get<EventAttendance[]>(
      `/analytics/events/attendance/?${buildParams(dateRange)}`,
    );
    return response.data;
  },

  getPackagePerformance: async (
    dateRange: DateRange,
    limit: number = 10,
  ): Promise<PackagePerformance[]> => {
    const response = await api.get<PackagePerformance[]>(
      `/analytics/events/packages/?${buildParams(dateRange, { limit: String(limit) })}`,
    );
    return response.data;
  },

  getFeedbackScores: async (dateRange: DateRange): Promise<FeedbackScores> => {
    const response = await api.get<FeedbackScores>(
      `/analytics/events/feedback/?${buildParams(dateRange)}`,
    );
    return response.data;
  },

  getEventTypeBreakdown: async (dateRange: DateRange): Promise<EventTypeBreakdown[]> => {
    const response = await api.get<EventTypeBreakdown[]>(
      `/analytics/events/types/?${buildParams(dateRange)}`,
    );
    return response.data;
  },

  getGuestDemographics: async (): Promise<PlaceholderResponse> => {
    const response = await api.get<PlaceholderResponse>('/analytics/events/demographics/');
    return response.data;
  },

  getRepeatClients: async (): Promise<PlaceholderResponse> => {
    const response = await api.get<PlaceholderResponse>('/analytics/events/repeat-clients/');
    return response.data;
  },

  // =========================================================================
  // Customers & Leads
  // =========================================================================

  getLeadSources: async (dateRange: DateRange): Promise<LeadSource[]> => {
    const response = await api.get<LeadSource[]>(
      `/analytics/customers/leads/?${buildParams(dateRange)}`,
    );
    return response.data;
  },

  exportLeadSources: async (dateRange: DateRange, format: ExportFormat = 'csv'): Promise<void> => {
    const response = await api.get<Blob>(
      `/analytics/customers/leads/?${buildParams(dateRange, { format })}`,
      { responseType: 'blob' },
    );
    const filename = `lead_sources_${dateRange.startDate}_${dateRange.endDate}.${format === 'excel' ? 'xlsx' : 'csv'}`;
    downloadFile(response.data, filename);
  },

  getConversionRates: async (dateRange: DateRange): Promise<ConversionRates> => {
    const response = await api.get<ConversionRates>(
      `/analytics/customers/conversion/?${buildParams(dateRange)}`,
    );
    return response.data;
  },

  getCustomerList: async (dateRange?: DateRange, limit?: number): Promise<CustomerRecord[]> => {
    const params = new URLSearchParams();
    if (dateRange) {
      params.append('start_date', dateRange.startDate);
      params.append('end_date', dateRange.endDate);
    }
    if (limit) {
      params.append('limit', String(limit));
    }
    const response = await api.get<CustomerRecord[]>(
      `/analytics/customers/list/?${params.toString()}`,
    );
    return response.data;
  },

  exportCustomers: async (
    dateRange: DateRange | undefined,
    format: ExportFormat = 'csv',
  ): Promise<void> => {
    const params = new URLSearchParams();
    if (dateRange) {
      params.append('start_date', dateRange.startDate);
      params.append('end_date', dateRange.endDate);
    }
    params.append('format', format);

    const response = await api.get<Blob>(`/analytics/customers/list/?${params.toString()}`, {
      responseType: 'blob',
    });
    const filename = `customers_export.${format === 'excel' ? 'xlsx' : 'csv'}`;
    downloadFile(response.data, filename);
  },

  getCustomerGrowth: async (dateRange: DateRange): Promise<CustomerGrowth[]> => {
    const response = await api.get<CustomerGrowth[]>(
      `/analytics/customers/growth/?${buildParams(dateRange)}`,
    );
    return response.data;
  },

  // =========================================================================
  // Operations
  // =========================================================================

  getVenueUsage: async (dateRange: DateRange): Promise<VenueUsage[]> => {
    const response = await api.get<VenueUsage[]>(
      `/analytics/operations/venues/?${buildParams(dateRange)}`,
    );
    return response.data;
  },

  getCalendarUtilization: async (dateRange: DateRange): Promise<CalendarUtilization> => {
    const response = await api.get<CalendarUtilization>(
      `/analytics/operations/calendar/?${buildParams(dateRange)}`,
    );
    return response.data;
  },

  getBookingTimeAnalysis: async (dateRange: DateRange): Promise<BookingTimeAnalysis[]> => {
    const response = await api.get<BookingTimeAnalysis[]>(
      `/analytics/operations/booking-times/?${buildParams(dateRange)}`,
    );
    return response.data;
  },

  getKitchenUsage: async (): Promise<PlaceholderResponse> => {
    const response = await api.get<PlaceholderResponse>('/analytics/operations/kitchen/');
    return response.data;
  },

  getInventoryReport: async (): Promise<PlaceholderResponse> => {
    const response = await api.get<PlaceholderResponse>('/analytics/operations/inventory/');
    return response.data;
  },

  // =========================================================================
  // App Engagement (Placeholder)
  // =========================================================================

  getAppEngagement: async (): Promise<PlaceholderResponse> => {
    const response = await api.get<PlaceholderResponse>('/analytics/engagement/');
    return response.data;
  },

  // =========================================================================
  // Booking Flow Analytics
  // =========================================================================

  getBookingFlowFunnel: async (
    dateRange: DateRange,
    flowId?: string,
  ): Promise<BookingFlowFunnelStep[]> => {
    const params: Record<string, string> = {};
    if (flowId) params.flow_id = flowId;
    const response = await api.get<BookingFlowFunnelStep[]>(
      `/analytics/booking-flow/funnel/?${buildParams(dateRange, params)}`,
    );
    return response.data;
  },

  getBookingFlowPerformance: async (dateRange: DateRange): Promise<BookingFlowPerformance[]> => {
    const response = await api.get<BookingFlowPerformance[]>(
      `/analytics/booking-flow/performance/?${buildParams(dateRange)}`,
    );
    return response.data;
  },

  getBookingFlowAbandonment: async (
    dateRange: DateRange,
    flowId?: string,
  ): Promise<BookingFlowAbandonment> => {
    const params: Record<string, string> = {};
    if (flowId) params.flow_id = flowId;
    const response = await api.get<BookingFlowAbandonment>(
      `/analytics/booking-flow/abandonment/?${buildParams(dateRange, params)}`,
    );
    return response.data;
  },

  getBookingFlowTrends: async (
    dateRange: DateRange,
    flowId?: string,
  ): Promise<BookingFlowTrend[]> => {
    const params: Record<string, string> = {};
    if (flowId) params.flow_id = flowId;
    const response = await api.get<BookingFlowTrend[]>(
      `/analytics/booking-flow/trends/?${buildParams(dateRange, params)}`,
    );
    return response.data;
  },

  // =========================================================================
  // Questionnaire Analytics
  // =========================================================================

  getQuestionnaireSummary: async (dateRange: DateRange): Promise<QuestionnaireSummary> => {
    const response = await api.get<QuestionnaireSummary>(
      `/analytics/questionnaires/summary/?${buildParams(dateRange)}`,
    );
    return response.data;
  },

  getQuestionnaireFieldHeatmap: async (
    questionnaireId: number,
    dateRange: DateRange,
  ): Promise<QuestionnaireFieldHeatmap[]> => {
    const response = await api.get<QuestionnaireFieldHeatmap[]>(
      `/analytics/questionnaires/${questionnaireId}/heatmap/?${buildParams(dateRange)}`,
    );
    return response.data;
  },

  getQuestionnaireProblemFields: async (
    dateRange: DateRange,
    threshold: number = 80,
  ): Promise<QuestionnaireProblemField[]> => {
    const response = await api.get<QuestionnaireProblemField[]>(
      `/analytics/questionnaires/problem-fields/?${buildParams(dateRange, { threshold: String(threshold) })}`,
    );
    return response.data;
  },
};
