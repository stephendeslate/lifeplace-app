import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "../utils/api";
import { AvailabilityAPI } from "./availability.api";

vi.mock("../utils/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../utils/timezone", () => ({
  parseDateStringAsManila: vi.fn((date: string) => new Date(date)),
  getDayOfWeekInManila: vi.fn((date: Date) => date.getDay()),
}));

const mockApi = vi.mocked(api);

describe("AvailabilityAPI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkDateAvailability", () => {
    it("builds query params with all request fields", async () => {
      mockApi.get.mockResolvedValue({
        data: { date: "2025-01-15", available: true },
      });

      const result = await AvailabilityAPI.checkDateAvailability({
        start_date: "2025-01-15",
        end_date: "2025-01-16",
        event_type_id: 3,
        booking_flow_id: 1,
        duration_hours: 4,
        buffer_before_hours: 1,
        buffer_after_hours: 1,
        exclude_event_id: 5,
        include_buffer_conflicts: true,
      });

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/events/availability/check/");
      expect(url).toContain("start_date=2025-01-15");
      expect(url).toContain("end_date=2025-01-16");
      expect(url).toContain("event_type_id=3");
      expect(url).toContain("booking_flow_id=1");
      expect(url).toContain("duration_hours=4");
      expect(url).toContain("buffer_before_hours=1");
      expect(url).toContain("buffer_after_hours=1");
      expect(url).toContain("exclude_event_id=5");
      expect(url).toContain("include_buffer_conflicts=true");
      expect(result).toEqual({ date: "2025-01-15", available: true });
    });
  });

  describe("checkDateRangeAvailability", () => {
    it("builds params with start_date, end_date, and options", async () => {
      mockApi.get.mockResolvedValue({ data: { availability: [] } });

      await AvailabilityAPI.checkDateRangeAvailability(
        "2025-01-01",
        "2025-01-31",
        {
          event_type_id: 2,
          booking_flow_id: 1,
        },
      );

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/events/availability/range/");
      expect(url).toContain("start_date=2025-01-01");
      expect(url).toContain("end_date=2025-01-31");
      expect(url).toContain("event_type_id=2");
      expect(url).toContain("booking_flow_id=1");
    });
  });

  describe("validateBookingRequest", () => {
    it("calls POST to validate endpoint", async () => {
      const request = { start_date: "2025-01-15", event_type_id: 3 };
      mockApi.post.mockResolvedValue({ data: { is_valid: true } });

      const result = await AvailabilityAPI.validateBookingRequest(
        request as never,
      );

      expect(mockApi.post).toHaveBeenCalledWith(
        "/events/availability/validate/",
        request,
      );
      expect(result).toEqual({ is_valid: true });
    });
  });

  describe("getNextAvailableDate", () => {
    it("builds params with start_date, event_type_id, max_days_ahead", async () => {
      mockApi.get.mockResolvedValue({ data: { date: "2025-01-20" } });

      await AvailabilityAPI.getNextAvailableDate({
        start_date: "2025-01-15",
        event_type_id: 2,
        max_days_ahead: 60,
      });

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/events/availability/next/");
      expect(url).toContain("start_date=2025-01-15");
      expect(url).toContain("event_type_id=2");
      expect(url).toContain("max_days_ahead=60");
    });
  });

  describe("invalidateCache", () => {
    it("calls POST to cache invalidate endpoint", async () => {
      mockApi.post.mockResolvedValue({});

      await AvailabilityAPI.invalidateCache({
        start_date: "2025-01-01",
        end_date: "2025-01-31",
      });

      expect(mockApi.post).toHaveBeenCalledWith(
        "/events/availability/cache/invalidate/",
        {
          start_date: "2025-01-01",
          end_date: "2025-01-31",
        },
      );
    });

    it("sends empty object when no date range provided", async () => {
      mockApi.post.mockResolvedValue({});

      await AvailabilityAPI.invalidateCache();

      expect(mockApi.post).toHaveBeenCalledWith(
        "/events/availability/cache/invalidate/",
        {},
      );
    });
  });
});
