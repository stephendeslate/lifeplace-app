// frontend/admin-crm/src/utils/notifications.ts

import type { NotificationCategory, NotificationPriority } from '../types/notifications.types';

/**
 * Utility functions for notification handling
 */

export const formatNotificationTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return 'Just now';
  } else if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else if (days < 7) {
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
};

export const getCategoryIcon = (category: NotificationCategory): string => {
  const iconMap: Record<NotificationCategory, string> = {
    SYSTEM: 'Settings',
    EVENT: 'Event',
    TASK: 'Assignment',
    PAYMENT: 'Payment',
    CLIENT: 'Person',
    CONTRACT: 'Description',
    WORKFLOW: 'AccountTree',
    COMMUNICATION: 'Message',
  };
  return iconMap[category] || 'Notifications';
};

export const getCategoryColor = (category: NotificationCategory): string => {
  const colorMap: Record<NotificationCategory, string> = {
    SYSTEM: '#757575',
    EVENT: '#1976d2',
    TASK: '#388e3c',
    PAYMENT: '#f57c00',
    CLIENT: '#7b1fa2',
    CONTRACT: '#d32f2f',
    WORKFLOW: '#0288d1',
    COMMUNICATION: '#5d4037',
  };
  return colorMap[category] || '#757575';
};

export const getPriorityColor = (priority: NotificationPriority): string => {
  const colorMap: Record<NotificationPriority, string> = {
    LOW: '#757575',
    NORMAL: '#1976d2',
    HIGH: '#f57c00',
    URGENT: '#d32f2f',
  };
  return colorMap[priority] || '#1976d2';
};

export const getPriorityWeight = (priority: NotificationPriority): number => {
  const weightMap: Record<NotificationPriority, number> = {
    LOW: 1,
    NORMAL: 2,
    HIGH: 3,
    URGENT: 4,
  };
  return weightMap[priority] || 2;
};

export const sortNotificationsByPriority = <T extends { notification_type_details?: { priority: NotificationPriority } }>(
  notifications: T[]
): T[] => {
  return [...notifications].sort((a, b) => {
    const aPriority = a.notification_type_details?.priority || 'NORMAL';
    const bPriority = b.notification_type_details?.priority || 'NORMAL';
    return getPriorityWeight(bPriority) - getPriorityWeight(aPriority);
  });
};

export const groupNotificationsByCategory = <T extends { notification_type_details?: { category: NotificationCategory } }>(
  notifications: T[]
): Record<NotificationCategory, T[]> => {
  const groups: Partial<Record<NotificationCategory, T[]>> = {};
  
  notifications.forEach(notification => {
    const category = notification.notification_type_details?.category || 'SYSTEM';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category]!.push(notification);
  });
  
  return groups as Record<NotificationCategory, T[]>;
};

export const getNotificationSummary = (
  notifications: Array<{ 
    is_read: boolean;
    notification_type_details?: { 
      category: NotificationCategory;
      priority: NotificationPriority;
    };
  }>
) => {
  const total = notifications.length;
  const unread = notifications.filter(n => !n.is_read).length;
  
  const byCategory = groupNotificationsByCategory(notifications);
  const categoryCounts = Object.entries(byCategory).reduce((acc, [category, items]) => {
    acc[category as NotificationCategory] = items.length;
    return acc;
  }, {} as Record<NotificationCategory, number>);
  
  const byPriority = notifications.reduce((acc, notification) => {
    const priority = notification.notification_type_details?.priority || 'NORMAL';
    acc[priority] = (acc[priority] || 0) + 1;
    return acc;
  }, {} as Record<NotificationPriority, number>);
  
  return {
    total,
    unread,
    byCategory: categoryCounts,
    byPriority,
  };
};

/**
 * Create a test notification payload
 */
export const createTestNotification = (
  recipientIds: number[],
  type: 'system' | 'event' | 'task' | 'payment' = 'system'
) => {
  const typeMap = {
    system: 'SYSTEM_NOTIFICATION',
    event: 'EVENT_CREATED',
    task: 'TASK_ASSIGNED',
    payment: 'PAYMENT_RECEIVED',
  };

  return {
    recipient_ids: recipientIds,
    notification_type_code: typeMap[type],
    context_data: {
      test: true,
      created_at: new Date().toISOString(),
    },
  };
};

/**
 * Format notification content for display
 */
export const truncateContent = (content: string, maxLength: number = 120): string => {
  if (content.length <= maxLength) {
    return content;
  }
  return content.substring(0, maxLength).trim() + '...';
};

/**
 * Check if notification should be highlighted
 */
export const shouldHighlightNotification = (notification: {
  is_read: boolean;
  created_at: string;
  notification_type_details?: { priority: NotificationPriority };
}): boolean => {
  if (notification.is_read) {
    return false;
  }

  const priority = notification.notification_type_details?.priority || 'NORMAL';
  if (priority === 'URGENT' || priority === 'HIGH') {
    return true;
  }

  // Highlight unread notifications from the last hour
  const createdAt = new Date(notification.created_at);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  return createdAt > oneHourAgo;
};

/**
 * Get notification action text based on action URL
 */
export const getActionText = (actionUrl: string): string => {
  if (!actionUrl) {
    return '';
  }

  if (actionUrl.includes('/events/')) {
    return 'View Event';
  } else if (actionUrl.includes('/clients/')) {
    return 'View Client';
  } else if (actionUrl.includes('/contracts/')) {
    return 'View Contract';
  } else if (actionUrl.includes('/payments/')) {
    return 'View Payment';
  } else if (actionUrl.includes('/tasks/')) {
    return 'View Task';
  } else {
    return 'View Details';
  }
};