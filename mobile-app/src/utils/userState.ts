/**
 * User State Detection Utilities
 *
 * Helper functions for determining user state to drive conditional UI rendering.
 * Used primarily by the Home screen to show different layouts based on user activity.
 */

import type { User } from '@/types/auth.types';
import type { DashboardResult } from '@/hooks/useDashboard';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Layout type determines which home screen experience to show
 */
export type LayoutType = 'management' | 'discovery';

/**
 * User state information for conditional rendering
 */
export interface UserState {
  /** Whether user has any active bookings or events */
  hasActiveBookings: boolean;
  /** Whether user is considered "new" (joined recently without bookings) */
  isNewUser: boolean;
  /** Number of days since the user joined */
  daysSinceJoined: number;
  /** Which layout type to display */
  layoutType: LayoutType;
}

// =============================================================================
// USER STATE DETECTION
// =============================================================================

/**
 * Default threshold in days for considering a user "new"
 */
const NEW_USER_THRESHOLD_DAYS = 7;

/**
 * Determines if a user has active bookings based on dashboard data.
 *
 * A user is considered to have active bookings if they have:
 * - An upcoming event scheduled
 * - Any pending quotes needing response
 * - Any overdue payments
 * - Any pending contracts needing signature
 * - Any urgent tasks assigned
 *
 * @param dashboardData - Aggregated dashboard data from useDashboard hook
 * @returns True if user has any active booking activity
 */
export function hasActiveBookings(dashboardData: DashboardResult | undefined): boolean {
  if (!dashboardData) return false;

  const { criticalActions, nextEvent } = dashboardData;

  // Has upcoming event
  if (nextEvent) return true;

  // Has any critical actions pending
  if (criticalActions) {
    if (criticalActions.pendingQuotes.length > 0) return true;
    if (criticalActions.overduePayments.length > 0) return true;
    if (criticalActions.pendingContracts.length > 0) return true;
    if (criticalActions.urgentTasks.length > 0) return true;
  }

  return false;
}

/**
 * Calculates the number of days since a user joined.
 *
 * @param user - The authenticated user object
 * @returns Number of days since registration, or 0 if user is null
 */
export function getDaysSinceJoined(user: User | null): number {
  if (!user?.date_joined) return 0;

  const joinDate = new Date(user.date_joined);
  const now = new Date();
  const diffMs = now.getTime() - joinDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Determines if a user is considered "new" to the platform.
 *
 * A user is considered new if they:
 * - Joined within the threshold period (default 7 days)
 * - Have no active bookings
 *
 * @param user - The authenticated user object
 * @param dashboardData - Aggregated dashboard data
 * @param thresholdDays - Number of days to consider a user as "new"
 * @returns True if user is new
 */
export function isNewUser(
  user: User | null,
  dashboardData: DashboardResult | undefined,
  thresholdDays: number = NEW_USER_THRESHOLD_DAYS
): boolean {
  const daysSinceJoined = getDaysSinceJoined(user);

  // Must be within threshold and have no active bookings
  return daysSinceJoined < thresholdDays && !hasActiveBookings(dashboardData);
}

/**
 * Determines which layout type to display based on user state.
 *
 * - Management layout: For users with active bookings (event management focus)
 * - Discovery layout: For new/browsing users (venue discovery focus)
 *
 * @param dashboardData - Aggregated dashboard data
 * @returns Layout type to render
 */
export function getLayoutType(dashboardData: DashboardResult | undefined): LayoutType {
  return hasActiveBookings(dashboardData) ? 'management' : 'discovery';
}

/**
 * Gets the complete user state for conditional rendering.
 *
 * This is the primary function to use in components for determining
 * what content to display based on user activity and registration date.
 *
 * @param user - The authenticated user object
 * @param dashboardData - Aggregated dashboard data from useDashboard hook
 * @returns Complete user state object
 *
 * @example
 * ```tsx
 * const userState = useMemo(
 *   () => getUserState(user, dashboardData),
 *   [user, dashboardData]
 * );
 *
 * if (userState.layoutType === 'management') {
 *   return <ManagementLayout />;
 * }
 * return <DiscoveryLayout />;
 * ```
 */
export function getUserState(
  user: User | null,
  dashboardData: DashboardResult | undefined
): UserState {
  const activeBookings = hasActiveBookings(dashboardData);
  const daysSinceJoined = getDaysSinceJoined(user);
  const newUser = daysSinceJoined < NEW_USER_THRESHOLD_DAYS && !activeBookings;
  const layoutType = activeBookings ? 'management' : 'discovery';

  return {
    hasActiveBookings: activeBookings,
    isNewUser: newUser,
    daysSinceJoined,
    layoutType,
  };
}

// =============================================================================
// GREETING HELPERS
// =============================================================================

/**
 * Gets the appropriate time-based greeting.
 *
 * @returns Greeting string based on current hour
 */
export function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Gets the user's first name for personalized greeting.
 *
 * @param user - The authenticated user object
 * @returns First name or fallback to 'there'
 */
export function getGreetingName(user: User | null): string {
  return user?.first_name || 'there';
}
