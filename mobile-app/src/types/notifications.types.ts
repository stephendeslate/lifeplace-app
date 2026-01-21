/**
 * Notification Types
 *
 * Type definitions for push notifications, matching the backend API.
 */

// =============================================================================
// NOTIFICATION TYPE CODES
// =============================================================================

/**
 * Notification type codes matching backend NotificationType.code values
 */
export type NotificationTypeCode =
  | 'quote_created'
  | 'quote_updated'
  | 'quote_expiring'
  | 'payment_due'
  | 'payment_reminder'
  | 'payment_received'
  | 'contract_ready'
  | 'contract_signed'
  | 'event_update'
  | 'event_reminder'
  | 'task_assigned'
  | 'task_reminder'
  | 'message_received'
  | 'general';

/**
 * Notification categories matching backend
 */
export type NotificationCategory =
  | 'SYSTEM'
  | 'EVENT'
  | 'TASK'
  | 'PAYMENT'
  | 'CLIENT'
  | 'CONTRACT'
  | 'WORKFLOW'
  | 'COMMUNICATION'
  | 'MARKETING';

// =============================================================================
// PUSH NOTIFICATION DATA
// =============================================================================

/**
 * Data payload received in push notifications
 */
export interface PushNotificationData {
  notification_id?: string;
  notification_type?: NotificationTypeCode;
  category?: NotificationCategory;
  action_url?: string;
  event_id?: string;
  client_id?: string;
  quote_id?: string;
  contract_id?: string;
  invoice_id?: string;
  test?: boolean;
}

// =============================================================================
// DEVICE PUSH TOKEN
// =============================================================================

/**
 * Device push token stored on backend
 */
export interface DevicePushToken {
  id: string;
  token: string;
  device_id: string;
  device_type: 'ios' | 'android' | 'web';
  device_name: string;
  is_active: boolean;
  last_used_at: string | null;
  failure_count: number;
  app_version: string;
  created_at: string;
  updated_at: string;
}

/**
 * Request to register a push token
 */
export interface RegisterPushTokenRequest {
  token: string;
  device_type: 'ios' | 'android' | 'web';
  device_id?: string;
  device_name?: string;
  app_version?: string;
}

/**
 * Request to unregister a push token
 */
export interface UnregisterPushTokenRequest {
  token?: string;
  device_id?: string;
}

// =============================================================================
// NOTIFICATION PREFERENCES
// =============================================================================

/**
 * User notification preferences matching backend model
 */
export interface NotificationPreference {
  id: string;
  user: string;

  // Global toggles
  email_enabled: boolean;
  sms_enabled: boolean;
  in_app_enabled: boolean;
  push_enabled: boolean;

  // Category-specific push preferences
  system_push: boolean;
  event_push: boolean;
  task_push: boolean;
  payment_push: boolean;
  client_push: boolean;
  contract_push: boolean;
  workflow_push: boolean;
  communication_push: boolean;
  marketing_push: boolean;

  // Advanced settings
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  digest_frequency: 'IMMEDIATE' | 'HOURLY' | 'DAILY' | 'WEEKLY';
}

// =============================================================================
// NOTIFICATION ITEM
// =============================================================================

/**
 * Notification item from backend
 */
export interface Notification {
  id: string;
  notification_type_details: {
    code: NotificationTypeCode;
    name: string;
    category: NotificationCategory;
    icon: string;
    color: string;
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  };
  title: string;
  content: string;
  action_url: string;
  is_read: boolean;
  read_at: string | null;
  time_since_created: string;
  can_mark_read: boolean;
  created_at: string;
  event?: string;
  event_name?: string;
}

// =============================================================================
// NOTIFICATION COUNTS
// =============================================================================

/**
 * Notification count summary
 */
export interface NotificationCounts {
  total: number;
  unread: number;
  by_category: Record<NotificationCategory, number>;
  by_priority: Record<string, number>;
}

// =============================================================================
// API RESPONSES
// =============================================================================

/**
 * Paginated notifications response
 */
export interface NotificationListResponse {
  results: Notification[];
  count: number;
  next: string | null;
  previous: string | null;
}

/**
 * Devices list response
 */
export interface DevicesListResponse {
  devices: DevicePushToken[];
  count: number;
}
