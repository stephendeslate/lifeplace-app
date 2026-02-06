// frontend/admin-crm/src/hooks/useMetrics.ts
import { useQuery } from '@tanstack/react-query';
import { metricsApi } from '../apis/metrics.api';

export const useKPISnapshots = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['kpi-snapshots', startDate, endDate],
    queryFn: () => metricsApi.fetchKPISnapshots(startDate, endDate),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useKPISnapshotSummary = () => {
  return useQuery({
    queryKey: ['kpi-snapshot-summary'],
    queryFn: () => metricsApi.fetchKPISnapshotSummary(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useSystemHealthSnapshots = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['system-health-snapshots', startDate, endDate],
    queryFn: () => metricsApi.fetchSystemHealthSnapshots(startDate, endDate),
    staleTime: 5 * 60 * 1000,
  });
};

export const useDORAMetrics = (days = 30, service?: string) => {
  return useQuery({
    queryKey: ['dora-metrics', days, service],
    queryFn: () => metricsApi.fetchDORAMetrics(days, service),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useDeploymentHistory = (limit = 50, service?: string) => {
  return useQuery({
    queryKey: ['deployment-history', limit, service],
    queryFn: () => metricsApi.fetchDeploymentHistory(limit, service),
    staleTime: 5 * 60 * 1000,
  });
};
