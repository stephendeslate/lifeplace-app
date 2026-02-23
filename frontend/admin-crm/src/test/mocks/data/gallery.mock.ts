import type { GalleryPhoto } from '../../../types/gallery.types';

export function createMockGalleryPhoto(overrides: Partial<GalleryPhoto> = {}): GalleryPhoto {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  return {
    id,
    image: `/media/gallery/photo-${id}.jpg`,
    title: `Gallery Photo ${id}`,
    description: `Description for photo ${id}`,
    category: 'GENERAL',
    venue: null,
    venue_name: null,
    event_type: null,
    event_type_name: null,
    is_featured: false,
    is_active: true,
    sort_order: id,
    created_at: '2024-06-15T10:00:00Z',
    updated_at: '2024-06-15T10:00:00Z',
    ...overrides,
  };
}

export function createMockGalleryPhotos(count: number): GalleryPhoto[] {
  const photoConfigs = [
    {
      title: 'Wedding Ceremony',
      category: 'WEDDING',
      is_featured: true,
    },
    {
      title: 'Team Building Activity',
      category: 'TEAM_BUILDING',
      is_featured: false,
    },
    {
      title: 'Retreat Sunset View',
      category: 'CAMPS_AND_RETREATS',
      is_featured: true,
    },
    {
      title: 'Workshop Setup',
      category: 'WORKSHOP',
      is_featured: false,
    },
    {
      title: 'Venue Atmosphere',
      category: 'ATMOSPHERE',
      is_featured: false,
    },
  ];
  return Array.from({ length: count }, (_, i) => {
    const config = photoConfigs[i % photoConfigs.length];
    return createMockGalleryPhoto({
      id: i + 1,
      title: config.title,
      category: config.category,
      is_featured: config.is_featured,
      is_active: i % 5 !== 0,
      sort_order: i + 1,
    });
  });
}

export const mockGalleryPhotos = createMockGalleryPhotos(5);

export interface GalleryCategory {
  value: string;
  label: string;
  count: number;
}

export function createMockGalleryCategory(
  overrides: Partial<GalleryCategory> = {},
): GalleryCategory {
  return {
    value: 'GENERAL',
    label: 'General',
    count: 10,
    ...overrides,
  };
}

export function createMockGalleryCategories(): GalleryCategory[] {
  return [
    createMockGalleryCategory({
      value: 'GENERAL',
      label: 'General',
      count: 15,
    }),
    createMockGalleryCategory({
      value: 'WEDDING',
      label: 'Wedding',
      count: 25,
    }),
    createMockGalleryCategory({
      value: 'TEAM_BUILDING',
      label: 'Team Building',
      count: 12,
    }),
    createMockGalleryCategory({
      value: 'CAMPS_AND_RETREATS',
      label: 'Camps & Retreats',
      count: 8,
    }),
    createMockGalleryCategory({
      value: 'WORKSHOP',
      label: 'Workshop',
      count: 6,
    }),
    createMockGalleryCategory({
      value: 'ATMOSPHERE',
      label: 'Atmosphere & Details',
      count: 10,
    }),
  ];
}

export const mockGalleryCategories = createMockGalleryCategories();
