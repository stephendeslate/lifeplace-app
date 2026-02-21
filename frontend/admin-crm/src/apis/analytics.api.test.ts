import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "../utils/api";
import { analyticsApi } from "./analytics.api";

vi.mock("../utils/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

const dateRange = { startDate: "2025-01-01", endDate: "2025-01-31" };

describe("analyticsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDashboardKPIs", () => {
    it("calls GET with start_date and end_date params", async () => {
      mockApi.get.mockResolvedValue({ data: { total_revenue: 1000 } });

      const result = await analyticsApi.getDashboardKPIs(dateRange);

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/analytics/dashboard/");
      expect(url).toContain("start_date=2025-01-01");
      expect(url).toContain("end_date=2025-01-31");
      expect(result).toEqual({ total_revenue: 1000 });
    });
  });

  describe("getBookingsSummary", () => {
    it("includes period param defaulting to daily", async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      await analyticsApi.getBookingsSummary(dateRange);

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/analytics/sales/bookings/");
      expect(url).toContain("period=daily");
    });

    it("uses custom period when provided", async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      await analyticsApi.getBookingsSummary(dateRange, "monthly");

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("period=monthly");
    });
  });

  describe("exportBookingsSummary", () => {
    it("calls GET with format param and blob responseType", async () => {
      mockApi.get.mockResolvedValue({ data: new Blob() });

      // Mock DOM methods for downloadFile helper
      const mockLink = { href: "", download: "", click: vi.fn() };
      vi.spyOn(document, "createElement").mockReturnValue(mockLink as never);
      vi.spyOn(document.body, "appendChild").mockImplementation(
        () => mockLink as never,
      );
      vi.spyOn(document.body, "removeChild").mockImplementation(
        () => mockLink as never,
      );
      window.URL.createObjectURL = vi.fn().mockReturnValue("blob:url");
      window.URL.revokeObjectURL = vi.fn();

      await analyticsApi.exportBookingsSummary(dateRange, "daily", "csv");

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("format=csv");
      expect(mockApi.get).toHaveBeenCalledWith(expect.any(String), {
        responseType: "blob",
      });
    });
  });

  describe("getReservationPipeline", () => {
    it("calls GET on pipeline endpoint", async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      await analyticsApi.getReservationPipeline(dateRange);

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/analytics/sales/pipeline/");
    });
  });

  describe("getPackagePerformance", () => {
    it("includes limit param", async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      await analyticsApi.getPackagePerformance(dateRange, 5);

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/analytics/events/packages/");
      expect(url).toContain("limit=5");
    });
  });

  describe("getCustomerList", () => {
    it("builds params from dateRange and limit", async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      await analyticsApi.getCustomerList(dateRange, 50);

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/analytics/customers/list/");
      expect(url).toContain("start_date=2025-01-01");
      expect(url).toContain("limit=50");
    });

    it("works without dateRange", async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      await analyticsApi.getCustomerList();

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/analytics/customers/list/");
      expect(url).not.toContain("start_date");
    });
  });

  describe("getBookingFlowFunnel", () => {
    it("includes flow_id when provided", async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      await analyticsApi.getBookingFlowFunnel(dateRange, "flow-1");

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/analytics/booking-flow/funnel/");
      expect(url).toContain("flow_id=flow-1");
    });
  });

  describe("getQuestionnaireSummary", () => {
    it("calls GET on questionnaires summary endpoint", async () => {
      mockApi.get.mockResolvedValue({ data: { total: 10 } });

      const result = await analyticsApi.getQuestionnaireSummary(dateRange);

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/analytics/questionnaires/summary/");
      expect(result).toEqual({ total: 10 });
    });
  });

  describe("getQuestionnaireFieldHeatmap", () => {
    it("includes questionnaire id in path", async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      await analyticsApi.getQuestionnaireFieldHeatmap(5, dateRange);

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/analytics/questionnaires/5/heatmap/");
    });
  });

  describe("getQuestionnaireProblemFields", () => {
    it("includes threshold param defaulting to 80", async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      await analyticsApi.getQuestionnaireProblemFields(dateRange);

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/analytics/questionnaires/problem-fields/");
      expect(url).toContain("threshold=80");
    });

    it("uses custom threshold", async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      await analyticsApi.getQuestionnaireProblemFields(dateRange, 50);

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("threshold=50");
    });
  });
});
