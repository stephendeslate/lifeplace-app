// frontend/admin-crm/src/hooks/useVendors.test.ts

import { describe, it, expect } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import {
  useVendors,
  useVendorOperatingRules,
  usePackageVendors,
} from "./useVendors";
import { createTestWrapper } from "../test/utils/render";
import { server } from "../test/mocks/server";
import { http, HttpResponse } from "msw";

const BASE_URL = "http://localhost:8000/api";

describe("useVendors", () => {
  describe("useVendors (list)", () => {
    it("fetches vendors successfully", async () => {
      const { result } = renderHook(() => useVendors(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingVendors).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.vendors).toBeDefined();
      expect(Array.isArray(result.current.vendors)).toBe(true);
      expect(result.current.vendors.length).toBeGreaterThan(0);
    });

    it("handles API error gracefully", async () => {
      server.use(
        http.get(`${BASE_URL}/vendors/vendors/`, () => {
          return HttpResponse.json({ detail: "Server error" }, { status: 500 });
        }),
      );

      const { result } = renderHook(() => useVendors(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.vendorsError).toBeTruthy();
        },
        { timeout: 5000 },
      );
    });

    it("creates a vendor", async () => {
      const { result } = renderHook(() => useVendors(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingVendors).toBe(false);
        },
        { timeout: 5000 },
      );

      act(() => {
        result.current.createVendor({
          name: "New Vendor",
          code: "NEW-VENDOR",
          service_category: "PHOTOGRAPHY",
          contact_name: "John",
          contact_email: "john@vendor.com",
          contact_phone: "555-0100",
          company_name: "New Vendor Co",
        });
      });

      await waitFor(
        () => {
          expect(result.current.isCreatingVendor).toBe(false);
        },
        { timeout: 5000 },
      );
    });
  });

  describe("useVendorOperatingRules", () => {
    it("fetches operating rules for a vendor", async () => {
      const { result } = renderHook(() => useVendorOperatingRules(2), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingRules).toBe(false);
          expect(result.current.operatingRules).toBeDefined();
        },
        { timeout: 5000 },
      );

      expect(result.current.operatingRules).toHaveProperty(
        "max_events_per_day",
      );
      expect(result.current.operatingRules).toHaveProperty("available_days");
    });

    it("provides updateRules mutation", async () => {
      const { result } = renderHook(() => useVendorOperatingRules(2), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingRules).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.updateRules).toBeTypeOf("function");
      expect(result.current.isUpdatingRules).toBe(false);
    });
  });

  describe("useVendors (delete)", () => {
    it("deletes a vendor", async () => {
      const { result } = renderHook(() => useVendors(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingVendors).toBe(false);
          expect(result.current.vendors.length).toBeGreaterThan(0);
        },
        { timeout: 5000 },
      );

      const vendorId = result.current.vendors[0].id;

      act(() => {
        result.current.deleteVendor(vendorId);
      });

      await waitFor(
        () => {
          expect(result.current.isDeletingVendor).toBe(false);
        },
        { timeout: 5000 },
      );
    });
  });

  describe("usePackageVendors", () => {
    it("fetches package vendors successfully", async () => {
      const { result } = renderHook(() => usePackageVendors(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingPackageVendors).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.packageVendors).toBeDefined();
      expect(Array.isArray(result.current.packageVendors)).toBe(true);
    });

    it("provides CRUD and bulk assign mutations", async () => {
      const { result } = renderHook(() => usePackageVendors(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingPackageVendors).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.createPackageVendor).toBeTypeOf("function");
      expect(result.current.updatePackageVendor).toBeTypeOf("function");
      expect(result.current.deletePackageVendor).toBeTypeOf("function");
      expect(result.current.bulkAssign).toBeTypeOf("function");
    });
  });
});
