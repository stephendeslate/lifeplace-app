// frontend/admin-crm/src/apis/gallery.api.ts

import api from "../utils/api";
import type { GalleryPhoto } from "../types/gallery.types";
import type { PaginatedResponse } from "../types/common.types";

export interface GalleryPhotoFilters {
  search?: string;
  category?: string;
}

export const galleryApi = {
  getGalleryPhotos: async (
    filters?: GalleryPhotoFilters,
  ): Promise<GalleryPhoto[]> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append("search", filters.search);
    if (filters?.category) params.append("category", filters.category);

    const response = await api.get(
      `/venues/gallery-photos/?${params.toString()}`,
    );
    const data = response.data as
      | PaginatedResponse<GalleryPhoto>
      | GalleryPhoto[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getGalleryPhoto: async (id: number): Promise<GalleryPhoto> => {
    const response = await api.get<GalleryPhoto>(
      `/venues/gallery-photos/${id}/`,
    );
    return response.data;
  },

  createGalleryPhoto: async (formData: FormData): Promise<GalleryPhoto> => {
    const response = await api.post<GalleryPhoto>(
      "/venues/gallery-photos/",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  },

  updateGalleryPhoto: async (
    id: number,
    formData: FormData,
  ): Promise<GalleryPhoto> => {
    const response = await api.patch<GalleryPhoto>(
      `/venues/gallery-photos/${id}/`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  },

  deleteGalleryPhoto: async (id: number): Promise<void> => {
    await api.delete(`/venues/gallery-photos/${id}/`);
  },

  bulkCreateGalleryPhotos: async (
    formData: FormData,
  ): Promise<GalleryPhoto[]> => {
    const response = await api.post<GalleryPhoto[]>(
      "/venues/gallery-photos/bulk-create/",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  },
};

export default galleryApi;
