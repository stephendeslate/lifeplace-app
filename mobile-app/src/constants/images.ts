/**
 * Image Constants
 *
 * Centralized fallback and placeholder images.
 * Replace these URLs with CDN-hosted images when available.
 */

// Fallback placeholder configuration
// TODO: Replace with CDN-hosted branded fallback images
// Example: 'https://cdn.lifeplace.com/placeholders/venue.jpg'

const PLACEHOLDER_BASE_COLOR = 'FAF9F7';
const PLACEHOLDER_TEXT_COLOR = '9B9590';

/**
 * Fallback images for when content images are unavailable.
 * Using data URIs for reliability - no external dependencies.
 */
export const FALLBACK_IMAGES = {
  /**
   * Fallback for venue images
   */
  venue: `https://placehold.co/400x300/${PLACEHOLDER_BASE_COLOR}/${PLACEHOLDER_TEXT_COLOR}?text=Venue`,

  /**
   * Fallback for package images
   */
  package: `https://placehold.co/400x300/${PLACEHOLDER_BASE_COLOR}/${PLACEHOLDER_TEXT_COLOR}?text=Package`,

  /**
   * Fallback for event images
   */
  event: `https://placehold.co/400x300/${PLACEHOLDER_BASE_COLOR}/${PLACEHOLDER_TEXT_COLOR}?text=Event`,

  /**
   * Fallback for user profile images
   */
  avatar: `https://placehold.co/200x200/${PLACEHOLDER_BASE_COLOR}/${PLACEHOLDER_TEXT_COLOR}?text=User`,

  /**
   * Generic fallback image
   */
  generic: `https://placehold.co/400x300/${PLACEHOLDER_BASE_COLOR}/${PLACEHOLDER_TEXT_COLOR}?text=Image`,
} as const;

/**
 * Image sizing configurations
 */
export const IMAGE_SIZES = {
  thumbnail: { width: 100, height: 100 },
  card: { width: 400, height: 300 },
  gallery: { width: 800, height: 600 },
  fullscreen: { width: 1200, height: 900 },
} as const;

export default FALLBACK_IMAGES;
