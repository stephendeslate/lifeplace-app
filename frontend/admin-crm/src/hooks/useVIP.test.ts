// frontend/admin-crm/src/hooks/useVIP.test.ts

import { describe, it, expect } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import {
  useVIPSettings,
  useVIPTiers,
  useVIPBenefits,
  useClientVIPStatuses,
  useClientVIPDetail,
} from "./useVIP";
import { createTestWrapper } from "../test/utils/render";
import { server } from "../test/mocks/server";
import { http, HttpResponse } from "msw";

const BASE_URL = "http://localhost:8000/api";

describe("useVIP", () => {
  describe("useVIPSettings", () => {
    it("fetches VIP settings successfully", async () => {
      const { result } = renderHook(() => useVIPSettings(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingSettings).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.settings).toBeDefined();
      expect(result.current.settings?.is_program_enabled).toBe(true);
      expect(result.current.settings?.program_name).toBe("LifePlace VIP");
    });

    it("handles API error gracefully", async () => {
      server.use(
        http.get(`${BASE_URL}/vip/settings/`, () => {
          return HttpResponse.json({ detail: "Server error" }, { status: 500 });
        }),
      );

      const { result } = renderHook(() => useVIPSettings(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.settingsError).toBeTruthy();
        },
        { timeout: 5000 },
      );
    });

    it("updates settings via mutateAsync", async () => {
      const { result } = renderHook(() => useVIPSettings(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingSettings).toBe(false);
        },
        { timeout: 5000 },
      );

      await act(async () => {
        await result.current.updateSettings({ program_name: "Updated VIP" });
      });

      expect(result.current.isUpdatingSettings).toBe(false);
    });
  });

  describe("useVIPTiers", () => {
    it("fetches tiers with pagination", async () => {
      const { result } = renderHook(() => useVIPTiers(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingTiers).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.tiers).toBeDefined();
      expect(Array.isArray(result.current.tiers)).toBe(true);
      expect(result.current.tiers.length).toBeGreaterThan(0);
      expect(result.current.totalCount).toBeGreaterThan(0);
    });

    it("fetches active tiers", async () => {
      const { result } = renderHook(() => useVIPTiers(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingActiveTiers).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.activeTiers).toBeDefined();
      expect(Array.isArray(result.current.activeTiers)).toBe(true);
    });

    it("creates a tier via mutateAsync", async () => {
      const { result } = renderHook(() => useVIPTiers(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingTiers).toBe(false);
        },
        { timeout: 5000 },
      );

      await act(async () => {
        await result.current.createTier({
          name: "Platinum",
          level: 4,
          description: "Top tier",
          color: "#E5E4E2",
          icon: "diamond",
          is_default: false,
          is_active: true,
        });
      });

      expect(result.current.isCreatingTier).toBe(false);
    });
  });

  describe("useVIPBenefits", () => {
    it("fetches benefits successfully", async () => {
      const { result } = renderHook(() => useVIPBenefits(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingBenefits).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.benefits).toBeDefined();
      expect(Array.isArray(result.current.benefits)).toBe(true);
      expect(result.current.benefits.length).toBeGreaterThan(0);
    });

    it("fetches benefit types", async () => {
      const { result } = renderHook(() => useVIPBenefits(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingBenefitTypes).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.benefitTypes).toBeDefined();
      expect(Array.isArray(result.current.benefitTypes)).toBe(true);
      expect(result.current.benefitTypes.length).toBeGreaterThan(0);
    });

    it("creates a benefit via mutateAsync", async () => {
      const { result } = renderHook(() => useVIPBenefits(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingBenefits).toBe(false);
        },
        { timeout: 5000 },
      );

      await act(async () => {
        await result.current.createBenefit({
          tier: 2,
          benefit_type: "PERCENTAGE_DISCOUNT",
          value: "15.00",
          description: "Test discount",
          display_name: "Test",
          application_mode: "AUTOMATIC",
          is_active: true,
        });
      });

      expect(result.current.isCreatingBenefit).toBe(false);
    });
  });

  describe("useClientVIPStatuses", () => {
    it("fetches client VIP statuses", async () => {
      const { result } = renderHook(() => useClientVIPStatuses(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingClientStatuses).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.clientStatuses).toBeDefined();
      expect(Array.isArray(result.current.clientStatuses)).toBe(true);
      expect(result.current.clientStatuses.length).toBeGreaterThan(0);
    });

    it("provides mutation functions for tier assignment and point management", async () => {
      const { result } = renderHook(() => useClientVIPStatuses(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingClientStatuses).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.assignTier).toBeTypeOf("function");
      expect(result.current.awardPoints).toBeTypeOf("function");
      expect(result.current.adjustPoints).toBeTypeOf("function");
    });
  });

  describe("useClientVIPDetail", () => {
    it("fetches client VIP detail including tier history and transactions", async () => {
      const { result } = renderHook(() => useClientVIPDetail(1), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingClientStatus).toBe(false);
          expect(result.current.isLoadingTierHistory).toBe(false);
          expect(result.current.isLoadingPointTransactions).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.clientStatus).toBeDefined();
      expect(result.current.tierHistory).toBeDefined();
      expect(Array.isArray(result.current.tierHistory)).toBe(true);
      expect(result.current.pointTransactions).toBeDefined();
      expect(Array.isArray(result.current.pointTransactions)).toBe(true);
    });
  });
});
