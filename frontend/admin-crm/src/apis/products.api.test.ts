import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "../utils/api";
import { productsApi } from "./products.api";

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

describe("productsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Categories
  describe("getCategories", () => {
    it("uses /all endpoint when use_pagination is falsy", async () => {
      mockApi.get.mockResolvedValue({ data: [{ id: 1, name: "Cat" }] });

      const result = await productsApi.getCategories({ search: "food" });

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/products/categories/all/");
      expect(url).toContain("search=food");
      expect(result).toEqual([{ id: 1, name: "Cat" }]);
    });

    it("uses paginated endpoint when use_pagination is true", async () => {
      mockApi.get.mockResolvedValue({ data: { results: [{ id: 1 }] } });

      const result = await productsApi.getCategories({
        use_pagination: true,
        is_active: true,
      });

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/products/categories/?");
      expect(url).toContain("is_active=true");
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe("getCategoriesTree", () => {
    it("calls GET on tree endpoint", async () => {
      mockApi.get.mockResolvedValue({ data: [{ id: 1, children: [] }] });

      const result = await productsApi.getCategoriesTree();

      expect(mockApi.get).toHaveBeenCalledWith("/products/categories/tree/");
      expect(result).toEqual([{ id: 1, children: [] }]);
    });
  });

  describe("createCategory", () => {
    it("calls POST with category data", async () => {
      const data = { name: "New Cat" };
      mockApi.post.mockResolvedValue({ data: { id: 1, name: "New Cat" } });

      const result = await productsApi.createCategory(data as never);

      expect(mockApi.post).toHaveBeenCalledWith("/products/categories/", data);
      expect(result).toEqual({ id: 1, name: "New Cat" });
    });
  });

  describe("deleteCategory", () => {
    it("calls DELETE with category id", async () => {
      mockApi.delete.mockResolvedValue({});

      await productsApi.deleteCategory(5);

      expect(mockApi.delete).toHaveBeenCalledWith("/products/categories/5/");
    });
  });

  // Products
  describe("getProducts", () => {
    it("uses /all endpoint with filters by default", async () => {
      mockApi.get.mockResolvedValue({ data: [{ id: 1 }] });

      const result = await productsApi.getProducts({
        search: "pkg",
        type: "package",
        is_active: true,
        category_id: 3,
        is_featured: false,
      });

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/products/products/all/");
      expect(url).toContain("search=pkg");
      expect(url).toContain("type=package");
      expect(url).toContain("is_active=true");
      expect(url).toContain("category_id=3");
      expect(url).toContain("is_featured=false");
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe("getProductsOnly", () => {
    it("calls GET on products/products endpoint", async () => {
      mockApi.get.mockResolvedValue({ data: [{ id: 1, type: "product" }] });

      const result = await productsApi.getProductsOnly();

      expect(mockApi.get).toHaveBeenCalledWith("/products/products/products/");
      expect(result).toEqual([{ id: 1, type: "product" }]);
    });
  });

  describe("getPackagesOnly", () => {
    it("calls GET on packages endpoint", async () => {
      mockApi.get.mockResolvedValue({ data: [{ id: 2, type: "package" }] });

      const result = await productsApi.getPackagesOnly();

      expect(mockApi.get).toHaveBeenCalledWith("/products/products/packages/");
      expect(result).toEqual([{ id: 2, type: "package" }]);
    });
  });

  describe("getProductsByCategory", () => {
    it("calls GET with category_id query param", async () => {
      mockApi.get.mockResolvedValue({ data: [{ id: 1 }] });

      const result = await productsApi.getProductsByCategory(7);

      expect(mockApi.get).toHaveBeenCalledWith(
        "/products/products/by_category/?category_id=7",
      );
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe("createProduct", () => {
    it("transforms event_type_ids to input_event_type_ids for JSON data", async () => {
      const data = { name: "Prod", event_type_ids: [1, 2] } as never;
      mockApi.post.mockResolvedValue({ data: { id: 1 } });

      await productsApi.createProduct(data);

      const calledData = mockApi.post.mock.calls[0][1] as Record<
        string,
        unknown
      >;
      expect(calledData.input_event_type_ids).toEqual([1, 2]);
      expect(calledData.event_type_ids).toBeUndefined();
      expect(mockApi.post).toHaveBeenCalledWith(
        "/products/products/",
        expect.any(Object),
      );
    });

    it("uses FormData with multipart header when formData is provided", async () => {
      const data = { name: "Prod" } as never;
      const formData = new FormData();
      formData.append("name", "Prod");
      mockApi.post.mockResolvedValue({ data: { id: 1 } });

      await productsApi.createProduct(data, formData);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/products/products/",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
    });
  });

  // Discounts
  describe("getDiscounts", () => {
    it("uses /all endpoint with filters by default", async () => {
      mockApi.get.mockResolvedValue({ data: [{ id: 1 }] });

      const result = await productsApi.getDiscounts({
        search: "summer",
        is_active: true,
        discount_type: "percentage",
      });

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/products/discounts/all/");
      expect(url).toContain("search=summer");
      expect(url).toContain("is_active=true");
      expect(url).toContain("discount_type=percentage");
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe("validateDiscountForOrder", () => {
    it("calls POST with discount id and validation data", async () => {
      const validationData = { order_total: 100 };
      mockApi.post.mockResolvedValue({ data: { is_valid: true } });

      const result = await productsApi.validateDiscountForOrder(
        3,
        validationData as never,
      );

      expect(mockApi.post).toHaveBeenCalledWith(
        "/products/discounts/3/validate_for_order/",
        validationData,
      );
      expect(result).toEqual({ is_valid: true });
    });
  });

  describe("incrementDiscountUsage", () => {
    it("calls POST on increment_usage endpoint", async () => {
      mockApi.post.mockResolvedValue({ data: { id: 5, usage_count: 11 } });

      const result = await productsApi.incrementDiscountUsage(5);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/products/discounts/5/increment_usage/",
      );
      expect(result).toEqual({ id: 5, usage_count: 11 });
    });
  });
});
