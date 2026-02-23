// frontend/admin-crm/src/apis/gallery.api.ts

import api from '../utils/api';
import type { GalleryPhoto } from '../types/gallery.types';
import type { PaginatedResponse, PaginationParams } from '../types/common.types';

export interface GalleryPhotoQueryParams extends PaginationParams {
  search?: string;
  category?: string;
  ordering?: string;
}

export const galleryApi = {
  getGalleryPhotos: async (
    params?: GalleryPhotoQueryParams,
  ): Promise<PaginatedResponse<GalleryPhoto>> => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.category) searchParams.append('category', params.category);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.page_size) searchParams.append('page_size', params.page_size.toString());
    if (params?.ordering) searchParams.append('ordering', params.ordering);

    const response = await api.get<PaginatedResponse<GalleryPhoto>>(
      `/venues/gallery-photos/?${searchParams.toString()}`,
    );
    return response.data;
  },

  getGalleryPhoto: async (id: number): Promise<GalleryPhoto> => {
    const response = await api.get<GalleryPhoto>(`/venues/gallery-photos/${id}/`);
    return response.data;
  },

  createGalleryPhoto: async (formData: FormData): Promise<GalleryPhoto> => {
    const response = await api.post<GalleryPhoto>('/venues/gallery-photos/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  updateGalleryPhoto: async (id: number, formData: FormData): Promise<GalleryPhoto> => {
    const response = await api.patch<GalleryPhoto>(`/venues/gallery-photos/${id}/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteGalleryPhoto: async (id: number): Promise<void> => {
    await api.delete(`/venues/gallery-photos/${id}/`);
  },

  bulkCreateGalleryPhotos: async (formData: FormData): Promise<GalleryPhoto[]> => {
    const response = await api.post<GalleryPhoto[]>(
      '/venues/gallery-photos/bulk-create/',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return response.data;
  },
};

export default galleryApi;
