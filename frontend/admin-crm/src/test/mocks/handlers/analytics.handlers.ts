import { http, HttpResponse, delay } from "msw";
import {
  createMockDashboardKPIs,
  createMockBookingsSummary,
} from "../data/analytics.mock";

const BASE_URL = "http://localhost:8000/api";

export const resetAnalyticsStore = () => {
  // Analytics is read-only; no mutable store needed
};

export const analyticsHandlers = [
  // GET /api/analytics/dashboard/ - Dashboard KPIs
  http.get(`${BASE_URL}/analytics/dashboard/`, async ({ request }) => {
    await delay(50);
    const url = new URL(request.url);
    const startDate = url.searchParams.get("start_date") || "2024-06-01";
    const endDate = url.searchParams.get("end_date") || "2024-06-30";
    return HttpResponse.json(
      createMockDashboardKPIs({
        period: { startDate, endDate },
      }),
    );
  }),

  // GET /api/analytics/sales/bookings/ - Bookings summary
  http.get(`${BASE_URL}/analytics/sales/bookings/`, async () => {
    await delay(50);
    return HttpResponse.json(createMockBookingsSummary());
  }),

  // GET /api/analytics/sales/pipeline/ - Reservation pipeline
  http.get(`${BASE_URL}/analytics/sales/pipeline/`, async () => {
    await delay(30);
    return HttpResponse.json([
      { stage: "LEAD", count: 20, value: 100000 },
      { stage: "CONFIRMED", count: 15, value: 75000 },
      { stage: "COMPLETED", count: 10, value: 50000 },
    ]);
  }),

  // GET /api/analytics/sales/revenue/ - Revenue by type
  http.get(`${BASE_URL}/analytics/sales/revenue/`, async () => {
    await delay(30);
    return HttpResponse.json([
      { type: "Wedding", revenue: 300000 },
      { type: "Corporate", revenue: 200000 },
    ]);
  }),
];
