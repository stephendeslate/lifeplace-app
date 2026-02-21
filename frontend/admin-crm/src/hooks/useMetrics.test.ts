// frontend/admin-crm/src/hooks/useMetrics.test.ts

import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  useKPISnapshots,
  useKPISnapshotSummary,
  useSystemHealthSnapshots,
  useDORAMetrics,
  useDeploymentHistory,
} from "./useMetrics";
import { createTestWrapper } from "../test/utils/render";
import { server } from "../test/mocks/server";
import { http, HttpResponse } from "msw";

const BASE_URL = "http://localhost:8000/api";

describe("useMetrics", () => {
  describe("useKPISnapshots", () => {
    it("fetches KPI snapshots successfully", async () => {
      const { result } = renderHook(() => useKPISnapshots(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.data).toBeDefined();
      expect(result.current.data).toHaveProperty("snapshots");
    });

    it("handles API error gracefully", async () => {
      server.use(
        http.get(`${BASE_URL}/analytics/snapshots/kpis/`, () => {
          return HttpResponse.json({ detail: "Server error" }, { status: 500 });
        }),
      );

      const { result } = renderHook(() => useKPISnapshots(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.error).toBeTruthy();
        },
        { timeout: 5000 },
      );
    });
  });

  describe("useKPISnapshotSummary", () => {
    it("fetches KPI snapshot summary", async () => {
      const { result } = renderHook(() => useKPISnapshotSummary(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.data).toBeDefined();
    });
  });

  describe("useSystemHealthSnapshots", () => {
    it("fetches system health snapshots", async () => {
      const { result } = renderHook(() => useSystemHealthSnapshots(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.data).toBeDefined();
      expect(result.current.data).toHaveProperty("snapshots");
    });
  });

  describe("useDORAMetrics", () => {
    it("fetches DORA metrics", async () => {
      const { result } = renderHook(() => useDORAMetrics(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.data).toBeDefined();
    });
  });

  describe("useDeploymentHistory", () => {
    it("fetches deployment history", async () => {
      const { result } = renderHook(() => useDeploymentHistory(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.data).toBeDefined();
      expect(Array.isArray(result.current.data)).toBe(true);
      if (result.current.data && result.current.data.length > 0) {
        expect(result.current.data[0]).toHaveProperty("service");
        expect(result.current.data[0]).toHaveProperty("status");
      }
    });
  });
});
