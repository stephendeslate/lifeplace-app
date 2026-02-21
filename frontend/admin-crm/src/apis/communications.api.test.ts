import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "../utils/api";
import { communicationsApi } from "./communications.api";

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

describe("communicationsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getTemplates", () => {
    it("calls GET with search, category, channel, page, page_size, and ordering params", async () => {
      mockApi.get.mockResolvedValue({ data: { count: 0, results: [] } });

      await communicationsApi.getTemplates({
        search: "welcome",
        category: "booking",
        channel: "email",
        page: 2,
        page_size: 25,
        ordering: "-created_at",
      });

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining("/communications/templates/?"),
      );
      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("search=welcome");
      expect(url).toContain("category=booking");
      expect(url).toContain("channel=email");
      expect(url).toContain("page=2");
      expect(url).toContain("page_size=25");
      expect(url).toContain("ordering=-created_at");
    });

    it("returns response.data", async () => {
      const mockData = {
        count: 1,
        results: [{ id: 1, name: "Test" }],
        next: null,
        previous: null,
      };
      mockApi.get.mockResolvedValue({ data: mockData });

      const result = await communicationsApi.getTemplates();
      expect(result).toEqual(mockData);
    });
  });

  describe("getTemplate", () => {
    it("calls GET with template id in URL", async () => {
      mockApi.get.mockResolvedValue({ data: { id: 5 } });

      const result = await communicationsApi.getTemplate(5);

      expect(mockApi.get).toHaveBeenCalledWith("/communications/templates/5/");
      expect(result).toEqual({ id: 5 });
    });
  });

  describe("createTemplate", () => {
    it("calls POST with template data", async () => {
      const templateData = {
        name: "New Template",
        channel: "email",
        body_template: "Hello",
      };
      mockApi.post.mockResolvedValue({ data: { id: 1, ...templateData } });

      const result = await communicationsApi.createTemplate(
        templateData as never,
      );

      expect(mockApi.post).toHaveBeenCalledWith(
        "/communications/templates/",
        templateData,
      );
      expect(result).toEqual({ id: 1, ...templateData });
    });
  });

  describe("updateTemplate", () => {
    it("calls PATCH with id and update data", async () => {
      const updateData = { name: "Updated" };
      mockApi.patch.mockResolvedValue({ data: { id: 3, name: "Updated" } });

      const result = await communicationsApi.updateTemplate(
        3,
        updateData as never,
      );

      expect(mockApi.patch).toHaveBeenCalledWith(
        "/communications/templates/3/",
        updateData,
      );
      expect(result).toEqual({ id: 3, name: "Updated" });
    });
  });

  describe("deleteTemplate", () => {
    it("calls DELETE with template id", async () => {
      mockApi.delete.mockResolvedValue({});

      await communicationsApi.deleteTemplate(7);

      expect(mockApi.delete).toHaveBeenCalledWith(
        "/communications/templates/7/",
      );
    });
  });

  describe("getRecords", () => {
    it("calls GET with filters and handles paginated response", async () => {
      mockApi.get.mockResolvedValue({ data: { results: [{ id: 1 }] } });

      const result = await communicationsApi.getRecords({
        client_id: 10,
        event_id: 20,
        status: "sent",
        channel: "sms",
        template_name: "welcome",
      });

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("client_id=10");
      expect(url).toContain("event_id=20");
      expect(url).toContain("status=sent");
      expect(url).toContain("channel=sms");
      expect(url).toContain("template_name=welcome");
      expect(result).toEqual([{ id: 1 }]);
    });

    it("handles array response format", async () => {
      mockApi.get.mockResolvedValue({ data: [{ id: 2 }] });

      const result = await communicationsApi.getRecords();
      expect(result).toEqual([{ id: 2 }]);
    });
  });

  describe("sendManual", () => {
    it("calls POST to send_manual endpoint with data", async () => {
      const sendData = {
        template_id: 1,
        recipient: "test@test.com",
        client_id: 5,
      };
      mockApi.post.mockResolvedValue({ data: { id: 99, status: "sent" } });

      const result = await communicationsApi.sendManual(sendData);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/communications/records/send_manual/",
        sendData,
      );
      expect(result).toEqual({ id: 99, status: "sent" });
    });
  });

  describe("getAnalytics", () => {
    it("calls GET with template_name and days params", async () => {
      mockApi.get.mockResolvedValue({ data: { total_sent: 100 } });

      await communicationsApi.getAnalytics("welcome_email", 60);

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/communications/records/analytics/");
      expect(url).toContain("template_name=welcome_email");
      expect(url).toContain("days=60");
    });

    it("defaults to 30 days when no days param provided", async () => {
      mockApi.get.mockResolvedValue({ data: { total_sent: 50 } });

      await communicationsApi.getAnalytics();

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("days=30");
    });
  });

  describe("duplicateTemplate", () => {
    it("calls POST with new_name in body", async () => {
      mockApi.post.mockResolvedValue({
        data: { id: 10, name: "Copy of Test" },
      });

      const result = await communicationsApi.duplicateTemplate(
        5,
        "Copy of Test",
      );

      expect(mockApi.post).toHaveBeenCalledWith(
        "/communications/templates/5/duplicate/",
        { new_name: "Copy of Test" },
      );
      expect(result).toEqual({ id: 10, name: "Copy of Test" });
    });
  });

  describe("getTemplateHistory", () => {
    it("calls GET for template history", async () => {
      mockApi.get.mockResolvedValue({ data: [{ id: 1, version: 1 }] });

      const result = await communicationsApi.getTemplateHistory(5);

      expect(mockApi.get).toHaveBeenCalledWith(
        "/communications/templates/5/history/",
      );
      expect(result).toEqual([{ id: 1, version: 1 }]);
    });
  });

  describe("rollbackTemplate", () => {
    it("calls POST with version in body", async () => {
      mockApi.post.mockResolvedValue({ data: { id: 5, name: "Rolled back" } });

      const result = await communicationsApi.rollbackTemplate(5, 2);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/communications/templates/5/rollback/",
        { version: 2 },
      );
      expect(result).toEqual({ id: 5, name: "Rolled back" });
    });
  });

  describe("getTemplateStats", () => {
    it("calls GET with days param", async () => {
      mockApi.get.mockResolvedValue({ data: { total_sent: 50 } });

      await communicationsApi.getTemplateStats(3, 7);

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/communications/templates/3/stats/");
      expect(url).toContain("days=7");
    });
  });

  describe("markAllAsRead", () => {
    it("calls POST with optional filters", async () => {
      mockApi.post.mockResolvedValue({ data: { updated_count: 5 } });

      const result = await communicationsApi.markAllAsRead({ client_id: 1 });

      expect(mockApi.post).toHaveBeenCalledWith(
        "/communications/records/mark_all_as_read/",
        { client_id: 1 },
      );
      expect(result).toEqual({ updated_count: 5 });
    });
  });
});
