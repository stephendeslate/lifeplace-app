/**
 * Image Preloader Utility
 *
 * Utilities for preloading images using expo-image for faster display.
 * Images are cached to memory and disk for offline access.
 *
 * Features:
 * - Error handling with retry logic for failed images
 * - Image size optimization to reduce bandwidth usage
 * - Partial failure handling (other images still preload if one fails)
 */

import { Image } from 'expo-image';
import { IMAGE_SIZES } from '@/constants/images';
import { logger } from './logger';

const imageLogger = logger.create('ImagePreloader');

// =============================================================================
// TYPES
// =============================================================================

/** Image size context for optimization */
export type ImageSizeContext = keyof typeof IMAGE_SIZES;

export interface PreloadResult {
  url: string;
  success: boolean;
  error?: string;
}

export interface PreloadSummary {
  total: number;
  successful: number;
  failed: number;
  results: PreloadResult[];
}

interface PreloadOptions {
  /** Number of retry attempts for failed images (default: 2) */
  retries?: number;
  /** Delay between retries in ms (default: 500) */
  retryDelay?: number;
  /** Image size context for optimization (default: 'card') */
  sizeContext?: ImageSizeContext;
}

// =============================================================================
// IMAGE URL OPTIMIZATION
// =============================================================================

/**
 * Transforms an image URL to request an optimized size.
 *
 * Supports common image CDN URL patterns:
 * - Cloudinary: /upload/w_{width},h_{height},c_fill/
 * - Imgix: ?w={width}&h={height}&fit=crop
 * - Query parameter: ?width={width}&height={height}
 *
 * If the URL doesn't match any known pattern, returns the original URL.
 * Note: For best results, ensure your image CDN supports URL-based resizing.
 */
export const getOptimizedImageUrl = (
  url: string,
  sizeContext: ImageSizeContext = 'card'
): string => {
  if (!url) return url;

  const size = IMAGE_SIZES[sizeContext];
  const { width, height } = size;

  // Cloudinary URLs - insert transformation params after /upload/
  if (url.includes('cloudinary.com') && url.includes('/upload/')) {
    const transformParams = `w_${width},h_${height},c_fill,q_auto,f_auto`;
    return url.replace('/upload/', `/upload/${transformParams}/`);
  }

  // Imgix URLs - append query parameters
  if (url.includes('imgix.net')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}w=${width}&h=${height}&fit=crop&auto=format,compress`;
  }

  // Generic query parameter approach (for backend support)
  // Only apply if URL appears to support query params and doesn't already have size params
  if (!url.includes('width=') && !url.includes('w=') && !url.includes('placehold.co')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}width=${width}&height=${height}`;
  }

  // Return original URL if no optimization pattern matches
  return url;
};

/**
 * Batch optimize image URLs
 */
export const getOptimizedImageUrls = (
  urls: string[],
  sizeContext: ImageSizeContext = 'card'
): string[] => {
  return urls.map((url) => getOptimizedImageUrl(url, sizeContext));
};

// =============================================================================
// PRELOAD WITH RETRY
// =============================================================================

/**
 * Preload a single image with retry logic
 */
const preloadWithRetry = async (
  url: string,
  retries: number = 2,
  retryDelay: number = 500
): Promise<PreloadResult> => {
  let lastError: string | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await Image.prefetch(url);
      return { url, success: true };
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';

      if (attempt < retries) {
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
        imageLogger.debug(`Retrying image prefetch (attempt ${attempt + 2}): ${url}`);
      }
    }
  }

  imageLogger.warn(`Failed to preload image after ${retries + 1} attempts: ${url}`, lastError);
  return { url, success: false, error: lastError };
};

// =============================================================================
// PRELOAD FUNCTIONS
// =============================================================================

/**
 * Preload critical images for faster display.
 *
 * Features:
 * - Handles partial failures (continues even if some images fail)
 * - Retry logic for transient failures
 * - Returns detailed results for debugging
 */
export const preloadImages = async (
  urls: string[],
  options: PreloadOptions = {}
): Promise<PreloadSummary> => {
  const {
    retries = 2,
    retryDelay = 500,
    sizeContext = 'card',
  } = options;

  const validUrls = urls.filter(Boolean);

  if (validUrls.length === 0) {
    return { total: 0, successful: 0, failed: 0, results: [] };
  }

  // Optimize URLs for the specified size context
  const optimizedUrls = getOptimizedImageUrls(validUrls, sizeContext);

  // Use Promise.allSettled to handle partial failures gracefully
  const results = await Promise.allSettled(
    optimizedUrls.map((url) => preloadWithRetry(url, retries, retryDelay))
  );

  // Process results
  const processedResults: PreloadResult[] = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return {
      url: optimizedUrls[index],
      success: false,
      error: result.reason?.message || 'Promise rejected',
    };
  });

  const successful = processedResults.filter((r) => r.success).length;
  const failed = processedResults.filter((r) => !r.success).length;

  if (failed > 0) {
    imageLogger.info(`Preloaded ${successful}/${validUrls.length} images (${failed} failed)`);
  }

  return {
    total: validUrls.length,
    successful,
    failed,
    results: processedResults,
  };
};

/**
 * Preload event images when viewing events list
 */
export const preloadEventImages = async (
  events: Array<{ featured_image?: string | null }>,
  options?: Omit<PreloadOptions, 'sizeContext'>
): Promise<PreloadSummary> => {
  const urls = events
    .map((e) => e.featured_image)
    .filter((url): url is string => Boolean(url));

  return preloadImages(urls, { ...options, sizeContext: 'card' });
};

/**
 * Preload venue images for booking flow
 */
export const preloadVenueImages = async (
  venues: Array<{ primary_image?: string | null; gallery?: string[] }>,
  options?: PreloadOptions
): Promise<PreloadSummary> => {
  const urls: string[] = [];

  venues.forEach((venue) => {
    if (venue.primary_image) {
      urls.push(venue.primary_image);
    }
    if (venue.gallery?.length) {
      urls.push(...venue.gallery.slice(0, 3)); // Preload first 3 gallery images
    }
  });

  return preloadImages(urls, { ...options, sizeContext: options?.sizeContext || 'card' });
};

/**
 * Preload a single image with error handling
 */
export const preloadImage = async (
  url: string | null | undefined,
  options?: PreloadOptions
): Promise<PreloadResult | null> => {
  if (!url) return null;

  const { retries = 2, retryDelay = 500, sizeContext = 'card' } = options || {};
  const optimizedUrl = getOptimizedImageUrl(url, sizeContext);

  return preloadWithRetry(optimizedUrl, retries, retryDelay);
};

/**
 * Preload gallery images with appropriate sizing
 */
export const preloadGalleryImages = async (
  urls: string[],
  options?: Omit<PreloadOptions, 'sizeContext'>
): Promise<PreloadSummary> => {
  return preloadImages(urls, { ...options, sizeContext: 'gallery' });
};

/**
 * Clear image cache
 * Note: expo-image manages cache automatically, but this can be used
 * for manual cache clearing if needed
 */
export const clearImageCache = async (): Promise<void> => {
  await Image.clearDiskCache();
  await Image.clearMemoryCache();
  imageLogger.info('Image cache cleared');
};
