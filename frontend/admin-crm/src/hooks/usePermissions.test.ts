import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePermissions } from "./usePermissions";
import type { AdminPermissions } from "../types/permissions.types";
import {
  FULL_ADMIN_PERMISSIONS,
  DEFAULT_ADMIN_PERMISSIONS,
} from "../types/permissions.types";

// Mock useAuth to control the user object
vi.mock("../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../contexts/AuthContext";

const mockedUseAuth = vi.mocked(useAuth);

function mockAuthUser(overrides: Record<string, unknown> = {}) {
  mockedUseAuth.mockReturnValue({
    user: {
      id: 1,
      email: "admin@test.com",
      first_name: "Test",
      last_name: "Admin",
      role: "ADMIN",
      is_active: true,
      date_joined: "2024-01-01",
      profile: {},
      is_full_admin: false,
      admin_permissions: DEFAULT_ADMIN_PERMISSIONS,
      ...overrides,
    } as never,
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
    updateUser: vi.fn(),
  });
}

describe("usePermissions", () => {
  describe("full admin", () => {
    beforeEach(() => {
      mockAuthUser({
        is_full_admin: true,
        admin_permissions: undefined,
      });
    });

    it("isFullAdmin is true", () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isFullAdmin).toBe(true);
    });

    it("hasPermission returns true for any permission", () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.hasPermission("can_manage_workflows")).toBe(true);
      expect(result.current.hasPermission("can_delete_records")).toBe(true);
      expect(result.current.hasPermission("can_manage_admins")).toBe(true);
    });

    it("hasAnyPermission returns true", () => {
      const { result } = renderHook(() => usePermissions());
      expect(
        result.current.hasAnyPermission([
          "can_manage_workflows",
          "can_manage_admins",
        ]),
      ).toBe(true);
    });

    it("hasAllPermissions returns true", () => {
      const { result } = renderHook(() => usePermissions());
      expect(
        result.current.hasAllPermissions([
          "can_manage_workflows",
          "can_manage_admins",
          "can_delete_records",
        ]),
      ).toBe(true);
    });

    it("permissions object has all true", () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.permissions).toEqual(FULL_ADMIN_PERMISSIONS);
    });
  });

  describe("limited admin with specific permissions", () => {
    const limitedPermissions: AdminPermissions = {
      ...DEFAULT_ADMIN_PERMISSIONS,
      can_manage_workflows: true,
      can_manage_templates: true,
    };

    beforeEach(() => {
      mockAuthUser({
        is_full_admin: false,
        admin_permissions: limitedPermissions,
      });
    });

    it("isFullAdmin is false", () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isFullAdmin).toBe(false);
    });

    it("hasPermission returns true for granted permissions", () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.hasPermission("can_manage_workflows")).toBe(true);
      expect(result.current.hasPermission("can_manage_templates")).toBe(true);
    });

    it("hasPermission returns false for ungranted permissions", () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.hasPermission("can_manage_admins")).toBe(false);
      expect(result.current.hasPermission("can_delete_records")).toBe(false);
    });

    it("hasAnyPermission with mixed set", () => {
      const { result } = renderHook(() => usePermissions());
      expect(
        result.current.hasAnyPermission([
          "can_manage_workflows",
          "can_manage_admins",
        ]),
      ).toBe(true);
      expect(
        result.current.hasAnyPermission([
          "can_manage_admins",
          "can_delete_records",
        ]),
      ).toBe(false);
    });

    it("hasAllPermissions with mixed set", () => {
      const { result } = renderHook(() => usePermissions());
      expect(
        result.current.hasAllPermissions([
          "can_manage_workflows",
          "can_manage_templates",
        ]),
      ).toBe(true);
      expect(
        result.current.hasAllPermissions([
          "can_manage_workflows",
          "can_manage_admins",
        ]),
      ).toBe(false);
    });
  });

  describe("non-admin user", () => {
    beforeEach(() => {
      mockAuthUser({
        role: "CLIENT",
        is_full_admin: false,
        admin_permissions: undefined,
      });
    });

    it("all permissions are false", () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.permissions).toEqual(DEFAULT_ADMIN_PERMISSIONS);
    });

    it("hasPermission returns false for any key", () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.hasPermission("can_manage_workflows")).toBe(false);
    });

    it("isFullAdmin is false", () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isFullAdmin).toBe(false);
    });

    it("canAccessPage returns false for non-admin", () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canAccessPage("/settings/account/company")).toBe(
        false,
      );
    });
  });

  describe("null user", () => {
    beforeEach(() => {
      mockedUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        updateUser: vi.fn(),
      });
    });

    it("all permissions are false", () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.permissions).toEqual(DEFAULT_ADMIN_PERMISSIONS);
    });

    it("isFullAdmin is false", () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isFullAdmin).toBe(false);
    });
  });

  describe("getSettingsFeatures", () => {
    it("full admin can do everything", () => {
      mockAuthUser({ is_full_admin: true });
      const { result } = renderHook(() => usePermissions());
      const features = result.current.getSettingsFeatures([
        "can_manage_workflows",
      ]);
      expect(features).toEqual({
        create: true,
        edit: true,
        delete: true,
        duplicate: true,
      });
    });

    it("limited admin with feature permission but no delete", () => {
      mockAuthUser({
        is_full_admin: false,
        admin_permissions: {
          ...DEFAULT_ADMIN_PERMISSIONS,
          can_manage_workflows: true,
          // can_delete_records is false
        },
      });
      const { result } = renderHook(() => usePermissions());
      const features = result.current.getSettingsFeatures([
        "can_manage_workflows",
      ]);
      expect(features.create).toBe(true);
      expect(features.edit).toBe(true);
      expect(features.duplicate).toBe(true);
      expect(features.delete).toBe(false);
    });

    it("limited admin with delete but not feature permission", () => {
      mockAuthUser({
        is_full_admin: false,
        admin_permissions: {
          ...DEFAULT_ADMIN_PERMISSIONS,
          can_delete_records: true,
          // can_manage_workflows is false
        },
      });
      const { result } = renderHook(() => usePermissions());
      const features = result.current.getSettingsFeatures([
        "can_manage_workflows",
      ]);
      expect(features.create).toBe(false);
      expect(features.delete).toBe(false);
    });

    it("empty required permissions means all can modify", () => {
      mockAuthUser({
        is_full_admin: false,
        admin_permissions: {
          ...DEFAULT_ADMIN_PERMISSIONS,
          can_delete_records: true,
        },
      });
      const { result } = renderHook(() => usePermissions());
      const features = result.current.getSettingsFeatures([]);
      expect(features.create).toBe(true);
      expect(features.edit).toBe(true);
      expect(features.delete).toBe(true);
    });
  });

  describe("canAccessPage", () => {
    it("returns true for admin user", () => {
      mockAuthUser({ role: "ADMIN" });
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canAccessPage("/settings/account/company")).toBe(
        true,
      );
    });

    it("returns true for admin even without specific permission", () => {
      mockAuthUser({
        role: "ADMIN",
        is_full_admin: false,
        admin_permissions: DEFAULT_ADMIN_PERMISSIONS,
      });
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canAccessPage("/settings/account/company")).toBe(
        true,
      );
    });
  });

  describe("canEditPage", () => {
    it("returns true when user has required permission", () => {
      mockAuthUser({
        is_full_admin: false,
        admin_permissions: {
          ...DEFAULT_ADMIN_PERMISSIONS,
          can_manage_company_settings: true,
        },
      });
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canEditPage("/settings/account/company")).toBe(
        true,
      );
    });

    it("returns false when user lacks required permission", () => {
      mockAuthUser({
        is_full_admin: false,
        admin_permissions: DEFAULT_ADMIN_PERMISSIONS,
      });
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canEditPage("/settings/account/company")).toBe(
        false,
      );
    });

    it("returns true for unmapped path (no permissions required)", () => {
      mockAuthUser({
        is_full_admin: false,
        admin_permissions: DEFAULT_ADMIN_PERMISSIONS,
      });
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canEditPage("/settings/some-unknown-page")).toBe(
        true,
      );
    });
  });
});
