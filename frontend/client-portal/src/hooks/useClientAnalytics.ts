// frontend/client-portal/src/hooks/useClientAnalytics.ts
// React Query hooks for client analytics

import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../apis/analytics.api';

// Dashboard KPIs
export const useClientDashboard = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['client-analytics', 'dashboard', startDate, endDate],
    queryFn: () => analyticsApi.getDashboard(startDate, endDate),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Event history
export const useClientEventHistory = (limit: number = 10) => {
  return useQuery({
    queryKey: ['client-analytics', 'events', limit],
    queryFn: () => analyticsApi.getEventHistory(limit),
    staleTime: 5 * 60 * 1000,
  });
};

// Spending trends
export const useClientSpendingTrends = (months: number = 12) => {
  return useQuery({
    queryKey: ['client-analytics', 'spending', months],
    queryFn: () => analyticsApi.getSpendingTrends(months),
    staleTime: 10 * 60 * 1000, // 10 minutes - less volatile data
  });
};

// Upcoming deadlines
export const useClientDeadlines = (days: number = 30) => {
  return useQuery({
    queryKey: ['client-analytics', 'deadlines', days],
    queryFn: () => analyticsApi.getUpcomingDeadlines(days),
    staleTime: 5 * 60 * 1000,
  });
};

// Combined hook for all client analytics
export const useClientAnalytics = () => {
  return {
    useClientDashboard,
    useClientEventHistory,
    useClientSpendingTrends,
    useClientDeadlines,
  };
};

export default useClientAnalytics;
