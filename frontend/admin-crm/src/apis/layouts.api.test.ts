import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "../utils/api";
import { layoutsApi } from "./layouts.api";

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

describe("layoutsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getLayouts", () => {
    it("builds query params for search, is_active, page, page_size, ordering", async () => {
      mockApi.get.mockResolvedValue({ data: { count: 0, results: [] } });

      await layoutsApi.getLayouts({
        search: "default",
        is_active: true,
        page: 1,
        page_size: 10,
        ordering: "name",
      });

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/communications/layouts/");
      expect(url).toContain("search=default");
      expect(url).toContain("is_active=true");
      expect(url).toContain("page=1");
    });
  });

  describe("previewLayout", () => {
    it("calls POST to preview endpoint with data", async () => {
      const previewData = { body_content: "<p>Hello</p>" };
      mockApi.post.mockResolvedValue({
        data: { html: "<html>Preview</html>" },
      });

      const result = await layoutsApi.previewLayout(5, previewData as never);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/communications/layouts/5/preview/",
        previewData,
      );
      expect(result).toEqual({ html: "<html>Preview</html>" });
    });
  });

  describe("rollbackLayout", () => {
    it("calls POST with version in body", async () => {
      mockApi.post.mockResolvedValue({ data: { id: 5 } });

      const result = await layoutsApi.rollbackLayout(5, 2);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/communications/layouts/5/rollback/",
        { version: 2 },
      );
      expect(result).toEqual({ id: 5 });
    });
  });

  describe("getLayoutTemplates", () => {
    it("calls GET to templates endpoint", async () => {
      mockApi.get.mockResolvedValue({ data: [{ id: 1, name: "Welcome" }] });

      const result = await layoutsApi.getLayoutTemplates(5);

      expect(mockApi.get).toHaveBeenCalledWith(
        "/communications/layouts/5/templates/",
      );
      expect(result).toEqual([{ id: 1, name: "Welcome" }]);
    });
  });

  describe("duplicateLayout", () => {
    it("calls POST with new_name in body", async () => {
      mockApi.post.mockResolvedValue({ data: { id: 10 } });

      const result = await layoutsApi.duplicateLayout(5, "Copy");

      expect(mockApi.post).toHaveBeenCalledWith(
        "/communications/layouts/5/duplicate/",
        { new_name: "Copy" },
      );
      expect(result).toEqual({ id: 10 });
    });
  });
});
