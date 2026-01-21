/**
 * Notifications API
 *
 * API endpoints for push notifications, preferences, and notification management.
 * Matches the backend API at /api/notifications/
 */

import { api } from '@/utils/api';
import type {
  DevicePushToken,
  RegisterPushTokenRequest,
  UnregisterPushTokenRequest,
  NotificationPreference,
  Notification,
  NotificationCounts,
  NotificationListResponse,
  DevicesListResponse,
} from '@/types/notifications.types';

// =============================================================================
// PUSH TOKEN ENDPOINTS
// =============================================================================

/**
 * Register a device push token with the backend
 */
export const registerPushToken = async (
  data: RegisterPushTokenRequest
): Promise<DevicePushToken> => {
  const response = await api.post('/notifications/push-tokens/', data);
  return response.data;
};

/**
 * Unregister push token (on logout)
 */
export const unregisterPushToken = async (
  data: UnregisterPushTokenRequest
): Promise<{ message: string; count: number }> => {
  const response = await api.post('/notifications/push-tokens/unregister/', data);
  return response.data;
};

/**
 * Get user's registered devices
 */
export const getMyDevices = async (): Promise<DevicesListResponse> => {
  const response = await api.get('/notifications/push-tokens/my_devices/');
  return response.data;
};

/**
 * Send a test push notification to verify setup
 */
export const sendTestPush = async (data?: {
  title?: string;
  body?: string;
  device_id?: string;
}): Promise<{
  message: string;
  total_devices?: number;
  successful?: number;
  failed?: number;
}> => {
  const response = await api.post('/notifications/push-tokens/test_push/', data || {});
  return response.data;
};

// =============================================================================
// NOTIFICATION PREFERENCES
// =============================================================================

/**
 * Get user's notification preferences
 */
export const getNotificationPreferences = async (): Promise<NotificationPreference> => {
  const response = await api.get('/notifications/preferences/my_preferences/');
  return response.data;
};

/**
 * Update notification preferences
 */
export const updateNotificationPreferences = async (
  data: Partial<NotificationPreference>
): Promise<NotificationPreference> => {
  const response = await api.patch('/notifications/preferences/update_preferences/', data);
  return response.data;
};

/**
 * Reset preferences to defaults
 */
export const resetPreferencesToDefaults = async (): Promise<{
  message: string;
  preferences: NotificationPreference;
}> => {
  const response = await api.post('/notifications/preferences/reset_to_defaults/');
  return response.data;
};

// =============================================================================
// NOTIFICATIONS
// =============================================================================

/**
 * Get notifications list with optional filters
 */
export const getNotifications = async (params?: {
  is_read?: boolean;
  type?: string;
  category?: string;
  priority?: string;
  limit?: number;
  offset?: number;
}): Promise<NotificationListResponse> => {
  const response = await api.get('/notifications/notifications/', { params });
  return response.data;
};

/**
 * Get unread notifications
 */
export const getUnreadNotifications = async (
  limit: number = 20
): Promise<Notification[]> => {
  const response = await api.get('/notifications/notifications/unread/', {
    params: { limit },
  });
  return response.data;
};

/**
 * Get recent notifications
 */
export const getRecentNotifications = async (
  limit: number = 5
): Promise<Notification[]> => {
  const response = await api.get('/notifications/notifications/recent/', {
    params: { limit },
  });
  return response.data;
};

/**
 * Get notification counts
 */
export const getNotificationCounts = async (): Promise<NotificationCounts> => {
  const response = await api.get('/notifications/notifications/counts/');
  return response.data;
};

/**
 * Mark notification as read
 */
export const markNotificationRead = async (
  notificationId: string
): Promise<Notification> => {
  const response = await api.post(
    `/notifications/notifications/${notificationId}/mark_read/`
  );
  return response.data;
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsRead = async (): Promise<{ marked_read: number }> => {
  const response = await api.post('/notifications/notifications/mark_all_read/');
  return response.data;
};

/**
 * Get single notification by ID
 */
export const getNotificationById = async (id: string): Promise<Notification> => {
  const response = await api.get(`/notifications/notifications/${id}/`);
  return response.data;
};

/**
 * Delete notification
 */
export const deleteNotification = async (id: string): Promise<void> => {
  await api.delete(`/notifications/notifications/${id}/`);
};

// =============================================================================
// NOTIFICATIONS API OBJECT
// =============================================================================

export const NotificationsAPI = {
  // Push tokens
  registerPushToken,
  unregisterPushToken,
  getMyDevices,
  sendTestPush,

  // Preferences
  getNotificationPreferences,
  updateNotificationPreferences,
  resetPreferencesToDefaults,

  // Notifications
  getNotifications,
  getUnreadNotifications,
  getRecentNotifications,
  getNotificationCounts,
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationById,
  deleteNotification,
};

export default NotificationsAPI;
