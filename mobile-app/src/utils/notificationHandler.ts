/**
 * Notification Handler Utility
 *
 * Handles notification tap navigation and channel management.
 */

import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import type { PushNotificationData, NotificationTypeCode } from '@/types/notifications.types';

// =============================================================================
// NAVIGATION HANDLER
// =============================================================================

/**
 * Handle notification tap and navigate to appropriate screen
 */
export function handleNotificationNavigation(data: PushNotificationData): void {
  const { notification_type, action_url, event_id, quote_id, contract_id, invoice_id } = data;

  // If action_url provided, try to use it directly
  if (action_url) {
    try {
      // Parse the URL and extract the path
      const url = new URL(action_url);
      const path = url.pathname;

      // Navigate to the path
      router.push(path as Parameters<typeof router.push>[0]);
      return;
    } catch {
      // If URL parsing fails, fall through to type-based navigation
    }
  }

  // Navigate based on notification type
  switch (notification_type) {
    case 'quote_created':
    case 'quote_updated':
    case 'quote_expiring':
      if (quote_id) {
        router.push(`/quotes/${quote_id}` as Parameters<typeof router.push>[0]);
      } else {
        router.push('/actions' as Parameters<typeof router.push>[0]);
      }
      break;

    case 'payment_due':
    case 'payment_reminder':
    case 'payment_received':
      if (invoice_id) {
        router.push(`/payments/${invoice_id}` as Parameters<typeof router.push>[0]);
      } else {
        router.push('/payments' as Parameters<typeof router.push>[0]);
      }
      break;

    case 'contract_ready':
    case 'contract_signed':
      if (contract_id) {
        router.push(`/contracts/${contract_id}` as Parameters<typeof router.push>[0]);
      } else {
        router.push('/actions' as Parameters<typeof router.push>[0]);
      }
      break;

    case 'event_update':
    case 'event_reminder':
      if (event_id) {
        router.push(`/events/${event_id}` as Parameters<typeof router.push>[0]);
      } else {
        router.push('/(tabs)/events' as Parameters<typeof router.push>[0]);
      }
      break;

    case 'task_assigned':
    case 'task_reminder':
      if (event_id) {
        router.push(`/events/${event_id}?tab=tasks` as Parameters<typeof router.push>[0]);
      } else {
        router.push('/actions' as Parameters<typeof router.push>[0]);
      }
      break;

    case 'message_received':
      // Navigate to messages (future Phase 12)
      router.push('/actions' as Parameters<typeof router.push>[0]);
      break;

    default:
      // Default to action center
      router.push('/actions' as Parameters<typeof router.push>[0]);
  }
}

// =============================================================================
// CHANNEL MANAGEMENT
// =============================================================================

/**
 * Get notification channel ID for Android based on notification type
 */
export function getChannelForNotificationType(
  type: NotificationTypeCode | undefined
): string {
  switch (type) {
    case 'payment_due':
    case 'payment_reminder':
    case 'payment_received':
      return 'payments';

    case 'event_update':
    case 'event_reminder':
      return 'events';

    case 'message_received':
      return 'messages';

    case 'contract_ready':
    case 'contract_signed':
      return 'contracts';

    default:
      return 'default';
  }
}

// =============================================================================
// NOTIFICATION DISMISSAL
// =============================================================================

/**
 * Clear all delivered notifications from the notification center
 */
export async function clearAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}

// =============================================================================
// BADGE MANAGEMENT
// =============================================================================

/**
 * Get the current badge count
 */
export async function getBadgeCount(): Promise<number> {
  return Notifications.getBadgeCountAsync();
}

/**
 * Update badge count based on unread count
 */
export async function updateBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear badge (set to 0)
 */
export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

// =============================================================================
// NOTIFICATION PARSING
// =============================================================================

/**
 * Parse notification data from the notification response
 */
export function parseNotificationData(
  response: Notifications.NotificationResponse
): PushNotificationData {
  const data = response.notification.request.content.data;

  return {
    notification_id: data?.notification_id as string | undefined,
    notification_type: data?.notification_type as NotificationTypeCode | undefined,
    category: data?.category as PushNotificationData['category'],
    action_url: data?.action_url as string | undefined,
    event_id: data?.event_id as string | undefined,
    client_id: data?.client_id as string | undefined,
    quote_id: data?.quote_id as string | undefined,
    contract_id: data?.contract_id as string | undefined,
    invoice_id: data?.invoice_id as string | undefined,
    test: data?.test as boolean | undefined,
  };
}

/**
 * Check if a notification is a test notification
 */
export function isTestNotification(data: PushNotificationData): boolean {
  return data.test === true;
}
