// frontend/client-portal/src/config/availability.config.ts

/**
 * Centralized availability configuration for booking calendars.
 * Used by both the home page calendar and booking flow date selection.
 *
 * This ensures consistency across all calendar views in the application.
 */
export const availabilityConfig = {
  /**
   * Minimum number of days in advance that a booking can be made.
   * - 1 = Can book starting tomorrow
   * - 7 = Must book at least 7 days ahead
   *
   * This gives the business time to prepare for events.
   */
  minAdvanceBookingDays: 7,

  /**
   * Maximum number of days in advance that a booking can be made.
   * 365 = Can book up to 1 year ahead
   */
  maxAdvanceBookingDays: 365,

  /**
   * Stale time for availability queries (in milliseconds).
   * After this time, the data will be refetched in the background.
   */
  queryStaleTime: 5 * 60 * 1000, // 5 minutes

  /**
   * Garbage collection time for cached availability data (in milliseconds).
   */
  queryCacheTime: 10 * 60 * 1000, // 10 minutes
} as const;

export type AvailabilityConfig = typeof availabilityConfig;
