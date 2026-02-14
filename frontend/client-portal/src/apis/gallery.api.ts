import api from "../utils/api";
import type { VenuePublic } from "../types/booking/venues.types";
import type { GalleryPhotoPublic } from "../types/gallery.types";
import type { EventType } from "../types/booking/core.types";

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export class GalleryApi {
  static async getVenuesWithGallery(): Promise<VenuePublic[]> {
    const response = await api.get<
      VenuePublic[] | PaginatedResponse<VenuePublic>
    >("/venues/public/");
    const data = response.data;
    return Array.isArray(data) ? data : data.results || [];
  }

  static async getGalleryPhotos(
    category?: string,
  ): Promise<GalleryPhotoPublic[]> {
    const params = category ? { category } : {};
    const response = await api.get<
      GalleryPhotoPublic[] | PaginatedResponse<GalleryPhotoPublic>
    >("/venues/public/gallery/", { params });
    const data = response.data;
    return Array.isArray(data) ? data : data.results || [];
  }

  static async getEventTypesWithImages(): Promise<EventType[]> {
    const response = await api.get<EventType[]>("/events/event-types/");
    return response.data;
  }
}

export default GalleryApi;
