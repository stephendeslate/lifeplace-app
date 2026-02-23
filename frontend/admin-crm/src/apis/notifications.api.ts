// frontend/admin-crm/src/apis/notifications.api.ts

import api from '../utils/api';
import type {
  Notification,
  NotificationType,
  NotificationPreference,
  NotificationFilters,
  NotificationBulkActionData,
  CreateNotificationData,
  CreateNotificationTypeData,
  UpdateNotificationTypeData,
  UpdateNotificationPreferenceData,
  NotificationCounts,
  NotificationStats,
  DevicePushToken,
  TestPushData,
} from '../types/notifications.types';
import type { PaginatedResponse, PaginationParams } from '../types/common.types';

interface LegacyPaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface NotificationTypeQueryParams extends PaginationParams {
  search?: string;
  category?: string;
  is_active?: boolean;
  is_system?: boolean;
  ordering?: string;
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

    const response = await api.get<LegacyPaginatedResponse<Notification>>(
      `/notifications/notifications/?${params.toString()}`,
    );
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
    const response = await api.post<Notification>(
      `/notifications/notifications/${id}/mark_unread/`,
    );
    return response.data;
  },

  markAllAsRead: async (): Promise<{ marked_read: number }> => {
    const response = await api.post<{ marked_read: number }>(
      '/notifications/notifications/mark_all_read/',
    );
    return response.data;
  },

  bulkAction: async (
    data: NotificationBulkActionData,
  ): Promise<{ action: string; count: number; message: string }> => {
    const response = await api.post<{
      action: string;
      count: number;
      message: string;
    }>('/notifications/notifications/bulk_action/', data);
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

    const response = await api.get<Notification[]>(
      `/notifications/notifications/unread/?${params.toString()}`,
    );
    return response.data;
  },

  getRecent: async (limit?: number): Promise<Notification[]> => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());

    const response = await api.get<Notification[]>(
      `/notifications/notifications/recent/?${params.toString()}`,
    );
    return response.data;
  },

  createNotification: async (
    data: CreateNotificationData,
  ): Promise<{
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

    const response = await api.get<NotificationStats>(
      `/notifications/notifications/stats/?${params.toString()}`,
    );
    return response.data;
  },

  /**
   * Notification Types
   */
  getNotificationTypes: async (
    params?: NotificationTypeQueryParams,
  ): Promise<PaginatedResponse<NotificationType>> => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.category) searchParams.append('category', params.category);
    if (params?.is_active !== undefined)
      searchParams.append('is_active', params.is_active.toString());
    if (params?.is_system !== undefined)
      searchParams.append('is_system', params.is_system.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.page_size) searchParams.append('page_size', params.page_size.toString());
    if (params?.ordering) searchParams.append('ordering', params.ordering);

    const response = await api.get<PaginatedResponse<NotificationType>>(
      `/notifications/types/?${searchParams.toString()}`,
    );
    return response.data;
  },

  getNotificationType: async (id: number): Promise<NotificationType> => {
    const response = await api.get<NotificationType>(`/notifications/types/${id}/`);
    return response.data;
  },

  getNotificationCategories: async (): Promise<Array<{ value: string; label: string }>> => {
    const response = await api.get<Array<{ value: string; label: string }>>(
      '/notifications/types/categories/',
    );
    return response.data;
  },

  getNotificationPriorities: async (): Promise<Array<{ value: string; label: string }>> => {
    const response = await api.get<Array<{ value: string; label: string }>>(
      '/notifications/types/priorities/',
    );
    return response.data;
  },

  createNotificationType: async (data: CreateNotificationTypeData): Promise<NotificationType> => {
    const response = await api.post<NotificationType>('/notifications/types/', data);
    return response.data;
  },

  updateNotificationType: async (
    id: number,
    data: UpdateNotificationTypeData,
  ): Promise<NotificationType> => {
    const response = await api.patch<NotificationType>(`/notifications/types/${id}/`, data);
    return response.data;
  },

  deleteNotificationType: async (id: number): Promise<void> => {
    await api.delete(`/notifications/types/${id}/`);
  },

  /**
   * Notification Preferences
   */
  getMyPreferences: async (): Promise<NotificationPreference> => {
    const response = await api.get<NotificationPreference>(
      '/notifications/preferences/my_preferences/',
    );
    return response.data;
  },

  updatePreferences: async (
    data: UpdateNotificationPreferenceData,
  ): Promise<NotificationPreference> => {
    const response = await api.put<NotificationPreference>(
      '/notifications/preferences/update_preferences/',
      data,
    );
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
    const response = await api.get<Array<{ value: string; label: string }>>(
      '/notifications/preferences/digest_frequencies/',
    );
    return response.data;
  },

  getAllPreferences: async (userId?: number): Promise<NotificationPreference[]> => {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId.toString());

    const response = await api.get<LegacyPaginatedResponse<NotificationPreference>>(
      `/notifications/preferences/?${params.toString()}`,
    );
    return response.data.results;
  },

  updatePreferenceById: async (
    id: number,
    data: UpdateNotificationPreferenceData,
  ): Promise<NotificationPreference> => {
    const response = await api.patch<NotificationPreference>(
      `/notifications/preferences/${id}/`,
      data,
    );
    return response.data;
  },

  /**
   * Push Device Tokens
   */
  getMyDevices: async (): Promise<{
    devices: DevicePushToken[];
    count: number;
  }> => {
    const response = await api.get<{
      devices: DevicePushToken[];
      count: number;
    }>('/notifications/push-tokens/my_devices/');
    return response.data;
  },

  deleteDevice: async (id: number): Promise<void> => {
    await api.delete(`/notifications/push-tokens/${id}/`);
  },

  sendTestPush: async (
    data: TestPushData,
  ): Promise<{
    message: string;
    success?: boolean;
    total_devices?: number;
    successful?: number;
    failed?: number;
  }> => {
    const response = await api.post<{
      message: string;
      success?: boolean;
      total_devices?: number;
      successful?: number;
      failed?: number;
    }>('/notifications/push-tokens/test_push/', data);
    return response.data;
  },
};
