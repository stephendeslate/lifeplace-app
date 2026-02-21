import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "../utils/api";
import { vendorsApi } from "./vendors.api";

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

describe("vendorsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getVendors", () => {
    it("builds query params for all filters", async () => {
      mockApi.get.mockResolvedValue({ data: [{ id: 1 }] });

      const result = await vendorsApi.getVendors({
        search: "catering",
        is_active: true,
        is_bookable: true,
        service_category: "food",
      });

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/vendors/vendors/");
      expect(url).toContain("search=catering");
      expect(url).toContain("is_active=true");
      expect(url).toContain("is_bookable=true");
      expect(url).toContain("service_category=food");
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe("getServiceCategories", () => {
    it("calls GET on categories endpoint", async () => {
      mockApi.get.mockResolvedValue({
        data: [{ value: "food", label: "Food" }],
      });

      const result = await vendorsApi.getServiceCategories();

      expect(mockApi.get).toHaveBeenCalledWith("/vendors/vendors/categories/");
      expect(result).toEqual([{ value: "food", label: "Food" }]);
    });
  });

  describe("bulkAssignVendors", () => {
    it("calls POST to bulk_assign endpoint", async () => {
      const data = { package_id: 1, vendor_ids: [1, 2] };
      mockApi.post.mockResolvedValue({ data: [{ id: 1 }] });

      const result = await vendorsApi.bulkAssignVendors(data as never);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/vendors/package-vendors/bulk_assign/",
        data,
      );
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe("getVendorsForPackage", () => {
    it("calls GET with package_id query param", async () => {
      mockApi.get.mockResolvedValue({ data: [{ id: 1 }] });

      const result = await vendorsApi.getVendorsForPackage(5);

      expect(mockApi.get).toHaveBeenCalledWith(
        "/vendors/package-vendors/by_package/?package_id=5",
      );
      expect(result).toEqual([{ id: 1 }]);
    });
  });
});
