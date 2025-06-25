// frontend/admin-crm/src/types/notifications.types.ts

export interface NotificationTemplate {
  id: number;
  name: string;
  description: string;
  notification_type: NotificationType;
  notification_type_display: string;
  channels: NotificationChannel[];
  email_subject: string;
  email_body: string;
  sms_body: string;
  push_title: string;
  push_body: string;
  in_app_title: string;
  in_app_body: string;
  is_active: boolean;
  is_system: boolean;
  priority: NotificationPriority;
  priority_display: string;
  variables_schema: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreference {
  id: number;
  user: number;
  user_email: string;
  user_name: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  quiet_hours_timezone: string;
  digest_frequency: DigestFrequency;
  digest_frequency_display: string;
  notification_settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface NotificationRule {
  id: number;
  name: string;
  description: string;
  event_type: string;
  conditions: Record<string, any>;
  template: number;
  template_name: string;
  template_type: string;
  target_users: number[];
  target_user_names: string[];
  target_roles: string[];
  delay_minutes: number;
  max_frequency_hours: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationQueue {
  id: string;
  template: number;
  template_name: string;
  rule: number | null;
  recipient: number;
  recipient_email: string;
  recipient_name: string;
  channel: NotificationChannel;
  channel_display: string;
  subject: string;
  content: string;
  context_data: Record<string, any>;
  priority: NotificationPriority;
  priority_display: string;
  scheduled_at: string;
  attempts: number;
  max_attempts: number;
  status: NotificationQueueStatus;
  status_display: string;
  error_message: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationHistory {
  id: string;
  template_name: string;
  notification_type: string;
  channel: NotificationChannel;
  channel_display: string;
  recipient: number;
  recipient_name: string;
  recipient_email: string;
  recipient_phone: string;
  subject: string;
  content: string;
  context_data: Record<string, any>;
  external_message_id: string;
  sent_at: string;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  delivery_status: DeliveryStatus;
  delivery_status_display: string;
  is_read: boolean;
  rule_id: string | null;
  queue_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface InAppNotification {
  id: string;
  recipient: number;
  recipient_name: string;
  title: string;
  message: string;
  notification_type: string;
  priority: NotificationPriority;
  priority_display: string;
  action_url: string;
  action_data: Record<string, any>;
  is_read: boolean;
  read_at: string | null;
  expires_at: string | null;
  time_ago: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationAnalytics {
  total_sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
  bounced: number;
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
  failure_rate: number;
}

export interface ChannelPerformance {
  channel: NotificationChannel;
  total: number;
  delivered: number;
  failed: number;
}

export interface UserEngagement {
  total_received: number;
  total_opened: number;
  total_clicked: number;
  total_in_app: number;
  read_in_app: number;
}

// Enums and Constants
export type NotificationType = 
  | 'CLIENT_NEW'
  | 'CLIENT_INVITATION_SENT'
  | 'CLIENT_INVITATION_ACCEPTED'
  | 'EVENT_STATUS_CHANGE'
  | 'EVENT_CREATED'
  | 'EVENT_DEADLINE_APPROACHING'
  | 'TASK_OVERDUE'
  | 'TASK_COMPLETED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED'
  | 'FEEDBACK_RECEIVED'
  | 'WORKFLOW_STAGE_CHANGED'
  | 'SYSTEM_ALERT'
  | 'DAILY_SUMMARY'
  | 'WEEKLY_REPORT'
  | 'CUSTOM';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type DigestFrequency = 'REAL_TIME' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'DISABLED';

export type NotificationQueueStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'CANCELLED';

export type DeliveryStatus = 'SENT' | 'DELIVERED' | 'OPENED' | 'CLICKED' | 'BOUNCED' | 'FAILED';

export const NOTIFICATION_TYPES = [
  { value: 'CLIENT_NEW', label: 'New Client Registration' },
  { value: 'CLIENT_INVITATION_SENT', label: 'Client Invitation Sent' },
  { value: 'CLIENT_INVITATION_ACCEPTED', label: 'Client Invitation Accepted' },
  { value: 'EVENT_STATUS_CHANGE', label: 'Event Status Change' },
  { value: 'EVENT_CREATED', label: 'New Event Created' },
  { value: 'EVENT_DEADLINE_APPROACHING', label: 'Event Deadline Approaching' },
  { value: 'TASK_OVERDUE', label: 'Task Overdue' },
  { value: 'TASK_COMPLETED', label: 'Task Completed' },
  { value: 'PAYMENT_RECEIVED', label: 'Payment Received' },
  { value: 'PAYMENT_FAILED', label: 'Payment Failed' },
  { value: 'FEEDBACK_RECEIVED', label: 'Feedback Received' },
  { value: 'WORKFLOW_STAGE_CHANGED', label: 'Workflow Stage Changed' },
  { value: 'SYSTEM_ALERT', label: 'System Alert' },
  { value: 'DAILY_SUMMARY', label: 'Daily Summary' },
  { value: 'WEEKLY_REPORT', label: 'Weekly Report' },
  { value: 'CUSTOM', label: 'Custom Notification' },
] as const;

export const NOTIFICATION_CHANNELS = [
  { value: 'EMAIL', label: 'Email' },
  { value: 'SMS', label: 'SMS' },
  { value: 'PUSH', label: 'Push Notification' },
  { value: 'IN_APP', label: 'In-App Notification' },
] as const;

export const NOTIFICATION_PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
] as const;

export const DIGEST_FREQUENCIES = [
  { value: 'REAL_TIME', label: 'Real Time' },
  { value: 'HOURLY', label: 'Hourly' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'DISABLED', label: 'Disabled' },
] as const;

// Create/Update Types
export interface CreateNotificationTemplateData {
  name: string;
  description?: string;
  notification_type: NotificationType;
  channels: NotificationChannel[];
  email_subject?: string;
  email_body?: string;
  sms_body?: string;
  push_title?: string;
  push_body?: string;
  in_app_title?: string;
  in_app_body?: string;
  is_active?: boolean;
  priority?: NotificationPriority;
  variables_schema?: Record<string, any>;
}

export interface UpdateNotificationTemplateData extends Partial<CreateNotificationTemplateData> {}

export interface UpdateNotificationPreferenceData {
  email_enabled?: boolean;
  sms_enabled?: boolean;
  push_enabled?: boolean;
  in_app_enabled?: boolean;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  quiet_hours_timezone?: string;
  digest_frequency?: DigestFrequency;
  notification_settings?: Record<string, any>;
}

export interface CreateNotificationRuleData {
  name: string;
  description?: string;
  event_type: string;
  conditions?: Record<string, any>;
  template: number;
  target_users?: number[];
  target_roles?: string[];
  delay_minutes?: number;
  max_frequency_hours?: number;
  is_active?: boolean;
}

export interface UpdateNotificationRuleData extends Partial<CreateNotificationRuleData> {}

export interface SendNotificationData {
  notification_type: NotificationType;
  recipients: number[];
  context_data?: Record<string, any>;
  priority?: NotificationPriority;
  delay_minutes?: number;
}

export interface TestNotificationData {
  template_id: number;
  channel: NotificationChannel;
  recipient_email: string;
  context_data?: Record<string, any>;
}

export interface BulkNotificationActionData {
  notification_ids: string[];
  action: 'mark_read' | 'mark_unread' | 'delete';
}

export interface NotificationPreferenceUpdateData {
  notification_type: NotificationType;
  channel: NotificationChannel;
  enabled: boolean;
}

// Filter Types
export interface NotificationTemplateFilters {
  search?: string;
  notification_type?: NotificationType;
  is_active?: boolean;
  channel?: NotificationChannel;
}

export interface NotificationRuleFilters {
  search?: string;
  event_type?: string;
  is_active?: boolean;
  template_id?: number;
}

export interface NotificationQueueFilters {
  search?: string;
  status?: NotificationQueueStatus;
  channel?: NotificationChannel;
  priority?: NotificationPriority;
  recipient_id?: number;
}

export interface NotificationHistoryFilters {
  search?: string;
  notification_type?: string;
  channel?: NotificationChannel;
  delivery_status?: DeliveryStatus;
  recipient_id?: number;
  start_date?: string;
  end_date?: string;
}

export interface InAppNotificationFilters {
  is_read?: boolean;
  notification_type?: string;
  priority?: NotificationPriority;
}

// Form Data Types
export interface NotificationTemplateFormData {
  name: string;
  description: string;
  notification_type: NotificationType;
  channels: NotificationChannel[];
  email_subject: string;
  email_body: string;
  sms_body: string;
  push_title: string;
  push_body: string;
  in_app_title: string;
  in_app_body: string;
  is_active: boolean;
  priority: NotificationPriority;
  variables_schema: Record<string, any>;
}

export interface NotificationPreferenceFormData {
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  quiet_hours_timezone: string;
  digest_frequency: DigestFrequency;
  notification_settings: Record<string, Record<string, boolean>>;
}

// Paginated Response Interface
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}