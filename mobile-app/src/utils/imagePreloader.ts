/**
 * Image Preloader Utility
 *
 * Utilities for preloading images using expo-image for faster display.
 * Images are cached to memory and disk for offline access.
 */

import { Image } from 'expo-image';

/**
 * Preload critical images for faster display
 */
export const preloadImages = async (urls: string[]): Promise<void> => {
  await Promise.all(urls.filter(Boolean).map((url) => Image.prefetch(url)));
};

/**
 * Preload event images when viewing events list
 */
export const preloadEventImages = async (
  events: Array<{ featured_image?: string | null }>
) => {
  const urls = events
    .map((e) => e.featured_image)
    .filter((url): url is string => Boolean(url));
  await preloadImages(urls);
};

/**
 * Preload venue images for booking flow
 */
export const preloadVenueImages = async (
  venues: Array<{ primary_image?: string | null; gallery?: string[] }>
) => {
  const urls: string[] = [];

  venues.forEach((venue) => {
    if (venue.primary_image) {
      urls.push(venue.primary_image);
    }
    if (venue.gallery?.length) {
      urls.push(...venue.gallery.slice(0, 3)); // Preload first 3 gallery images
    }
  });

  await preloadImages(urls);
};

/**
 * Preload a single image
 */
export const preloadImage = async (url: string | null | undefined): Promise<void> => {
  if (url) {
    await Image.prefetch(url);
  }
};

/**
 * Clear image cache
 * Note: expo-image manages cache automatically, but this can be used
 * for manual cache clearing if needed
 */
export const clearImageCache = async (): Promise<void> => {
  await Image.clearDiskCache();
  await Image.clearMemoryCache();
};
