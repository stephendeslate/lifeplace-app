import { useState, useMemo } from 'react';
import type React from 'react';
import type { Palette } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import {
  useClientDashboard,
  useClientSpendingTrends,
  useClientDeadlines,
  useClientEventHistory,
} from '@/hooks/useClientAnalytics';

export interface AnalyticsMetric {
  id: string;
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

export interface ChartDataPoint {
  name: string;
  amount: number;
  payments: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const getStatusColor = (status: string, palette: Palette) => {
  switch (status) {
    case 'COMPLETED':
      return palette.success.main;
    case 'CONFIRMED':
      return palette.primary.main;
    case 'LEAD':
      return palette.warning.main;
    case 'CANCELLED':
      return palette.error.main;
    default:
      return palette.grey[500];
  }
};

export { formatCurrency, getStatusColor };

export function useAnalyticsDashboardLogic() {
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState('12m');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();

    switch (timeRange) {
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      case '12m':
      default:
        start.setFullYear(start.getFullYear() - 1);
        break;
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, [timeRange]);

  const {
    data: dashboard,
    isLoading: dashboardLoading,
    error: dashboardError,
  } = useClientDashboard(dateRange.startDate, dateRange.endDate);
  const { data: spendingTrends, isLoading: trendsLoading } = useClientSpendingTrends(
    timeRange === '12m' ? 12 : timeRange === '90d' ? 3 : 1,
  );
  const { data: deadlines, isLoading: deadlinesLoading } = useClientDeadlines(30);
  const { data: eventHistory, isLoading: historyLoading } = useClientEventHistory(5);

  const chartData: ChartDataPoint[] = useMemo(() => {
    if (!spendingTrends || spendingTrends.length === 0) return [];

    return spendingTrends.map((trend) => ({
      name: trend.month_name,
      amount: trend.amount,
      payments: trend.payment_count,
    }));
  }, [spendingTrends]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['client-analytics'] });
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return {
    timeRange,
    setTimeRange,
    isRefreshing,
    dashboard,
    dashboardLoading,
    dashboardError,
    trendsLoading,
    deadlines,
    deadlinesLoading,
    eventHistory,
    historyLoading,
    chartData,
    handleRefresh,
  };
}
