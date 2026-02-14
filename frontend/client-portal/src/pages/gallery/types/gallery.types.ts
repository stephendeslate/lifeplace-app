// pages/gallery/types/gallery.types.ts

export interface GalleryPageProps {
  onNavigateToBooking?: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GalleryHeroProps {}

export interface GalleryContentProps {
  initialCategory?: string;
  onNavigateToBooking?: () => void;
}

export interface GalleryCategory {
  id: string;
  label: string;
  backendValues: string[];
}
