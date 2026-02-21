import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "../utils/api";
import { venuesApi } from "./venues.api";

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

describe("venuesApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getVenues", () => {
    it("builds query params for all filters", async () => {
      mockApi.get.mockResolvedValue({ data: [{ id: 1 }] });

      const result = await venuesApi.getVenues({
        search: "garden",
        is_active: true,
        is_bookable: true,
        is_overnight: false,
      });

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/venues/venues/");
      expect(url).toContain("search=garden");
      expect(url).toContain("is_active=true");
      expect(url).toContain("is_bookable=true");
      expect(url).toContain("is_overnight=false");
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe("createVenue", () => {
    it("uses FormData with multipart header when provided", async () => {
      const formData = new FormData();
      formData.append("name", "Garden");
      mockApi.post.mockResolvedValue({ data: { id: 1 } });

      await venuesApi.createVenue({} as never, formData);

      expect(mockApi.post).toHaveBeenCalledWith("/venues/venues/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    });

    it("uses JSON when no FormData provided", async () => {
      const data = { name: "Garden" };
      mockApi.post.mockResolvedValue({ data: { id: 1 } });

      await venuesApi.createVenue(data as never);

      expect(mockApi.post).toHaveBeenCalledWith("/venues/venues/", data);
    });
  });

  describe("getOperatingRules", () => {
    it("calls GET on venue operating_rules endpoint", async () => {
      mockApi.get.mockResolvedValue({ data: { venue_id: 5 } });

      const result = await venuesApi.getOperatingRules(5);

      expect(mockApi.get).toHaveBeenCalledWith(
        "/venues/venues/5/operating_rules/",
      );
      expect(result).toEqual({ venue_id: 5 });
    });
  });

  describe("getVenueAvailability", () => {
    it("calls GET with venue id, start_date, and end_date", async () => {
      mockApi.get.mockResolvedValue({ data: { available: true } });

      const result = await venuesApi.getVenueAvailability(
        5,
        "2025-01-01",
        "2025-01-31",
      );

      expect(mockApi.get).toHaveBeenCalledWith(
        "/venues/venues/5/availability/?start_date=2025-01-01&end_date=2025-01-31",
      );
      expect(result).toEqual({ available: true });
    });
  });

  describe("bulkAssignVenues", () => {
    it("calls POST to bulk_assign endpoint", async () => {
      const data = { package_id: 1, venue_ids: [1, 2, 3] };
      mockApi.post.mockResolvedValue({ data: [{ id: 1 }] });

      const result = await venuesApi.bulkAssignVenues(data as never);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/venues/package-venues/bulk_assign/",
        data,
      );
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe("getBlockedDates", () => {
    it("builds query params for blocked date filters", async () => {
      mockApi.get.mockResolvedValue({ data: [{ id: 1 }] });

      const result = await venuesApi.getBlockedDates({
        venue_id: 5,
        start_date: "2025-01-01",
        end_date: "2025-01-31",
      });

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/venues/blocked-dates/");
      expect(url).toContain("venue_id=5");
      expect(url).toContain("start_date=2025-01-01");
      expect(url).toContain("end_date=2025-01-31");
      expect(result).toEqual([{ id: 1 }]);
    });
  });
});
