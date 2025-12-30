/**
 * Session Configuration Constants
 *
 * Session timeout and security configuration values.
 * Values can be overridden via environment variables:
 * - EXPO_PUBLIC_SESSION_TIMEOUT_MINUTES: Session timeout in minutes (default: 30)
 * - EXPO_PUBLIC_SESSION_WARNING_MINUTES: Warning before timeout in minutes (default: 5)
 */

/**
 * Parse environment variable to number with fallback
 */
function parseEnvMinutes(envVar: string | undefined, defaultMinutes: number): number {
  if (!envVar) return defaultMinutes;
  const parsed = parseInt(envVar, 10);
  return isNaN(parsed) || parsed <= 0 ? defaultMinutes : parsed;
}

/**
 * Session timeout in milliseconds
 * Default: 30 minutes
 */
export const SESSION_TIMEOUT_MS =
  parseEnvMinutes(process.env.EXPO_PUBLIC_SESSION_TIMEOUT_MINUTES, 30) * 60 * 1000;

/**
 * Warning time before session timeout in milliseconds
 * Default: 5 minutes
 */
export const SESSION_WARNING_MS =
  parseEnvMinutes(process.env.EXPO_PUBLIC_SESSION_WARNING_MINUTES, 5) * 60 * 1000;

/**
 * Session storage key
 */
export const LAST_ACTIVITY_KEY = 'last_activity_timestamp';

/**
 * Session check interval in milliseconds
 * How often to check for session expiry while app is active
 * Default: 1 minute
 */
export const SESSION_CHECK_INTERVAL_MS = 60 * 1000;
