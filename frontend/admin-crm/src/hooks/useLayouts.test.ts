// frontend/admin-crm/src/hooks/useLayouts.test.ts

import { describe, it, expect } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useLayouts } from "./useLayouts";
import { createTestWrapper } from "../test/utils/render";
import { server } from "../test/mocks/server";
import { http, HttpResponse } from "msw";

const BASE_URL = "http://localhost:8000/api";

describe("useLayouts", () => {
  describe("useAllLayouts", () => {
    it("fetches all layouts successfully", async () => {
      const { result } = renderHook(
        () => {
          const layouts = useLayouts();
          const allLayouts = layouts.useAllLayouts();
          return { layouts, allLayouts };
        },
        { wrapper: createTestWrapper() },
      );

      await waitFor(
        () => {
          expect(result.current.allLayouts.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.allLayouts.data).toBeDefined();
      expect(Array.isArray(result.current.allLayouts.data)).toBe(true);
      expect(result.current.allLayouts.data.length).toBeGreaterThan(0);
      expect(result.current.allLayouts.totalCount).toBeGreaterThan(0);
    });

    it("handles API error gracefully", async () => {
      server.use(
        http.get(`${BASE_URL}/communications/layouts/`, () => {
          return HttpResponse.json({ detail: "Server error" }, { status: 500 });
        }),
      );

      const { result } = renderHook(
        () => {
          const layouts = useLayouts();
          const allLayouts = layouts.useAllLayouts();
          return { allLayouts };
        },
        { wrapper: createTestWrapper() },
      );

      await waitFor(
        () => {
          expect(result.current.allLayouts.error).toBeTruthy();
        },
        { timeout: 5000 },
      );
    });
  });

  describe("useLayout (single)", () => {
    it("fetches single layout by ID", async () => {
      const { result } = renderHook(
        () => {
          const layouts = useLayouts();
          const layout = layouts.useLayout(1);
          return { layout };
        },
        { wrapper: createTestWrapper() },
      );

      await waitFor(
        () => {
          expect(result.current.layout.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.layout.data).toBeDefined();
      expect(result.current.layout.data?.id).toBe(1);
    });
  });

  describe("useCreateLayout", () => {
    it("creates a layout successfully", async () => {
      const { result } = renderHook(
        () => {
          const layouts = useLayouts();
          const createLayout = layouts.useCreateLayout();
          return { createLayout };
        },
        { wrapper: createTestWrapper() },
      );

      await act(async () => {
        result.current.createLayout.mutate({
          name: "Test Layout",
          header_template: "<div>Header</div>",
          footer_template: "<div>Footer</div>",
          wrapper_template: "<div>{{header}}{{content}}{{footer}}</div>",
        });
      });

      await waitFor(
        () => {
          expect(result.current.createLayout.isSuccess).toBe(true);
        },
        { timeout: 5000 },
      );

      expect(result.current.createLayout.data).toBeDefined();
      expect(result.current.createLayout.data?.name).toBe("Test Layout");
    });
  });

  describe("useDeleteLayout", () => {
    it("deletes a layout successfully", async () => {
      const { result } = renderHook(
        () => {
          const layouts = useLayouts();
          const deleteLayout = layouts.useDeleteLayout();
          return { deleteLayout };
        },
        { wrapper: createTestWrapper() },
      );

      await act(async () => {
        result.current.deleteLayout.mutate(1);
      });

      await waitFor(
        () => {
          expect(result.current.deleteLayout.isSuccess).toBe(true);
        },
        { timeout: 5000 },
      );
    });
  });

  describe("useLayoutHistory", () => {
    it("fetches layout history", async () => {
      const { result } = renderHook(
        () => {
          const layouts = useLayouts();
          const history = layouts.useLayoutHistory(1);
          return { history };
        },
        { wrapper: createTestWrapper() },
      );

      await waitFor(
        () => {
          expect(result.current.history.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.history.data).toBeDefined();
      expect(Array.isArray(result.current.history.data)).toBe(true);
    });
  });

  describe("useDuplicateLayout", () => {
    it("duplicates a layout", async () => {
      const { result } = renderHook(
        () => {
          const layouts = useLayouts();
          const duplicateLayout = layouts.useDuplicateLayout();
          return { duplicateLayout };
        },
        { wrapper: createTestWrapper() },
      );

      await act(async () => {
        result.current.duplicateLayout.mutate({
          id: 1,
          newName: "Duplicated Layout",
        });
      });

      await waitFor(
        () => {
          expect(result.current.duplicateLayout.isSuccess).toBe(true);
        },
        { timeout: 5000 },
      );

      expect(result.current.duplicateLayout.data).toBeDefined();
    });
  });
});
