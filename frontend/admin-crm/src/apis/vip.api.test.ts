import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "../utils/api";
import { vipApi } from "./vip.api";

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

describe("vipApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSettings", () => {
    it("calls GET on /vip/settings/", async () => {
      mockApi.get.mockResolvedValue({ data: { is_enabled: true } });

      const result = await vipApi.getSettings();

      expect(mockApi.get).toHaveBeenCalledWith("/vip/settings/");
      expect(result).toEqual({ is_enabled: true });
    });
  });

  describe("getTiers", () => {
    it("builds query params for search, is_active, page, page_size, ordering", async () => {
      mockApi.get.mockResolvedValue({ data: { count: 0, results: [] } });

      await vipApi.getTiers({
        search: "gold",
        is_active: true,
        page: 1,
        page_size: 10,
        ordering: "name",
      });

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/vip/tiers/");
      expect(url).toContain("search=gold");
      expect(url).toContain("is_active=true");
      expect(url).toContain("page=1");
    });
  });

  describe("assignTier", () => {
    it("calls POST with assign_tier endpoint", async () => {
      const data = { tier_id: 3 };
      mockApi.post.mockResolvedValue({ data: { id: 1, tier_id: 3 } });

      const result = await vipApi.assignTier(1, data as never);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/vip/client-status/1/assign_tier/",
        data,
      );
      expect(result).toEqual({ id: 1, tier_id: 3 });
    });
  });

  describe("awardPoints", () => {
    it("calls POST with award_points endpoint", async () => {
      const data = { points: 100, reason: "Loyalty bonus" };
      mockApi.post.mockResolvedValue({ data: { new_balance: 500 } });

      const result = await vipApi.awardPoints(1, data as never);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/vip/client-status/1/award_points/",
        data,
      );
      expect(result).toEqual({ new_balance: 500 });
    });
  });

  describe("getClientStatuses", () => {
    it("builds query params for all filters", async () => {
      mockApi.get.mockResolvedValue({ data: [{ id: 1 }] });

      const result = await vipApi.getClientStatuses({
        tier: 3,
        status: "active",
        search: "john",
        client: 10,
      });

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/vip/client-status/");
      expect(url).toContain("tier=3");
      expect(url).toContain("status=active");
      expect(url).toContain("search=john");
      expect(url).toContain("client=10");
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe("getBenefitTypes", () => {
    it("calls GET on benefit_types endpoint", async () => {
      mockApi.get.mockResolvedValue({
        data: [{ value: "discount", label: "Discount" }],
      });

      const result = await vipApi.getBenefitTypes();

      expect(mockApi.get).toHaveBeenCalledWith("/vip/benefits/benefit_types/");
      expect(result).toEqual([{ value: "discount", label: "Discount" }]);
    });
  });
});
