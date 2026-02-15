// frontend/admin-crm/src/types/notifications.types.ts

export interface NotificationType {
  id: number;
  code: string;
  name: string;
  description: string;
  category: NotificationCategory;
  icon: string;
  color: string;
  priority: NotificationPriority;
  default_title_template: string;
  default_content_template: string;
  default_email_template: string;
  default_sms_template: string;
  is_active: boolean;
  is_system: boolean;
  supports_email: boolean;
  supports_sms: boolean;
  supports_push: boolean;
  auto_read_after_days: number | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreference {
  id: number;
  user: number;

  // Global delivery method toggles
  email_enabled: boolean;
  sms_enabled: boolean;
  in_app_enabled: boolean;
  push_enabled: boolean;

  // Category preferences - System
  system_email: boolean;
  system_sms: boolean;
  system_in_app: boolean;
  system_push: boolean;

  // Category preferences - Event
  event_email: boolean;
  event_sms: boolean;
  event_in_app: boolean;
  event_push: boolean;

  // Category preferences - Task
  task_email: boolean;
  task_sms: boolean;
  task_in_app: boolean;
  task_push: boolean;

  // Category preferences - Payment
  payment_email: boolean;
  payment_sms: boolean;
  payment_in_app: boolean;
  payment_push: boolean;

  // Category preferences - Client
  client_email: boolean;
  client_sms: boolean;
  client_in_app: boolean;
  client_push: boolean;

  // Category preferences - Contract
  contract_email: boolean;
  contract_sms: boolean;
  contract_in_app: boolean;
  contract_push: boolean;

  // Category preferences - Workflow
  workflow_email: boolean;
  workflow_sms: boolean;
  workflow_in_app: boolean;
  workflow_push: boolean;

  // Category preferences - Communication
  communication_email: boolean;
  communication_sms: boolean;
  communication_in_app: boolean;
  communication_push: boolean;

  // Marketing preferences (opt-in only for GDPR/DPA compliance)
  marketing_email: boolean;
  marketing_sms: boolean;
  marketing_in_app: boolean;
  marketing_push: boolean;

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

export interface Notification {
  id: number;
  recipient: number;
  recipient_name?: string;
  notification_type: number;
  notification_type_details?: NotificationType;
  title: string;
  content: string;
  action_url: string;
  context_data: Record<string, unknown>;
  event: number | null;
  event_name?: string;
  client: number | null;
  client_name?: string;
  is_read: boolean;
  read_at: string | null;
  delivered_via: string[];
  delivery_attempts: Record<string, unknown>;
  expires_at: string | null;
  is_expired: boolean;
  time_since_created: string;
  delivery_status: {
    delivered_methods: string[];
    total_attempts: number;
    successful_deliveries: number;
  };
  can_mark_read: boolean;
  created_at: string;
  updated_at: string;
}

export type NotificationCategory =
  | "SYSTEM"
  | "EVENT"
  | "TASK"
  | "PAYMENT"
  | "CLIENT"
  | "CONTRACT"
  | "WORKFLOW"
  | "COMMUNICATION"
  | "MARKETING";

export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type DigestFrequency = "IMMEDIATE" | "HOURLY" | "DAILY" | "WEEKLY";

export const NOTIFICATION_CATEGORIES = [
  { value: "SYSTEM", label: "System" },
  { value: "EVENT", label: "Event Management" },
  { value: "TASK", label: "Task Management" },
  { value: "PAYMENT", label: "Payment Processing" },
  { value: "CLIENT", label: "Client Management" },
  { value: "CONTRACT", label: "Contract Management" },
  { value: "WORKFLOW", label: "Workflow Updates" },
  { value: "COMMUNICATION", label: "Communication Updates" },
  { value: "MARKETING", label: "Marketing & Promotions" },
] as const;

export const NOTIFICATION_PRIORITIES = [
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
] as const;

export const DIGEST_FREQUENCIES = [
  { value: "IMMEDIATE", label: "Immediate" },
  { value: "HOURLY", label: "Hourly Digest" },
  { value: "DAILY", label: "Daily Digest" },
  { value: "WEEKLY", label: "Weekly Digest" },
] as const;

// Filter types
export interface NotificationFilters {
  is_read?: boolean;
  type?: string;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  user_id?: number;
  limit?: number;
}

// Action types
export interface NotificationBulkActionData {
  notification_ids: number[];
  action: "mark_read" | "mark_unread" | "delete";
}

export interface CreateNotificationData {
  recipient_ids: number[];
  notification_type_code: string;
  context_data?: Record<string, unknown>;
  force_delivery_methods?: ("email" | "sms" | "in_app")[];
}

export interface UpdateNotificationPreferenceData {
  // Global delivery method toggles
  email_enabled?: boolean;
  sms_enabled?: boolean;
  in_app_enabled?: boolean;
  push_enabled?: boolean;

  // Category preferences - System
  system_email?: boolean;
  system_sms?: boolean;
  system_in_app?: boolean;
  system_push?: boolean;

  // Category preferences - Event
  event_email?: boolean;
  event_sms?: boolean;
  event_in_app?: boolean;
  event_push?: boolean;

  // Category preferences - Task
  task_email?: boolean;
  task_sms?: boolean;
  task_in_app?: boolean;
  task_push?: boolean;

  // Category preferences - Payment
  payment_email?: boolean;
  payment_sms?: boolean;
  payment_in_app?: boolean;
  payment_push?: boolean;

  // Category preferences - Client
  client_email?: boolean;
  client_sms?: boolean;
  client_in_app?: boolean;
  client_push?: boolean;

  // Category preferences - Contract
  contract_email?: boolean;
  contract_sms?: boolean;
  contract_in_app?: boolean;
  contract_push?: boolean;

  // Category preferences - Workflow
  workflow_email?: boolean;
  workflow_sms?: boolean;
  workflow_in_app?: boolean;
  workflow_push?: boolean;

  // Category preferences - Communication
  communication_email?: boolean;
  communication_sms?: boolean;
  communication_in_app?: boolean;
  communication_push?: boolean;

  // Marketing preferences (opt-in only for GDPR/DPA compliance)
  marketing_email?: boolean;
  marketing_sms?: boolean;
  marketing_in_app?: boolean;
  marketing_push?: boolean;

  // Advanced preferences
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  digest_frequency?: DigestFrequency;
  disabled_types?: number[];
}

// Stats and analytics types
export interface NotificationCounts {
  total: number;
  unread: number;
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
}

export interface NotificationStats {
  period: string;
  total_sent: number;
  total_read: number;
  read_rate: number;
  delivery_rates: Record<string, number>;
  popular_types: Array<{
    notification_type__name: string;
    notification_type__code: string;
    count: number;
  }>;
}

// Push device types
export interface DevicePushToken {
  id: number;
  token: string;
  device_id: string;
  device_type: "ios" | "android" | "web";
  device_name: string;
  is_active: boolean;
  last_used_at: string | null;
  failure_count: number;
  app_version: string;
  created_at: string;
  updated_at: string;
}

export interface TestPushData {
  title?: string;
  body?: string;
  device_id?: string;
}

// Notification Type CRUD types
export interface CreateNotificationTypeData {
  code: string;
  name: string;
  description?: string;
  category: NotificationCategory;
  icon?: string;
  color?: string;
  priority: NotificationPriority;
  default_title_template: string;
  default_content_template: string;
  default_email_template?: string;
  default_sms_template?: string;
  is_active?: boolean;
  supports_email?: boolean;
  supports_sms?: boolean;
  supports_push?: boolean;
  auto_read_after_days?: number | null;
}

export type UpdateNotificationTypeData = Partial<CreateNotificationTypeData>;

// Form data types
export interface NotificationPreferenceFormData {
  // Global delivery method toggles
  email_enabled: boolean;
  sms_enabled: boolean;
  in_app_enabled: boolean;
  push_enabled: boolean;

  // Category preferences - System
  system_email: boolean;
  system_sms: boolean;
  system_in_app: boolean;
  system_push: boolean;

  // Category preferences - Event
  event_email: boolean;
  event_sms: boolean;
  event_in_app: boolean;
  event_push: boolean;

  // Category preferences - Task
  task_email: boolean;
  task_sms: boolean;
  task_in_app: boolean;
  task_push: boolean;

  // Category preferences - Payment
  payment_email: boolean;
  payment_sms: boolean;
  payment_in_app: boolean;
  payment_push: boolean;

  // Category preferences - Client
  client_email: boolean;
  client_sms: boolean;
  client_in_app: boolean;
  client_push: boolean;

  // Category preferences - Contract
  contract_email: boolean;
  contract_sms: boolean;
  contract_in_app: boolean;
  contract_push: boolean;

  // Category preferences - Workflow
  workflow_email: boolean;
  workflow_sms: boolean;
  workflow_in_app: boolean;
  workflow_push: boolean;

  // Category preferences - Communication
  communication_email: boolean;
  communication_sms: boolean;
  communication_in_app: boolean;
  communication_push: boolean;

  // Marketing preferences (opt-in only for GDPR/DPA compliance)
  marketing_email: boolean;
  marketing_sms: boolean;
  marketing_in_app: boolean;
  marketing_push: boolean;

  // Advanced preferences
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  digest_frequency: DigestFrequency;
  disabled_types: number[];
}

// Component prop types
export interface NotificationListProps {
  notifications: Notification[];
  isLoading: boolean;
  onMarkRead: (id: number) => void;
  onMarkUnread: (id: number) => void;
  onDelete: (id: number) => void;
  onBulkAction: (data: NotificationBulkActionData) => void;
  isPerformingAction?: boolean;
}

export interface NotificationCardProps {
  notification: Notification;
  onMarkRead: (id: number) => void;
  onMarkUnread: (id: number) => void;
  onDelete: (id: number) => void;
  compact?: boolean;
}

export interface NotificationPreferenceFormProps {
  preferences: NotificationPreference;
  onSubmit: (data: UpdateNotificationPreferenceData) => void;
  isLoading: boolean;
  notificationTypes?: NotificationType[];
  categories?: Array<{ value: string; label: string }>;
  digestFrequencies?: Array<{ value: string; label: string }>;
}

export interface NotificationCountsDisplayProps {
  counts: NotificationCounts;
  isLoading: boolean;
}

export interface NotificationStatsDisplayProps {
  stats: NotificationStats;
  isLoading: boolean;
}
