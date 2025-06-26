// frontend/admin-crm/src/apis/notifications.api.ts

import api from '../utils/api';
import type {
  Notification,
  NotificationType,
  NotificationPreference,
  NotificationFilters,
  NotificationBulkActionData,
  CreateNotificationData,
  UpdateNotificationPreferenceData,
  NotificationCounts,
  NotificationStats,
} from '../types/notifications.types';

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const notificationsApi = {
  /**
   * Notifications
   */
  getNotifications: async (filters?: NotificationFilters): Promise<Notification[]> => {
    const params = new URLSearchParams();
    if (filters?.is_read !== undefined) params.append('is_read', filters.is_read.toString());
    if (filters?.type) params.append('type', filters.type);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.user_id) params.append('user_id', filters.user_id.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await api.get<PaginatedResponse<Notification>>(`/notifications/notifications/?${params.toString()}`);
    return response.data.results;
  },

  getNotification: async (id: number): Promise<Notification> => {
    const response = await api.get<Notification>(`/notifications/notifications/${id}/`);
    return response.data;
  },

  markAsRead: async (id: number): Promise<Notification> => {
    const response = await api.post<Notification>(`/notifications/notifications/${id}/mark_read/`);
    return response.data;
  },

  markAsUnread: async (id: number): Promise<Notification> => {
    const response = await api.post<Notification>(`/notifications/notifications/${id}/mark_unread/`);
    return response.data;
  },

  markAllAsRead: async (): Promise<{ marked_read: number }> => {
    const response = await api.post<{ marked_read: number }>('/notifications/notifications/mark_all_read/');
    return response.data;
  },

  bulkAction: async (data: NotificationBulkActionData): Promise<{ action: string; count: number; message: string }> => {
    const response = await api.post<{ action: string; count: number; message: string }>('/notifications/notifications/bulk_action/', data);
    return response.data;
  },

  deleteNotification: async (id: number): Promise<void> => {
    await api.delete(`/notifications/notifications/${id}/`);
  },

  getCounts: async (): Promise<NotificationCounts> => {
    const response = await api.get<NotificationCounts>('/notifications/notifications/counts/');
    return response.data;
  },

  getUnread: async (limit?: number): Promise<Notification[]> => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    
    const response = await api.get<Notification[]>(`/notifications/notifications/unread/?${params.toString()}`);
    return response.data;
  },

  getRecent: async (limit?: number): Promise<Notification[]> => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    
    const response = await api.get<Notification[]>(`/notifications/notifications/recent/?${params.toString()}`);
    return response.data;
  },

  createNotification: async (data: CreateNotificationData): Promise<{
    created_count: number;
    total_recipients: number;
    notifications: Notification[];
  }> => {
    const response = await api.post<{
      created_count: number;
      total_recipients: number;
      notifications: Notification[];
    }>('/notifications/notifications/create_notification/', data);
    return response.data;
  },

  getStats: async (days?: number): Promise<NotificationStats> => {
    const params = new URLSearchParams();
    if (days) params.append('days', days.toString());
    
    const response = await api.get<NotificationStats>(`/notifications/notifications/stats/?${params.toString()}`);
    return response.data;
  },

  /**
   * Notification Types
   */
  getNotificationTypes: async (filters?: {
    category?: string;
    is_active?: boolean;
    is_system?: boolean;
  }): Promise<NotificationType[]> => {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters?.is_system !== undefined) params.append('is_system', filters.is_system.toString());

    const response = await api.get<PaginatedResponse<NotificationType>>(`/notifications/types/?${params.toString()}`);
    return response.data.results;
  },

  getNotificationType: async (id: number): Promise<NotificationType> => {
    const response = await api.get<NotificationType>(`/notifications/types/${id}/`);
    return response.data;
  },

  getNotificationCategories: async (): Promise<Array<{ value: string; label: string }>> => {
    const response = await api.get<Array<{ value: string; label: string }>>('/notifications/types/categories/');
    return response.data;
  },

  getNotificationPriorities: async (): Promise<Array<{ value: string; label: string }>> => {
    const response = await api.get<Array<{ value: string; label: string }>>('/notifications/types/priorities/');
    return response.data;
  },

  /**
   * Notification Preferences
   */
  getMyPreferences: async (): Promise<NotificationPreference> => {
    const response = await api.get<NotificationPreference>('/notifications/preferences/my_preferences/');
    return response.data;
  },

  updatePreferences: async (data: UpdateNotificationPreferenceData): Promise<NotificationPreference> => {
    const response = await api.put<NotificationPreference>('/notifications/preferences/update_preferences/', data);
    return response.data;
  },

  resetPreferencesToDefaults: async (): Promise<{
    message: string;
    preferences: NotificationPreference;
  }> => {
    const response = await api.post<{
      message: string;
      preferences: NotificationPreference;
    }>('/notifications/preferences/reset_to_defaults/');
    return response.data;
  },

  getDigestFrequencies: async (): Promise<Array<{ value: string; label: string }>> => {
    const response = await api.get<Array<{ value: string; label: string }>>('/notifications/preferences/digest_frequencies/');
    return response.data;
  },

  getAllPreferences: async (userId?: number): Promise<NotificationPreference[]> => {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId.toString());

    const response = await api.get<PaginatedResponse<NotificationPreference>>(`/notifications/preferences/?${params.toString()}`);
    return response.data.results;
  },
};