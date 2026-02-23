// frontend/admin-crm/src/apis/metrics.api.ts
import api from '../utils/api';
import type {
  DailyKPISnapshot,
  KPISnapshotSummary,
  SystemHealthSnapshot,
  DORAMetricsReport,
  Deployment,
} from '../types/metrics.types';

interface SnapshotResponse<T> {
  count: number;
  snapshots: T[];
}

export const metricsApi = {
  fetchKPISnapshots: async (
    startDate?: string,
    endDate?: string,
  ): Promise<SnapshotResponse<DailyKPISnapshot>> => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const response = await api.get<SnapshotResponse<DailyKPISnapshot>>(
      `/analytics/snapshots/kpis/?${params.toString()}`,
    );
    return response.data;
  },

  fetchKPISnapshotSummary: async (): Promise<KPISnapshotSummary> => {
    const response = await api.get<KPISnapshotSummary>('/analytics/snapshots/kpis/summary/');
    return response.data;
  },

  fetchSystemHealthSnapshots: async (
    startDate?: string,
    endDate?: string,
  ): Promise<SnapshotResponse<SystemHealthSnapshot>> => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const response = await api.get<SnapshotResponse<SystemHealthSnapshot>>(
      `/analytics/snapshots/health/?${params.toString()}`,
    );
    return response.data;
  },

  fetchDORAMetrics: async (days?: number, service?: string): Promise<DORAMetricsReport> => {
    const params = new URLSearchParams();
    if (days) params.append('days', String(days));
    if (service) params.append('service', service);
    const response = await api.get<DORAMetricsReport>(
      `/infrastructure/dora-metrics/?${params.toString()}`,
    );
    return response.data;
  },

  fetchDeploymentHistory: async (limit?: number, service?: string): Promise<Deployment[]> => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', String(limit));
    if (service) params.append('service', service);
    const response = await api.get<Deployment[]>(
      `/infrastructure/deployments/?${params.toString()}`,
    );
    return response.data;
  },
};
