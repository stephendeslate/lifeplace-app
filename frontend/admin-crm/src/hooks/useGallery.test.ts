// frontend/admin-crm/src/hooks/useGallery.test.ts

import { describe, it, expect } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useGalleryPhotos } from "./useGallery";
import { createTestWrapper } from "../test/utils/render";
import { server } from "../test/mocks/server";
import { http, HttpResponse } from "msw";

const BASE_URL = "http://localhost:8000/api";

describe("useGallery", () => {
  describe("useGalleryPhotos", () => {
    it("fetches gallery photos successfully", async () => {
      const { result } = renderHook(() => useGalleryPhotos(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingGalleryPhotos).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.galleryPhotos).toBeDefined();
      expect(Array.isArray(result.current.galleryPhotos)).toBe(true);
      expect(result.current.galleryPhotos.length).toBeGreaterThan(0);
      expect(result.current.totalCount).toBeGreaterThan(0);
      expect(result.current.pageCount).toBeGreaterThanOrEqual(1);
    });

    it("handles API error gracefully", async () => {
      server.use(
        http.get(`${BASE_URL}/venues/gallery-photos/`, () => {
          return HttpResponse.json({ detail: "Server error" }, { status: 500 });
        }),
      );

      const { result } = renderHook(() => useGalleryPhotos(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.galleryPhotosError).toBeTruthy();
        },
        { timeout: 5000 },
      );
    });

    it("creates a gallery photo", async () => {
      const { result } = renderHook(() => useGalleryPhotos(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingGalleryPhotos).toBe(false);
        },
        { timeout: 5000 },
      );

      const formData = new FormData();
      formData.append("title", "Test Photo");
      formData.append("category", "GENERAL");

      act(() => {
        result.current.createGalleryPhoto(formData);
      });

      await waitFor(
        () => {
          expect(result.current.isCreatingGalleryPhoto).toBe(false);
        },
        { timeout: 5000 },
      );
    });

    it("deletes a gallery photo", async () => {
      const { result } = renderHook(() => useGalleryPhotos(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingGalleryPhotos).toBe(false);
          expect(result.current.galleryPhotos.length).toBeGreaterThan(0);
        },
        { timeout: 5000 },
      );

      const photoId = result.current.galleryPhotos[0].id;

      act(() => {
        result.current.deleteGalleryPhoto(photoId);
      });

      await waitFor(
        () => {
          expect(result.current.isDeletingGalleryPhoto).toBe(false);
        },
        { timeout: 5000 },
      );
    });

    it("bulk creates gallery photos", async () => {
      const { result } = renderHook(() => useGalleryPhotos(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingGalleryPhotos).toBe(false);
        },
        { timeout: 5000 },
      );

      const formData = new FormData();
      formData.append("category", "GENERAL");
      formData.append("images", new Blob(["img1"], { type: "image/jpeg" }));
      formData.append("images", new Blob(["img2"], { type: "image/jpeg" }));

      act(() => {
        result.current.bulkCreateGalleryPhotos(formData);
      });

      await waitFor(
        () => {
          expect(result.current.isBulkCreatingGalleryPhotos).toBe(false);
        },
        { timeout: 5000 },
      );
    });

    it("provides all expected action functions", async () => {
      const { result } = renderHook(() => useGalleryPhotos(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingGalleryPhotos).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.createGalleryPhoto).toBeTypeOf("function");
      expect(result.current.updateGalleryPhoto).toBeTypeOf("function");
      expect(result.current.deleteGalleryPhoto).toBeTypeOf("function");
      expect(result.current.bulkCreateGalleryPhotos).toBeTypeOf("function");
      expect(result.current.refetchGalleryPhotos).toBeTypeOf("function");
    });
  });
});
