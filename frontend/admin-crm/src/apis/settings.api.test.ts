import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "../utils/api";
import { settingsApi } from "./settings.api";

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

describe("settingsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Account Settings
  describe("updateProfile", () => {
    it("calls PUT to /users/me/ with profile data", async () => {
      const data = { first_name: "John", last_name: "Doe" };
      mockApi.put.mockResolvedValue({ data: { id: 1, ...data } });

      const result = await settingsApi.updateProfile(data as never);

      expect(mockApi.put).toHaveBeenCalledWith("/users/me/", data);
      expect(result).toEqual({ id: 1, ...data });
    });
  });

  describe("changePassword", () => {
    it("calls POST to change-password endpoint", async () => {
      const data = { current_password: "old", new_password: "new" };
      mockApi.post.mockResolvedValue({ data: { detail: "Password changed" } });

      const result = await settingsApi.changePassword(data as never);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/users/me/change-password/",
        data,
      );
      expect(result).toEqual({ detail: "Password changed" });
    });
  });

  // Admin Users
  describe("getAdminUsers", () => {
    it("fetches users and filters by ADMIN role", async () => {
      mockApi.get.mockResolvedValue({
        data: {
          results: [
            { id: 1, role: "ADMIN" },
            { id: 2, role: "CLIENT" },
            { id: 3, role: "ADMIN" },
          ],
        },
      });

      const result = await settingsApi.getAdminUsers();

      expect(mockApi.get).toHaveBeenCalledWith("/users/");
      expect(result).toEqual([
        { id: 1, role: "ADMIN" },
        { id: 3, role: "ADMIN" },
      ]);
    });

    it("returns empty array on error", async () => {
      mockApi.get.mockRejectedValue(new Error("Network error"));

      const result = await settingsApi.getAdminUsers();

      expect(result).toEqual([]);
    });
  });

  describe("createAdminUser", () => {
    it("calls POST to /users/", async () => {
      const data = { email: "admin@test.com", role: "ADMIN" };
      mockApi.post.mockResolvedValue({ data: { id: 1, ...data } });

      const result = await settingsApi.createAdminUser(data as never);

      expect(mockApi.post).toHaveBeenCalledWith("/users/", data);
      expect(result).toEqual({ id: 1, ...data });
    });
  });

  describe("deleteAdminUser", () => {
    it("calls DELETE with user id", async () => {
      mockApi.delete.mockResolvedValue({});

      await settingsApi.deleteAdminUser(5);

      expect(mockApi.delete).toHaveBeenCalledWith("/users/5/");
    });
  });

  // Invitations
  describe("getInvitations", () => {
    it("fetches invitations and returns results array", async () => {
      mockApi.get.mockResolvedValue({ data: { results: [{ id: "1" }] } });

      const result = await settingsApi.getInvitations();

      expect(mockApi.get).toHaveBeenCalledWith("/users/invitations/");
      expect(result).toEqual([{ id: "1" }]);
    });

    it("returns empty array on error", async () => {
      mockApi.get.mockRejectedValue(new Error("Fail"));

      const result = await settingsApi.getInvitations();

      expect(result).toEqual([]);
    });
  });

  describe("acceptInvitation", () => {
    it("calls POST with invitation id and acceptance data", async () => {
      const data = { password: "secret", first_name: "John" };
      mockApi.post.mockResolvedValue({ data: { token: "abc" } });

      const result = await settingsApi.acceptInvitation(
        "inv-123",
        data as never,
      );

      expect(mockApi.post).toHaveBeenCalledWith(
        "/users/invitations/inv-123/accept/",
        data,
      );
      expect(result).toEqual({ token: "abc" });
    });
  });

  // Legal Documents
  describe("getLegalDocuments", () => {
    it("calls GET and extracts data from nested response", async () => {
      const docs = [{ type: "terms", content: "..." }];
      mockApi.get.mockResolvedValue({ data: { success: true, data: docs } });

      const result = await settingsApi.getLegalDocuments();

      expect(mockApi.get).toHaveBeenCalledWith("/settings/legal/");
      expect(result).toEqual(docs);
    });
  });

  describe("updateLegalDocument", () => {
    it("calls PUT with document type and data, extracts nested response", async () => {
      const updateData = { content: "Updated terms" };
      mockApi.put.mockResolvedValue({
        data: {
          success: true,
          data: { type: "terms", content: "Updated terms" },
        },
      });

      const result = await settingsApi.updateLegalDocument(
        "terms",
        updateData as never,
      );

      expect(mockApi.put).toHaveBeenCalledWith(
        "/settings/legal/terms/",
        updateData,
      );
      expect(result).toEqual({ type: "terms", content: "Updated terms" });
    });
  });

  // Company Settings
  describe("getCompanySettings", () => {
    it("calls GET and extracts nested data", async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: { name: "LifePlace" } },
      });

      const result = await settingsApi.getCompanySettings();

      expect(mockApi.get).toHaveBeenCalledWith("/settings/company/");
      expect(result).toEqual({ name: "LifePlace" });
    });
  });

  describe("updateCompanySettings", () => {
    it("uses FormData with multipart header when file fields are present", async () => {
      const file = new File(["logo"], "logo.png", { type: "image/png" });
      const data = { name: "Company", logo: file } as never;

      mockApi.put.mockResolvedValue({
        data: { success: true, data: { name: "Company" } },
      });

      const result = await settingsApi.updateCompanySettings(data);

      expect(mockApi.put).toHaveBeenCalledWith(
        "/settings/company/",
        expect.any(FormData),
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      expect(result).toEqual({ name: "Company" });
    });

    it("uses JSON for non-file updates", async () => {
      const data = { name: "Updated Company" } as never;
      mockApi.put.mockResolvedValue({
        data: { success: true, data: { name: "Updated Company" } },
      });

      const result = await settingsApi.updateCompanySettings(data);

      expect(mockApi.put).toHaveBeenCalledWith("/settings/company/", data);
      expect(result).toEqual({ name: "Updated Company" });
    });
  });
});
