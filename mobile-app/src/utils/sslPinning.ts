/**
 * SSL Certificate Pinning
 *
 * Prevents man-in-the-middle attacks by ensuring the app only communicates
 * with servers presenting expected SSL certificates.
 *
 * IMPORTANT: Requires EAS development build (not Expo Go)
 *
 * Phase 13: Security Hardening
 *
 * To generate certificate hashes:
 * ```bash
 * # Leaf certificate (primary):
 * openssl s_client -connect lifeplace-api.fly.dev:443 2>/dev/null | \
 *   openssl x509 -pubkey -noout | \
 *   openssl pkey -pubin -outform der | \
 *   openssl dgst -sha256 -binary | base64
 *
 * # Intermediate CA certificate (backup):
 * openssl s_client -connect lifeplace-api.fly.dev:443 -showcerts 2>/dev/null | \
 *   awk 'BEGIN{n=0}/BEGIN CERTIFICATE/{n++}n==2' | \
 *   openssl x509 -pubkey -noout | \
 *   openssl pkey -pubin -outform der | \
 *   openssl dgst -sha256 -binary | base64
 * ```
 */

import { logger } from "./logger";

const sslLogger = logger.create("SSLPinning");

// =============================================================================
// TYPES
// =============================================================================

interface SSLPinConfig {
  [domain: string]: {
    includeSubdomains: boolean;
    publicKeyHashes: string[];
  };
}

interface SSLPinningResult {
  success: boolean;
  error?: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * SSL certificate pins for the LifePlace API.
 *
 * Always include at least 2 pins:
 * 1. Primary/current certificate
 * 2. Backup certificate for rotation
 *
 * IMPORTANT: Update these hashes when rotating certificates.
 * Schedule certificate rotation at least 90 days before expiry.
 */
const SSL_PINS: SSLPinConfig = {
  "lifeplace-api.fly.dev": {
    includeSubdomains: true,
    publicKeyHashes: [
      "sha256/1v+R//jEMn05LRXJ17Cs8GIiV0/In3BIqhadtHKxhn0=", // Leaf cert
      "sha256/y7xVm0TVJNahMr2sZydE2jQH8SquXV9yLF9seROHHHU=", // Intermediate CA (backup)
    ],
  },
  "lifeplace.dev": {
    includeSubdomains: true,
    publicKeyHashes: [
      "sha256/k6SKmWguUKgBd4OJCLVCIse/8uTzrBUkzScrAgnuKTE=", // Leaf cert
      "sha256/kIdp6NNEd8wsugYyyIYFsi1ylMCED3hZbSR8ZFsa/A4=", // Intermediate CA (backup)
    ],
  },
};

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize SSL certificate pinning.
 *
 * Should be called early in app initialization, before any API calls.
 * Skipped in development mode to allow debugging with proxies.
 *
 * @returns Promise<SSLPinningResult> - Success status and any error
 */
export async function initSSLPinning(): Promise<SSLPinningResult> {
  // Skip in development to allow debugging with Charles/mitmproxy
  if (__DEV__) {
    sslLogger.debug("Skipped in development mode");
    return { success: true };
  }

  try {
    // Dynamic import to avoid issues in development
    const { initializeSslPinning } =
      await import("react-native-ssl-public-key-pinning");

    await initializeSslPinning(SSL_PINS);

    sslLogger.info("Initialized successfully");
    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    sslLogger.error("Initialization failed -", errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Check if SSL pinning is available on the current platform.
 *
 * SSL pinning requires native modules and won't work in Expo Go.
 */
export async function isSSLPinningAvailable(): Promise<boolean> {
  if (__DEV__) {
    return false; // Disabled in dev
  }

  try {
    await import("react-native-ssl-public-key-pinning");
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the current SSL pin configuration.
 * Useful for debugging and monitoring.
 */
export function getSSLPinConfig(): SSLPinConfig {
  return { ...SSL_PINS };
}

export default {
  initSSLPinning,
  isSSLPinningAvailable,
  getSSLPinConfig,
};
