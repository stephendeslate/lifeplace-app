// frontend/client-portal/src/types/notifications.types.ts

/**
 * Notification type configuration from backend
 */
export interface NotificationType {
  id: number;
  code: string;
  name: string;
  description: string;
  category: NotificationCategory;
  icon: string;
  color: string;
  priority: NotificationPriority;
  supports_email: boolean;
  supports_sms: boolean;
}

/**
 * User notification preferences
 */
export interface NotificationPreference {
  id: number;
  user: number;

  // Global delivery method toggles
  email_enabled: boolean;
  sms_enabled: boolean;
  in_app_enabled: boolean;

  // Category preferences
  system_email: boolean;
  system_sms: boolean;
  system_in_app: boolean;

  event_email: boolean;
  event_sms: boolean;
  event_in_app: boolean;

  task_email: boolean;
  task_sms: boolean;
  task_in_app: boolean;

  payment_email: boolean;
  payment_sms: boolean;
  payment_in_app: boolean;

  client_email: boolean;
  client_sms: boolean;
  client_in_app: boolean;

  contract_email: boolean;
  contract_sms: boolean;
  contract_in_app: boolean;

  workflow_email: boolean;
  workflow_sms: boolean;
  workflow_in_app: boolean;

  communication_email: boolean;
  communication_sms: boolean;
  communication_in_app: boolean;

  // Marketing preferences (explicit consent required - GDPR/CAN-SPAM)
  marketing_email: boolean;
  marketing_sms: boolean;
  marketing_in_app: boolean;

  // Advanced preferences
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  digest_frequency: DigestFrequency;
  disabled_types: number[];
  disabled_types_details?: NotificationType[];

  created_at: string;
  updated_at: string;
}

/**
 * Individual notification
 */
export interface Notification {
  id: number;
  recipient: number;
  notification_type: number;
  notification_type_details?: NotificationType;
  title: string;
  content: string;
  action_url: string;
  context_data: Record<string, unknown>;
  event: number | null;
  event_name?: string;
  client: number | null;
  is_read: boolean;
  read_at: string | null;
  delivered_via: string[];
  expires_at: string | null;
  is_expired: boolean;
  time_since_created: string;
  can_mark_read: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Notification categories
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

/**
 * Notification priority levels
 */
export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

/**
 * Digest frequency options
 */
export type DigestFrequency = 'IMMEDIATE' | 'HOURLY' | 'DAILY' | 'WEEKLY';

/**
 * Category display options
 */
export const NOTIFICATION_CATEGORIES = [
  { value: 'SYSTEM', label: 'System', icon: 'Settings' },
  { value: 'EVENT', label: 'Events', icon: 'Event' },
  { value: 'TASK', label: 'Tasks', icon: 'Assignment' },
  { value: 'PAYMENT', label: 'Payments', icon: 'Payment' },
  { value: 'CLIENT', label: 'Account', icon: 'Person' },
  { value: 'CONTRACT', label: 'Contracts', icon: 'Description' },
  { value: 'WORKFLOW', label: 'Progress', icon: 'AccountTree' },
  { value: 'COMMUNICATION', label: 'Messages', icon: 'Message' },
  { value: 'MARKETING', label: 'Marketing & Promotions', icon: 'Campaign' },
] as const;

/**
 * Priority display options
 */
export const NOTIFICATION_PRIORITIES = [
  { value: 'LOW', label: 'Low', color: '#9e9e9e' },
  { value: 'NORMAL', label: 'Normal', color: '#2196f3' },
  { value: 'HIGH', label: 'High', color: '#ff9800' },
  { value: 'URGENT', label: 'Urgent', color: '#f44336' },
] as const;

/**
 * Digest frequency display options
 */
export const DIGEST_FREQUENCIES = [
  { value: 'IMMEDIATE', label: 'Immediate', description: 'Receive notifications instantly' },
  { value: 'HOURLY', label: 'Hourly', description: 'Receive a summary every hour' },
  { value: 'DAILY', label: 'Daily', description: 'Receive a daily summary' },
  { value: 'WEEKLY', label: 'Weekly', description: 'Receive a weekly summary' },
] as const;

/**
 * Filter options for notifications list
 */
export interface NotificationFilters {
  is_read?: boolean;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  limit?: number;
}

/**
 * Notification counts summary
 */
export interface NotificationCounts {
  total: number;
  unread: number;
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
}

/**
 * Data for updating notification preferences
 */
export interface UpdateNotificationPreferenceData {
  // Global delivery method toggles
  email_enabled?: boolean;
  sms_enabled?: boolean;
  in_app_enabled?: boolean;

  // Category preferences
  system_email?: boolean;
  system_sms?: boolean;
  system_in_app?: boolean;

  event_email?: boolean;
  event_sms?: boolean;
  event_in_app?: boolean;

  task_email?: boolean;
  task_sms?: boolean;
  task_in_app?: boolean;

  payment_email?: boolean;
  payment_sms?: boolean;
  payment_in_app?: boolean;

  client_email?: boolean;
  client_sms?: boolean;
  client_in_app?: boolean;

  contract_email?: boolean;
  contract_sms?: boolean;
  contract_in_app?: boolean;

  workflow_email?: boolean;
  workflow_sms?: boolean;
  workflow_in_app?: boolean;

  communication_email?: boolean;
  communication_sms?: boolean;
  communication_in_app?: boolean;

  // Marketing preferences (explicit consent required - GDPR/CAN-SPAM)
  marketing_email?: boolean;
  marketing_sms?: boolean;
  marketing_in_app?: boolean;

  // Advanced preferences
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  digest_frequency?: DigestFrequency;
  disabled_types?: number[];
}

/**
 * Category preference keys for dynamic access
 */
export type CategoryPreferenceKey =
  | 'system' | 'event' | 'task' | 'payment'
  | 'client' | 'contract' | 'workflow' | 'communication' | 'marketing';

/**
 * Delivery method types
 */
export type DeliveryMethod = 'email' | 'sms' | 'in_app';

/**
 * Helper to get category preference field name
 */
export const getCategoryPreferenceKey = (
  category: CategoryPreferenceKey,
  method: DeliveryMethod
): keyof NotificationPreference => {
  return `${category}_${method}` as keyof NotificationPreference;
};

/**
 * Map backend priority to display color
 */
export const getPriorityColor = (priority: NotificationPriority): string => {
  const priorityInfo = NOTIFICATION_PRIORITIES.find(p => p.value === priority);
  return priorityInfo?.color ?? '#9e9e9e';
};

/**
 * Map backend category to display info
 */
export const getCategoryInfo = (category: NotificationCategory) => {
  return NOTIFICATION_CATEGORIES.find(c => c.value === category) ?? {
    value: category,
    label: category,
    icon: 'Notifications',
  };
};
