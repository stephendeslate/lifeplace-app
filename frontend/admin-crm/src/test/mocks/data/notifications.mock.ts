import type {
  Notification,
  NotificationType,
  NotificationCounts,
} from "../../../types/notifications.types";

export function createMockNotificationType(
  overrides: Partial<NotificationType> = {},
): NotificationType {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  return {
    id,
    code: `NOTIFICATION_${id}`,
    name: `Test Notification Type ${id}`,
    description: `Description for notification type ${id}`,
    category: "SYSTEM",
    icon: "info",
    color: "#1976d2",
    priority: "NORMAL",
    default_title_template: "Test Title",
    default_content_template: "Test Content",
    default_email_template: "",
    default_sms_template: "",
    is_active: true,
    is_system: false,
    supports_email: true,
    supports_sms: false,
    supports_push: false,
    auto_read_after_days: null,
    created_at: "2024-06-15T10:00:00Z",
    updated_at: "2024-06-15T10:00:00Z",
    ...overrides,
  } as NotificationType;
}

export function createMockNotification(
  overrides: Partial<Notification> = {},
): Notification {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  return {
    id,
    recipient: 1,
    recipient_name: "Admin User",
    notification_type: 1,
    title: `Notification ${id}`,
    content: `Content for notification ${id}`,
    action_url: "",
    context_data: {},
    event: null,
    client: null,
    is_read: false,
    read_at: null,
    delivered_via: ["in_app"],
    delivery_attempts: {},
    expires_at: null,
    is_expired: false,
    time_since_created: "5 minutes ago",
    delivery_status: {
      delivered_methods: ["in_app"],
      total_attempts: 1,
      successful_deliveries: 1,
    },
    can_mark_read: true,
    created_at: "2024-06-15T10:00:00Z",
    updated_at: "2024-06-15T10:00:00Z",
    ...overrides,
  } as Notification;
}

export function createMockNotifications(count: number): Notification[] {
  return Array.from({ length: count }, (_, i) =>
    createMockNotification({
      id: i + 1,
      title: `Notification ${i + 1}`,
      is_read: i % 2 === 0,
    }),
  );
}

export const mockNotifications = createMockNotifications(5);

export function createMockNotificationCounts(): NotificationCounts {
  return {
    total: 10,
    unread: 5,
    by_category: { SYSTEM: 3, EVENT: 4, PAYMENT: 3 },
    by_priority: { LOW: 2, NORMAL: 5, HIGH: 3 },
  };
}
