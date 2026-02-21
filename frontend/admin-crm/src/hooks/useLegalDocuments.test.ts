// frontend/admin-crm/src/hooks/useLegalDocuments.test.ts

import { describe, it, expect } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useLegalDocuments, useLegalDocument } from "./useLegalDocuments";
import { createTestWrapper } from "../test/utils/render";
import { server } from "../test/mocks/server";
import { http, HttpResponse } from "msw";

const BASE_URL = "http://localhost:8000/api";

describe("useLegalDocuments", () => {
  describe("useLegalDocuments (list)", () => {
    it("fetches all legal documents successfully", async () => {
      const { result } = renderHook(() => useLegalDocuments(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingDocuments).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.legalDocuments).toBeDefined();
      expect(Array.isArray(result.current.legalDocuments)).toBe(true);
      expect(result.current.legalDocuments.length).toBeGreaterThan(0);
    });

    it("handles API error gracefully", async () => {
      server.use(
        http.get(`${BASE_URL}/settings/legal/`, () => {
          return HttpResponse.json({ detail: "Server error" }, { status: 500 });
        }),
      );

      const { result } = renderHook(() => useLegalDocuments(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.documentsError).toBeTruthy();
        },
        { timeout: 5000 },
      );
    });

    it("provides update mutation", async () => {
      const { result } = renderHook(() => useLegalDocuments(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingDocuments).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.updateLegalDocument).toBeTypeOf("function");
      expect(result.current.isUpdatingDocument).toBe(false);
    });

    it("updates a legal document", async () => {
      const { result } = renderHook(() => useLegalDocuments(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingDocuments).toBe(false);
        },
        { timeout: 5000 },
      );

      act(() => {
        result.current.updateLegalDocument({
          documentType: "TERMS_OF_SERVICE",
          data: { content: "Updated terms content" },
        });
      });

      await waitFor(
        () => {
          expect(result.current.isUpdatingDocument).toBe(false);
        },
        { timeout: 5000 },
      );
    });
  });

  describe("useLegalDocument (single)", () => {
    it("fetches single legal document by type", async () => {
      const { result } = renderHook(
        () => useLegalDocument("TERMS_OF_SERVICE"),
        { wrapper: createTestWrapper() },
      );

      await waitFor(
        () => {
          expect(result.current.isLoadingDocument).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.legalDocument).toBeDefined();
    });

    it("does not fetch when documentType is null", async () => {
      const { result } = renderHook(() => useLegalDocument(null), {
        wrapper: createTestWrapper(),
      });

      // Query should be disabled
      expect(result.current.legalDocument).toBeUndefined();
    });
  });
});
