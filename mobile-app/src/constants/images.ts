/**
 * Image Constants
 *
 * Centralized fallback and placeholder images.
 * Using local bundled asset for offline support.
 */

/**
 * Single branded placeholder image for all fallback scenarios.
 * Bundled locally for reliability and offline access.
 */
const PLACEHOLDER_IMAGE = require('../../assets/Fountain-min.png');

/**
 * Fallback images for when content images are unavailable.
 * All point to the same branded placeholder for consistency.
 */
export const FALLBACK_IMAGES = {
  venue: PLACEHOLDER_IMAGE,
  package: PLACEHOLDER_IMAGE,
  event: PLACEHOLDER_IMAGE,
  avatar: PLACEHOLDER_IMAGE,
  generic: PLACEHOLDER_IMAGE,
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
