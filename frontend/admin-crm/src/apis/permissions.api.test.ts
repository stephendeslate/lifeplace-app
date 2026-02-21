import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "../utils/api";
import { permissionsApi } from "./permissions.api";

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

describe("permissionsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPresets", () => {
    it("calls GET on /users/permissions/", async () => {
      mockApi.get.mockResolvedValue({
        data: { presets: [], descriptions: {} },
      });

      const result = await permissionsApi.getPresets();

      expect(mockApi.get).toHaveBeenCalledWith("/users/permissions/");
      expect(result).toEqual({ presets: [], descriptions: {} });
    });
  });

  describe("getUserPermissions", () => {
    it("calls GET with user id in path", async () => {
      mockApi.get.mockResolvedValue({
        data: { user_id: 5, permissions: {}, is_full_admin: true },
      });

      const result = await permissionsApi.getUserPermissions(5);

      expect(mockApi.get).toHaveBeenCalledWith("/users/5/permissions/");
      expect(result).toEqual({
        user_id: 5,
        permissions: {},
        is_full_admin: true,
      });
    });
  });

  describe("updateUserPermissions", () => {
    it("calls PATCH with user id and permissions data", async () => {
      const permissions = { can_manage_events: true, can_manage_users: false };
      mockApi.patch.mockResolvedValue({
        data: { detail: "Permissions updated", user: { id: 5 } },
      });

      const result = await permissionsApi.updateUserPermissions(
        5,
        permissions as never,
      );

      expect(mockApi.patch).toHaveBeenCalledWith(
        "/users/5/permissions/",
        permissions,
      );
      expect(result).toEqual({
        detail: "Permissions updated",
        user: { id: 5 },
      });
    });
  });
});
