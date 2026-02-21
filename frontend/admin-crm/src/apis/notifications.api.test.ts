import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "../utils/api";
import { notificationsApi } from "./notifications.api";

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

describe("notificationsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getNotifications", () => {
    it("builds query params and returns results from paginated response", async () => {
      mockApi.get.mockResolvedValue({ data: { results: [{ id: 1 }] } });

      const result = await notificationsApi.getNotifications({
        is_read: false,
        type: "alert",
        category: "booking",
        priority: "high",
        user_id: 5,
        limit: 20,
      });

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/notifications/notifications/");
      expect(url).toContain("is_read=false");
      expect(url).toContain("type=alert");
      expect(url).toContain("category=booking");
      expect(url).toContain("priority=high");
      expect(url).toContain("user_id=5");
      expect(url).toContain("limit=20");
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe("markAsRead", () => {
    it("calls POST to mark_read endpoint", async () => {
      mockApi.post.mockResolvedValue({ data: { id: 1, is_read: true } });

      const result = await notificationsApi.markAsRead(1);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/notifications/notifications/1/mark_read/",
      );
      expect(result).toEqual({ id: 1, is_read: true });
    });
  });

  describe("markAllAsRead", () => {
    it("calls POST to mark_all_read endpoint", async () => {
      mockApi.post.mockResolvedValue({ data: { marked_read: 10 } });

      const result = await notificationsApi.markAllAsRead();

      expect(mockApi.post).toHaveBeenCalledWith(
        "/notifications/notifications/mark_all_read/",
      );
      expect(result).toEqual({ marked_read: 10 });
    });
  });

  describe("getUnread", () => {
    it("calls GET with optional limit param", async () => {
      mockApi.get.mockResolvedValue({ data: [{ id: 1 }] });

      const result = await notificationsApi.getUnread(5);

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/notifications/notifications/unread/");
      expect(url).toContain("limit=5");
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe("createNotification", () => {
    it("calls POST to create_notification endpoint", async () => {
      const data = { title: "Test", message: "Hello", recipients: [1, 2] };
      mockApi.post.mockResolvedValue({
        data: { created_count: 2, total_recipients: 2, notifications: [] },
      });

      const result = await notificationsApi.createNotification(data as never);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/notifications/notifications/create_notification/",
        data,
      );
      expect(result).toEqual({
        created_count: 2,
        total_recipients: 2,
        notifications: [],
      });
    });
  });

  describe("getNotificationTypes", () => {
    it("builds query params for type filters", async () => {
      mockApi.get.mockResolvedValue({ data: { count: 0, results: [] } });

      await notificationsApi.getNotificationTypes({
        search: "alert",
        category: "booking",
        is_active: true,
        is_system: false,
        page: 1,
        page_size: 10,
        ordering: "name",
      });

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/notifications/types/");
      expect(url).toContain("search=alert");
      expect(url).toContain("category=booking");
      expect(url).toContain("is_active=true");
      expect(url).toContain("is_system=false");
    });
  });

  describe("getMyPreferences", () => {
    it("calls GET on my_preferences endpoint", async () => {
      mockApi.get.mockResolvedValue({ data: { email_enabled: true } });

      const result = await notificationsApi.getMyPreferences();

      expect(mockApi.get).toHaveBeenCalledWith(
        "/notifications/preferences/my_preferences/",
      );
      expect(result).toEqual({ email_enabled: true });
    });
  });

  describe("updatePreferences", () => {
    it("calls PUT on update_preferences endpoint", async () => {
      const data = { email_enabled: false };
      mockApi.put.mockResolvedValue({ data: { email_enabled: false } });

      const result = await notificationsApi.updatePreferences(data as never);

      expect(mockApi.put).toHaveBeenCalledWith(
        "/notifications/preferences/update_preferences/",
        data,
      );
      expect(result).toEqual({ email_enabled: false });
    });
  });

  describe("sendTestPush", () => {
    it("calls POST to test_push endpoint", async () => {
      const data = { title: "Test", body: "Hello" };
      mockApi.post.mockResolvedValue({
        data: { message: "Sent", success: true },
      });

      const result = await notificationsApi.sendTestPush(data as never);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/notifications/push-tokens/test_push/",
        data,
      );
      expect(result).toEqual({ message: "Sent", success: true });
    });
  });
});
