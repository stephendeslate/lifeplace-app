// frontend/admin-crm/src/types/gallery.types.ts

export interface GalleryPhoto {
  id: number;
  image: string;
  title: string;
  description: string;
  category: string;
  venue: number | null;
  venue_name: string | null;
  event_type: number | null;
  event_type_name: string | null;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface GalleryPhotoFormData {
  image: File | string | null;
  title: string;
  description: string;
  category: string;
  venue: number | null;
  event_type: number | null;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
}

export type CreateGalleryPhotoData = Omit<GalleryPhotoFormData, "image">;
export type UpdateGalleryPhotoData = Partial<CreateGalleryPhotoData>;

// Category choices matching backend
export const GALLERY_CATEGORIES = [
  { value: "GENERAL", label: "General" },
  { value: "WEDDING", label: "Wedding" },
  { value: "TEAM_BUILDING", label: "Team Building" },
  { value: "RETREAT", label: "Retreat" },
  { value: "WORKSHOP", label: "Workshop" },
  { value: "CAMPING", label: "Camping" },
  { value: "ATMOSPHERE", label: "Atmosphere & Details" },
];
