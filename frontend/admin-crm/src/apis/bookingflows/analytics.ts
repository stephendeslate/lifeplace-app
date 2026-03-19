// frontend/admin-crm/src/apis/bookingflows/analytics.ts

import api from '../../utils/api';
import type { BookingFlowAnalytics, BookingFlowAnalyticsFilters } from '../../types/bookingflows';
import type { PaginatedResponse } from '../../types/common.types';

export const getFlowAnalytics = async (
  flowId: number,
  filters?: BookingFlowAnalyticsFilters,
): Promise<BookingFlowAnalytics[]> => {
  const params = new URLSearchParams();
  if (filters?.start_date) params.append('start_date', filters.start_date);
  if (filters?.end_date) params.append('end_date', filters.end_date);

  const response = await api.get<BookingFlowAnalytics[]>(
    `/bookingflow/flows/${flowId}/analytics/?${params.toString()}`,
  );
  return Array.isArray(response.data) ? response.data : [];
};

export const getAllAnalytics = async (
  filters?: BookingFlowAnalyticsFilters,
): Promise<BookingFlowAnalytics[]> => {
  const params = new URLSearchParams();
  if (filters?.flow_id) params.append('flow_id', filters.flow_id.toString());
  if (filters?.start_date) params.append('start_date', filters.start_date);
  if (filters?.end_date) params.append('end_date', filters.end_date);

  const response = await api.get<PaginatedResponse<BookingFlowAnalytics>>(
    `/bookingflow/analytics/?${params.toString()}`,
  );

  // Handle paginated response
  if (response.data && typeof response.data === 'object' && 'results' in response.data) {
    return response.data.results;
  }

  return Array.isArray(response.data) ? response.data : [];
};

export const updateDailyAnalytics = async (
  flowId: number,
  date?: string,
): Promise<BookingFlowAnalytics> => {
  const response = await api.post<BookingFlowAnalytics>('/bookingflow/analytics/update_daily/', {
    flow_id: flowId,
    date,
  });
  return response.data;
};
