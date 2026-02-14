export interface GalleryImage {
  src: string;
  alt: string;
  category?: string;
  venueId?: number;
  venueName?: string;
  eventType?: string;
}

export interface GalleryPhotoPublic {
  id: number;
  image: string;
  title: string;
  description: string;
  category: string;
  venue_id: number | null;
  venue_name: string | null;
  event_type_id: number | null;
  event_type_name: string | null;
  is_featured: boolean;
}
