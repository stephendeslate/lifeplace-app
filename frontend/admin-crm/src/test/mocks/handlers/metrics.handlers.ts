import { http, HttpResponse, delay } from "msw";
import {
  mockPlatformMetrics,
  mockKPISnapshotSummary,
  mockSystemHealthSeries,
  mockDORAMetricsReport,
} from "../data/metrics.mock";
import type {
  DailyKPISnapshot,
  SystemHealthSnapshot,
} from "../../../types/metrics.types";

const BASE_URL = "http://localhost:8000/api";

let kpiStore: DailyKPISnapshot[] = [...mockPlatformMetrics];
let healthStore: SystemHealthSnapshot[] = [...mockSystemHealthSeries];

export const resetMetricsStore = () => {
  kpiStore = [...mockPlatformMetrics];
  healthStore = [...mockSystemHealthSeries];
};

export const metricsHandlers = [
  // GET /api/analytics/snapshots/kpis/ - List KPI snapshots
  http.get(`${BASE_URL}/analytics/snapshots/kpis/`, async ({ request }) => {
    await delay(30);
    const url = new URL(request.url);
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");

    let filtered = [...kpiStore];

    if (startDate) {
      filtered = filtered.filter((s) => s.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter((s) => s.date <= endDate);
    }

    return HttpResponse.json({
      count: filtered.length,
      snapshots: filtered,
    });
  }),

  // GET /api/analytics/snapshots/kpis/summary/ - KPI summary
  http.get(`${BASE_URL}/analytics/snapshots/kpis/summary/`, async () => {
    await delay(30);
    return HttpResponse.json(mockKPISnapshotSummary);
  }),

  // GET /api/analytics/snapshots/health/ - System health snapshots
  http.get(`${BASE_URL}/analytics/snapshots/health/`, async ({ request }) => {
    await delay(30);
    const url = new URL(request.url);
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");

    let filtered = [...healthStore];

    if (startDate) {
      filtered = filtered.filter((s) => s.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter((s) => s.date <= endDate);
    }

    return HttpResponse.json({
      count: filtered.length,
      snapshots: filtered,
    });
  }),

  // GET /api/infrastructure/dora-metrics/ - DORA metrics report
  http.get(`${BASE_URL}/infrastructure/dora-metrics/`, async ({ request }) => {
    await delay(30);
    const url = new URL(request.url);
    const days = url.searchParams.get("days");
    const service = url.searchParams.get("service");

    const report = {
      ...mockDORAMetricsReport,
      ...(days ? { period_days: Number(days) } : {}),
      ...(service ? { service } : {}),
    };

    return HttpResponse.json(report);
  }),

  // GET /api/infrastructure/deployments/ - Deployment history
  http.get(`${BASE_URL}/infrastructure/deployments/`, async ({ request }) => {
    await delay(30);
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") || 10);
    const service = url.searchParams.get("service");

    const deployments = Array.from({ length: Math.min(limit, 20) }, (_, i) => ({
      id: `deploy-${i + 1}`,
      git_sha: `abc${String(i + 1).padStart(4, "0")}def1234567890abcdef1234567890ab`,
      git_sha_short: `abc${String(i + 1).padStart(4, "0")}d`,
      commit_message: `Deploy #${i + 1}: Update ${service || "backend"} service`,
      service: service || "backend",
      environment: "production",
      status: i % 10 === 9 ? ("FAILURE" as const) : ("SUCCESS" as const),
      triggered_by: "github-actions",
      deploy_duration_seconds: 120 + Math.floor(Math.random() * 180),
      lead_time_seconds: 3600 + Math.floor(Math.random() * 7200),
      caused_incident: i % 10 === 9,
      github_run_url: `https://github.com/lifeplace/app/actions/runs/${1000 + i}`,
      created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    }));

    return HttpResponse.json(deployments);
  }),
];
