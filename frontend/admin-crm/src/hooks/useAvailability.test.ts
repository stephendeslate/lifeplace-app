// frontend/admin-crm/src/hooks/useAvailability.test.ts

import { describe, it, expect } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import {
  useDateAvailability,
  useDateRangeAvailability,
  useCalendarAvailability,
  useBookingValidation,
  useNextAvailableDate,
  useMonthlyAvailability,
  useAvailabilityCache,
  useRealTimeAvailability,
} from "./useAvailability";
import { createTestWrapper } from "../test/utils/render";
import { server } from "../test/mocks/server";
import { http, HttpResponse } from "msw";

const BASE_URL = "http://localhost:8000/api";

describe("useAvailability", () => {
  describe("useDateAvailability", () => {
    it("fetches single date availability successfully", async () => {
      const { result } = renderHook(
        () => useDateAvailability({ start_date: "2025-03-10" }),
        { wrapper: createTestWrapper() },
      );

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.date).toBe("2025-03-10");
      expect(result.current.data?.status).toBeDefined();
      expect(result.current.data).toHaveProperty("can_book_event");
    });

    it("does not fetch when disabled", async () => {
      const { result } = renderHook(
        () => useDateAvailability({ start_date: "2025-03-10" }, false),
        { wrapper: createTestWrapper() },
      );

      // Query should be disabled - fetchStatus should be idle
      expect(result.current.fetchStatus).toBe("idle");
      expect(result.current.data).toBeUndefined();
    });

    it("handles API error gracefully", async () => {
      server.use(
        http.get(`${BASE_URL}/events/availability/check/`, () => {
          return HttpResponse.json({ detail: "Server error" }, { status: 500 });
        }),
      );

      const { result } = renderHook(
        () => useDateAvailability({ start_date: "2025-03-10" }),
        { wrapper: createTestWrapper() },
      );

      await waitFor(
        () => {
          expect(result.current.error).toBeTruthy();
        },
        { timeout: 5000 },
      );
    });
  });

  describe("useDateRangeAvailability", () => {
    it("fetches date range availability successfully", async () => {
      const { result } = renderHook(
        () => useDateRangeAvailability("2025-03-01", "2025-03-07"),
        { wrapper: createTestWrapper() },
      );

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.availability).toBeDefined();
      expect(result.current.data?.availability.length).toBeGreaterThan(0);
      expect(result.current.data?.summary).toBeDefined();
    });
  });

  describe("useCalendarAvailability", () => {
    it("returns calendar data with computed stats", async () => {
      const { result } = renderHook(
        () => useCalendarAvailability("2025-03-01", "2025-03-31"),
        { wrapper: createTestWrapper() },
      );

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      // calendarData should be an array (even if empty if underlying data shape differs)
      expect(result.current.calendarData).toBeDefined();
      expect(Array.isArray(result.current.calendarData)).toBe(true);

      // stats should have all required fields
      expect(result.current.stats).toBeDefined();
      expect(result.current.stats).toHaveProperty("totalDaysChecked");
      expect(result.current.stats).toHaveProperty("availableDays");
      expect(result.current.stats).toHaveProperty("availabilityRate");
    });
  });

  describe("useBookingValidation", () => {
    it("validates booking request successfully", async () => {
      const { result } = renderHook(() => useBookingValidation(), {
        wrapper: createTestWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          start_date: "2025-03-10",
          is_lead: false,
        });
      });

      await waitFor(
        () => {
          expect(result.current.isSuccess).toBe(true);
        },
        { timeout: 5000 },
      );

      expect(result.current.data).toBeDefined();
      expect(result.current.data).toHaveProperty("is_valid");
    });
  });

  describe("useNextAvailableDate", () => {
    it("finds next available date", async () => {
      const { result } = renderHook(
        () => useNextAvailableDate({ start_date: "2025-03-01" }),
        { wrapper: createTestWrapper() },
      );

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.search_start_date).toBe("2025-03-01");
      expect(result.current.data?.next_available_date).toBeDefined();
    });
  });

  describe("useMonthlyAvailability", () => {
    it("fetches monthly availability summary", async () => {
      const { result } = renderHook(() => useMonthlyAvailability(2025, 3), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.availability).toBeDefined();
      expect(result.current.data?.summary).toBeDefined();
    });
  });

  describe("useAvailabilityCache", () => {
    it("provides cache management functions", () => {
      const { result } = renderHook(() => useAvailabilityCache(), {
        wrapper: createTestWrapper(),
      });

      expect(result.current.invalidateCache).toBeTypeOf("function");
      expect(result.current.refreshCalendar).toBeTypeOf("function");
      expect(result.current.clearAllCache).toBeTypeOf("function");
      expect(result.current.prefetchDateRange).toBeTypeOf("function");
      expect(result.current.isInvalidating).toBe(false);
    });
  });

  describe("useRealTimeAvailability", () => {
    it("fetches real-time availability data", async () => {
      const { result } = renderHook(
        () => useRealTimeAvailability("2025-03-01", "2025-03-07"),
        { wrapper: createTestWrapper() },
      );

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.data).toBeDefined();
    });
  });
});
