import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "../utils/api";
import { supportApi } from "./support.api";

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

describe("supportApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getInquiries", () => {
    it("builds query params for all filters and returns results", async () => {
      mockApi.get.mockResolvedValue({ data: { results: [{ id: "1" }] } });

      const result = await supportApi.getInquiries({
        status: "open",
        category: "billing",
        assigned_admin: "admin1",
        priority: "high",
        search: "refund",
      });

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/messaging/admin/support/");
      expect(url).toContain("status=open");
      expect(url).toContain("category=billing");
      expect(url).toContain("assigned_admin=admin1");
      expect(url).toContain("priority=high");
      expect(url).toContain("search=refund");
      expect(result).toEqual([{ id: "1" }]);
    });
  });

  describe("getInquiry", () => {
    it("calls GET with inquiry id", async () => {
      mockApi.get.mockResolvedValue({ data: { id: "abc", subject: "Help" } });

      const result = await supportApi.getInquiry("abc");

      expect(mockApi.get).toHaveBeenCalledWith("/messaging/admin/support/abc/");
      expect(result).toEqual({ id: "abc", subject: "Help" });
    });
  });

  describe("updateInquiry", () => {
    it("calls PATCH with inquiry id and update data", async () => {
      const data = { status: "resolved" };
      mockApi.patch.mockResolvedValue({
        data: { id: "abc", status: "resolved" },
      });

      const result = await supportApi.updateInquiry("abc", data as never);

      expect(mockApi.patch).toHaveBeenCalledWith(
        "/messaging/admin/support/abc/",
        data,
      );
      expect(result).toEqual({ id: "abc", status: "resolved" });
    });
  });

  describe("addReply", () => {
    it("calls POST to add_reply endpoint", async () => {
      const replyData = { body: "Thank you for reaching out" };
      mockApi.post.mockResolvedValue({
        data: { id: 1, body: "Thank you for reaching out" },
      });

      const result = await supportApi.addReply("abc", replyData as never);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/messaging/admin/support/abc/add_reply/",
        replyData,
      );
      expect(result).toEqual({ id: 1, body: "Thank you for reaching out" });
    });
  });

  describe("getStats", () => {
    it("calls GET on stats endpoint", async () => {
      mockApi.get.mockResolvedValue({ data: { total: 50, open: 10 } });

      const result = await supportApi.getStats();

      expect(mockApi.get).toHaveBeenCalledWith(
        "/messaging/admin/support/stats/",
      );
      expect(result).toEqual({ total: 50, open: 10 });
    });
  });
});
