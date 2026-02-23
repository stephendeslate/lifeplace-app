// frontend/client-portal/src/apis/analytics.api.ts
// Client-facing analytics API layer

import api from '../utils/api';
import type {
  ClientDashboard,
  ClientEventHistory,
  ClientSpendingTrend,
  ClientDeadline,
} from '../types/analytics.types';

export const analyticsApi = {
  // Get client dashboard summary (KPIs)
  getDashboard: async (startDate?: string, endDate?: string): Promise<ClientDashboard> => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const queryString = params.toString();
    const url = queryString
      ? `/client/analytics/dashboard/?${queryString}`
      : '/client/analytics/dashboard/';

    const response = await api.get<ClientDashboard>(url);
    return response.data;
  },

  // Get client's event history with payment info
  getEventHistory: async (limit: number = 10): Promise<ClientEventHistory[]> => {
    const response = await api.get<ClientEventHistory[]>(
      `/client/analytics/events/?limit=${limit}`,
    );
    return response.data;
  },

  // Get monthly spending trends
  getSpendingTrends: async (months: number = 12): Promise<ClientSpendingTrend[]> => {
    const response = await api.get<ClientSpendingTrend[]>(
      `/client/analytics/spending/?months=${months}`,
    );
    return response.data;
  },

  // Get upcoming deadlines (payments, events, contracts)
  getUpcomingDeadlines: async (days: number = 30): Promise<ClientDeadline[]> => {
    const response = await api.get<ClientDeadline[]>(`/client/analytics/deadlines/?days=${days}`);
    return response.data;
  },
};
