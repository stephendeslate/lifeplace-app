// frontend/admin-crm/src/apis/notifications.api.ts

import api from '../utils/api';
import type {
  NotificationTemplate,
  NotificationPreference,
  NotificationRule,
  NotificationQueue,
  NotificationHistory,
  InAppNotification,
  NotificationAnalytics,
  ChannelPerformance,
  UserEngagement,
  CreateNotificationTemplateData,
  UpdateNotificationTemplateData,
  UpdateNotificationPreferenceData,
  CreateNotificationRuleData,
  UpdateNotificationRuleData,
  SendNotificationData,
  TestNotificationData,
  BulkNotificationActionData,
  NotificationPreferenceUpdateData,
  NotificationTemplateFilters,
  NotificationRuleFilters,
  NotificationQueueFilters,
  NotificationHistoryFilters,
  InAppNotificationFilters,
  PaginatedResponse,
} from '../types/notifications.types';

export const notificationsApi = {
  // Templates
  getTemplates: async (filters?: NotificationTemplateFilters): Promise<NotificationTemplate[]> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.notification_type) params.append('notification_type', filters.notification_type);
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters?.channel) params.append('channel', filters.channel);
    
    const response = await api.get<PaginatedResponse<NotificationTemplate>>(`/notifications/templates/?${params.toString()}`);
    return response.data.results || [];
  },

  getTemplate: async (id: number): Promise<NotificationTemplate> => {
    const response = await api.get<NotificationTemplate>(`/notifications/templates/${id}/`);
    return response.data;
  },

  createTemplate: async (data: CreateNotificationTemplateData): Promise<NotificationTemplate> => {
    const response = await api.post<NotificationTemplate>('/notifications/templates/', data);
    return response.data;
  },

  updateTemplate: async (id: number, data: UpdateNotificationTemplateData): Promise<NotificationTemplate> => {
    const response = await api.patch<NotificationTemplate>(`/notifications/templates/${id}/`, data);
    return response.data;
  },

  deleteTemplate: async (id: number): Promise<void> => {
    await api.delete(`/notifications/templates/${id}/`);
  },

  previewTemplate: async (id: number, data: { context_data?: Record<string, any> }): Promise<{ subject?: string; content: string }> => {
    const response = await api.post<{ subject?: string; content: string }>(`/notifications/templates/${id}/preview/`, data);
    return response.data;
  },

  testSendTemplate: async (id: number, data: TestNotificationData): Promise<{ message: string; notifications_queued: number }> => {
    const response = await api.post<{ message: string; notifications_queued: number }>(`/notifications/templates/${id}/test_send/`, data);
    return response.data;
  },

  getNotificationTypes: async (): Promise<Array<{ value: string; label: string }>> => {
    const response = await api.get<Array<{ value: string; label: string }>>('/notifications/templates/notification_types/');
    return response.data;
  },

  getChannels: async (): Promise<Array<{ value: string; label: string }>> => {
    const response = await api.get<Array<{ value: string; label: string }>>('/notifications/templates/channels/');
    return response.data;
  },

  // Preferences
  getMyPreferences: async (): Promise<NotificationPreference> => {
    const response = await api.get<NotificationPreference>('/notifications/preferences/my_preferences/');
    return response.data;
  },

  updateMyPreferences: async (data: UpdateNotificationPreferenceData): Promise<NotificationPreference> => {
    const response = await api.put<NotificationPreference>('/notifications/preferences/my_preferences/', data);
    return response.data;
  },

  updateNotificationSetting: async (data: NotificationPreferenceUpdateData): Promise<NotificationPreference> => {
    const response = await api.post<NotificationPreference>('/notifications/preferences/update_notification_setting/', data);
    return response.data;
  },

  getAvailableSettings: async (): Promise<{
    notification_types: Array<{ value: string; label: string }>;
    channels: Array<{ value: string; label: string }>;
  }> => {
    const response = await api.get<{
      notification_types: Array<{ value: string; label: string }>;
      channels: Array<{ value: string; label: string }>;
    }>('/notifications/preferences/available_settings/');
    return response.data;
  },

  // Rules (Admin only)
  getRules: async (filters?: NotificationRuleFilters): Promise<NotificationRule[]> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.event_type) params.append('event_type', filters.event_type);
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters?.template_id) params.append('template_id', filters.template_id.toString());
    
    const response = await api.get<PaginatedResponse<NotificationRule>>(`/notifications/rules/?${params.toString()}`);
    return response.data.results || [];
  },

  getRule: async (id: number): Promise<NotificationRule> => {
    const response = await api.get<NotificationRule>(`/notifications/rules/${id}/`);
    return response.data;
  },

  createRule: async (data: CreateNotificationRuleData): Promise<NotificationRule> => {
    const response = await api.post<NotificationRule>('/notifications/rules/', data);
    return response.data;
  },

  updateRule: async (id: number, data: UpdateNotificationRuleData): Promise<NotificationRule> => {
    const response = await api.patch<NotificationRule>(`/notifications/rules/${id}/`, data);
    return response.data;
  },

  deleteRule: async (id: number): Promise<void> => {
    await api.delete(`/notifications/rules/${id}/`);
  },

  getEventTypes: async (): Promise<Array<{ value: string; label: string }>> => {
    const response = await api.get<Array<{ value: string; label: string }>>('/notifications/rules/event_types/');
    return response.data;
  },

  // Queue (Admin only)
  getQueue: async (filters?: NotificationQueueFilters): Promise<NotificationQueue[]> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.channel) params.append('channel', filters.channel);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.recipient_id) params.append('recipient_id', filters.recipient_id.toString());
    
    const response = await api.get<PaginatedResponse<NotificationQueue>>(`/notifications/queue/?${params.toString()}`);
    return response.data.results || [];
  },

  retryQueueItem: async (id: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(`/notifications/queue/${id}/retry/`);
    return response.data;
  },

  cancelQueueItem: async (id: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(`/notifications/queue/${id}/cancel/`);
    return response.data;
  },

  // History
  getHistory: async (filters?: NotificationHistoryFilters): Promise<NotificationHistory[]> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.notification_type) params.append('notification_type', filters.notification_type);
    if (filters?.channel) params.append('channel', filters.channel);
    if (filters?.delivery_status) params.append('delivery_status', filters.delivery_status);
    if (filters?.recipient_id) params.append('recipient_id', filters.recipient_id.toString());
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    
    const response = await api.get<PaginatedResponse<NotificationHistory>>(`/notifications/history/?${params.toString()}`);
    return response.data.results || [];
  },

  // In-App Notifications
  getInAppNotifications: async (filters?: InAppNotificationFilters): Promise<InAppNotification[]> => {
    const params = new URLSearchParams();
    if (filters?.is_read !== undefined) params.append('is_read', filters.is_read.toString());
    if (filters?.notification_type) params.append('notification_type', filters.notification_type);
    if (filters?.priority) params.append('priority', filters.priority);
    
    const response = await api.get<PaginatedResponse<InAppNotification>>(`/notifications/in-app/?${params.toString()}`);
    return response.data.results || [];
  },

  markAsRead: async (id: string): Promise<InAppNotification> => {
    const response = await api.post<InAppNotification>(`/notifications/in-app/${id}/mark_read/`);
    return response.data;
  },

  markAllAsRead: async (): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/notifications/in-app/mark_all_read/');
    return response.data;
  },

  bulkAction: async (data: BulkNotificationActionData): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/notifications/in-app/bulk_action/', data);
    return response.data;
  },

  getUnreadCount: async (): Promise<{ unread_count: number }> => {
    const response = await api.get<{ unread_count: number }>('/notifications/in-app/unread_count/');
    return response.data;
  },

  // Analytics (Admin only)
  getDeliveryStats: async (days: number = 30, notificationType?: string, userId?: number): Promise<NotificationAnalytics> => {
    const params = new URLSearchParams();
    params.append('days', days.toString());
    if (notificationType) params.append('notification_type', notificationType);
    if (userId) params.append('user_id', userId.toString());
    
    const response = await api.get<NotificationAnalytics>(`/notifications/analytics/delivery_stats/?${params.toString()}`);
    return response.data;
  },

  getChannelPerformance: async (days: number = 30): Promise<ChannelPerformance[]> => {
    const params = new URLSearchParams();
    params.append('days', days.toString());
    
    const response = await api.get<ChannelPerformance[]>(`/notifications/analytics/channel_performance/?${params.toString()}`);
    return response.data;
  },

  getUserEngagement: async (userId: number, days: number = 30): Promise<UserEngagement> => {
    const params = new URLSearchParams();
    params.append('user_id', userId.toString());
    params.append('days', days.toString());
    
    const response = await api.get<UserEngagement>(`/notifications/analytics/user_engagement/?${params.toString()}`);
    return response.data;
  },

  sendManualNotification: async (data: SendNotificationData): Promise<{ message: string; notifications_queued: number; recipients: number }> => {
    const response = await api.post<{ message: string; notifications_queued: number; recipients: number }>('/notifications/analytics/send_manual/', data);
    return response.data;
  },
};