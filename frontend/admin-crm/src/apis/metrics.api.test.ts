import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../utils/api';
import { metricsApi } from './metrics.api';

vi.mock('../utils/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

describe('metricsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchKPISnapshots', () => {
    it('builds query params with start_date and end_date', async () => {
      mockApi.get.mockResolvedValue({ data: { count: 0, snapshots: [] } });

      await metricsApi.fetchKPISnapshots('2025-01-01', '2025-01-31');

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain('/analytics/snapshots/kpis/');
      expect(url).toContain('start_date=2025-01-01');
      expect(url).toContain('end_date=2025-01-31');
    });

    it('works without date params', async () => {
      mockApi.get.mockResolvedValue({ data: { count: 0, snapshots: [] } });

      await metricsApi.fetchKPISnapshots();

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain('/analytics/snapshots/kpis/');
      expect(url).not.toContain('start_date');
    });
  });

  describe('fetchKPISnapshotSummary', () => {
    it('calls GET on summary endpoint', async () => {
      mockApi.get.mockResolvedValue({ data: { total_revenue: 1000 } });

      const result = await metricsApi.fetchKPISnapshotSummary();

      expect(mockApi.get).toHaveBeenCalledWith('/analytics/snapshots/kpis/summary/');
      expect(result).toEqual({ total_revenue: 1000 });
    });
  });

  describe('fetchDORAMetrics', () => {
    it('builds params with days and service', async () => {
      mockApi.get.mockResolvedValue({ data: { deployment_frequency: 5 } });

      await metricsApi.fetchDORAMetrics(30, 'backend');

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain('/infrastructure/dora-metrics/');
      expect(url).toContain('days=30');
      expect(url).toContain('service=backend');
    });
  });

  describe('fetchDeploymentHistory', () => {
    it('builds params with limit and service', async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      await metricsApi.fetchDeploymentHistory(10, 'frontend');

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain('/infrastructure/deployments/');
      expect(url).toContain('limit=10');
      expect(url).toContain('service=frontend');
    });
  });
});
