// frontend/client-portal/src/apis/notifications.api.ts

import api from "../utils/api";
import type {
  Notification,
  NotificationType,
  NotificationCounts,
  NotificationFilters,
  NotificationPreference,
  UpdateNotificationPreferenceData,
} from "../types/notifications.types";

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const notificationsApi = {
  // Get list of notifications with optional filters
  getNotifications: async (
    filters?: NotificationFilters,
  ): Promise<Notification[]> => {
    const params = new URLSearchParams();
    if (filters?.is_read !== undefined)
      params.append("is_read", filters.is_read.toString());
    if (filters?.category) params.append("category", filters.category);
    if (filters?.priority) params.append("priority", filters.priority);
    if (filters?.limit) params.append("limit", filters.limit.toString());

    const response = await api.get<
      PaginatedResponse<Notification> | Notification[]
    >(`/notifications/notifications/?${params.toString()}`);
    const data = response.data;

    // Handle both paginated and non-paginated responses
    return (
      (data as PaginatedResponse<Notification>).results ||
      (data as Notification[])
    );
  },

  // Get single notification by ID
  getNotification: async (id: number): Promise<Notification> => {
    const response = await api.get<Notification>(
      `/notifications/notifications/${id}/`,
    );
    return response.data;
  },

  // Get unread notifications (with optional limit)
  getUnread: async (limit: number = 20): Promise<Notification[]> => {
    const params = new URLSearchParams();
    params.append("limit", limit.toString());

    const response = await api.get<Notification[]>(
      `/notifications/notifications/unread/?${params.toString()}`,
    );
    return response.data;
  },

  // Get recent notifications (with optional limit)
  getRecent: async (limit: number = 5): Promise<Notification[]> => {
    const params = new URLSearchParams();
    params.append("limit", limit.toString());

    const response = await api.get<Notification[]>(
      `/notifications/notifications/recent/?${params.toString()}`,
    );
    return response.data;
  },

  // Get notification counts (total, unread, by category, by priority)
  getCounts: async (): Promise<NotificationCounts> => {
    const response = await api.get<NotificationCounts>(
      "/notifications/notifications/counts/",
    );
    return response.data;
  },

  // Mark a notification as read
  markAsRead: async (id: number): Promise<Notification> => {
    const response = await api.post<Notification>(
      `/notifications/notifications/${id}/mark_read/`,
    );
    return response.data;
  },

  // Mark a notification as unread
  markAsUnread: async (id: number): Promise<Notification> => {
    const response = await api.post<Notification>(
      `/notifications/notifications/${id}/mark_unread/`,
    );
    return response.data;
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<{ marked_read: number }> => {
    const response = await api.post<{ marked_read: number }>(
      "/notifications/notifications/mark_all_read/",
    );
    return response.data;
  },

  // Delete a notification
  deleteNotification: async (id: number): Promise<void> => {
    await api.delete(`/notifications/notifications/${id}/`);
  },

  // Get current user's notification preferences
  getMyPreferences: async (): Promise<NotificationPreference> => {
    const response = await api.get<NotificationPreference>(
      "/notifications/preferences/my_preferences/",
    );
    return response.data;
  },

  // Update notification preferences
  updatePreferences: async (
    data: UpdateNotificationPreferenceData,
  ): Promise<NotificationPreference> => {
    const response = await api.put<NotificationPreference>(
      "/notifications/preferences/update_preferences/",
      data,
    );
    return response.data;
  },

  // Reset preferences to defaults
  resetPreferences: async (): Promise<NotificationPreference> => {
    const response = await api.post<NotificationPreference>(
      "/notifications/preferences/reset_to_defaults/",
    );
    return response.data;
  },

  // Get available digest frequencies
  getDigestFrequencies: async (): Promise<
    Array<{ value: string; label: string }>
  > => {
    const response = await api.get<Array<{ value: string; label: string }>>(
      "/notifications/preferences/digest_frequencies/",
    );
    return response.data;
  },

  // Get active notification types (for per-type preference management)
  getNotificationTypes: async (): Promise<NotificationType[]> => {
    const response = await api.get<
      PaginatedResponse<NotificationType> | NotificationType[]
    >("/notifications/types/?is_active=true");
    const data = response.data;
    return (
      (data as PaginatedResponse<NotificationType>).results ||
      (data as NotificationType[])
    );
  },
};
