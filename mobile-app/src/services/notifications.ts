/**
 * Notification Service
 *
 * Core service for push notification management:
 * - Permission requests
 * - Expo push token retrieval
 * - Android notification channel configuration
 * - Device token registration with backend
 * - Local notification scheduling
 * - Badge management
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { colors } from '@/theme';
import { notificationLogger as logger } from '@/utils/logger';

// =============================================================================
// CONFIGURE NOTIFICATION HANDLER
// =============================================================================

/**
 * Configure how notifications are handled when the app is in the foreground.
 * This must be called before any notification is received.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// =============================================================================
// STORAGE KEYS
// =============================================================================

const PUSH_TOKEN_KEY = 'expo_push_token';
const DEVICE_ID_KEY = 'device_id';

// =============================================================================
// NOTIFICATION SERVICE
// =============================================================================

export const NotificationService = {
  // ===========================================================================
  // PERMISSIONS
  // ===========================================================================

  /**
   * Check if push notifications are available on this device
   */
  isAvailable: (): boolean => {
    return Device.isDevice;
  },

  /**
   * Get current notification permission status
   */
  getPermissionStatus: async (): Promise<Notifications.PermissionStatus> => {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  },

  /**
   * Request notification permissions
   */
  requestPermissions: async (): Promise<boolean> => {
    if (!Device.isDevice) {
      logger.info('Push notifications require a physical device');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    if (existingStatus === 'granted') {
      return true;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  },

  // ===========================================================================
  // PUSH TOKEN
  // ===========================================================================

  /**
   * Get the Expo push token for this device.
   * Returns null if not available (simulator, permissions denied, etc.)
   */
  getExpoPushToken: async (): Promise<string | null> => {
    if (!Device.isDevice) {
      logger.info('Push notifications require a physical device');
      return null;
    }

    // Check permissions
    const hasPermission = await NotificationService.requestPermissions();
    if (!hasPermission) {
      logger.info('Push notification permission denied');
      return null;
    }

    try {
      // Get project ID from app config
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      if (!projectId) {
        logger.warn('EAS Project ID not configured in app.config.js');
      }

      const tokenResult = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      return tokenResult.data;
    } catch (error) {
      logger.error('Error getting push token:', error);
      return null;
    }
  },

  /**
   * Store the push token securely for later cleanup
   */
  storePushToken: async (token: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
    } catch (error) {
      logger.error('Failed to store push token:', error);
    }
  },

  /**
   * Get the stored push token
   */
  getStoredPushToken: async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
    } catch (error) {
      logger.error('Failed to get stored push token:', error);
      return null;
    }
  },

  /**
   * Clear the stored push token
   */
  clearStoredPushToken: async (): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
    } catch (error) {
      logger.error('Failed to clear stored push token:', error);
    }
  },

  // ===========================================================================
  // DEVICE ID
  // ===========================================================================

  /**
   * Get or create a unique device ID for this installation
   */
  getDeviceId: async (): Promise<string> => {
    try {
      let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);

      if (!deviceId) {
        // Generate a unique ID for this device
        deviceId = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
        await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
      }

      return deviceId;
    } catch (error) {
      logger.error('Failed to get device ID:', error);
      // Return a temporary ID if storage fails
      return `temp-${Date.now()}`;
    }
  },

  /**
   * Get device name for display purposes
   */
  getDeviceName: (): string => {
    return Device.modelName || `${Platform.OS} Device`;
  },

  /**
   * Get device type for backend
   */
  getDeviceType: (): 'ios' | 'android' | 'web' => {
    if (Platform.OS === 'ios') return 'ios';
    if (Platform.OS === 'android') return 'android';
    return 'web';
  },

  // ===========================================================================
  // ANDROID NOTIFICATION CHANNELS
  // ===========================================================================

  /**
   * Set up Android notification channels.
   * Must be called before receiving notifications on Android.
   */
  setupAndroidChannels: async (): Promise<void> => {
    if (Platform.OS !== 'android') return;

    try {
      // Default channel for general notifications
      await Notifications.setNotificationChannelAsync('default', {
        name: 'General',
        description: 'General notifications from LifePlace',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: colors.secondary.forest,
        sound: 'default',
      });

      // Payment notifications
      await Notifications.setNotificationChannelAsync('payments', {
        name: 'Payments',
        description: 'Payment reminders and confirmations',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: colors.accent.wood,
        sound: 'default',
      });

      // Event notifications
      await Notifications.setNotificationChannelAsync('events', {
        name: 'Events',
        description: 'Updates about your events',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: colors.secondary.forest,
        sound: 'default',
      });

      // Message notifications
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        description: 'New messages from LifePlace',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: colors.tertiary.teal,
        sound: 'default',
      });

      // Contract notifications
      await Notifications.setNotificationChannelAsync('contracts', {
        name: 'Contracts',
        description: 'Contract updates and signing requests',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: colors.accent.wood,
        sound: 'default',
      });
    } catch (error) {
      logger.error('Failed to setup Android channels:', error);
    }
  },

  // ===========================================================================
  // LOCAL NOTIFICATIONS
  // ===========================================================================

  /**
   * Schedule a local notification
   */
  scheduleLocalNotification: async (
    title: string,
    body: string,
    data?: Record<string, unknown>,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string> => {
    return Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: trigger ?? null,
    });
  },

  /**
   * Cancel a scheduled notification
   */
  cancelNotification: async (notificationId: string): Promise<void> => {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  },

  /**
   * Cancel all scheduled notifications
   */
  cancelAllNotifications: async (): Promise<void> => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  // ===========================================================================
  // BADGE MANAGEMENT
  // ===========================================================================

  /**
   * Get current badge count
   */
  getBadgeCount: async (): Promise<number> => {
    return Notifications.getBadgeCountAsync();
  },

  /**
   * Set badge count
   */
  setBadgeCount: async (count: number): Promise<void> => {
    await Notifications.setBadgeCountAsync(count);
  },

  /**
   * Clear badge (set to 0)
   */
  clearBadge: async (): Promise<void> => {
    await Notifications.setBadgeCountAsync(0);
  },

  // ===========================================================================
  // NOTIFICATION DISMISSAL
  // ===========================================================================

  /**
   * Dismiss all delivered notifications from notification center
   */
  dismissAllNotifications: async (): Promise<void> => {
    await Notifications.dismissAllNotificationsAsync();
  },

  /**
   * Dismiss a specific notification
   */
  dismissNotification: async (notificationId: string): Promise<void> => {
    await Notifications.dismissNotificationAsync(notificationId);
  },

  // ===========================================================================
  // BACKEND REGISTRATION
  // ===========================================================================

  /**
   * Register push token with the backend
   * Stores device info along with the Expo push token
   */
  registerTokenWithBackend: async (token: string): Promise<boolean> => {
    try {
      // Dynamic import to avoid circular dependency
      const { api } = await import('@/utils/api');

      const deviceId = await NotificationService.getDeviceId();
      const deviceName = NotificationService.getDeviceName();
      const deviceType = NotificationService.getDeviceType();

      await api.post('/notifications/push-tokens/', {
        token,
        device_type: deviceType,
        device_id: deviceId,
        device_name: deviceName,
        app_version: Constants.expoConfig?.version || '1.0.0',
      });

      logger.info('Push token registered with backend');
      return true;
    } catch (error) {
      logger.error('Failed to register push token with backend:', error);
      return false;
    }
  },

  /**
   * Unregister push token from the backend
   * Should be called on logout
   */
  unregisterTokenFromBackend: async (): Promise<boolean> => {
    try {
      // Dynamic import to avoid circular dependency
      const { api } = await import('@/utils/api');

      const deviceId = await NotificationService.getDeviceId();
      const storedToken = await NotificationService.getStoredPushToken();

      await api.post('/notifications/push-tokens/unregister/', {
        token: storedToken,
        device_id: deviceId,
      });

      // Clear the stored token
      await NotificationService.clearStoredPushToken();

      logger.info('Push token unregistered from backend');
      return true;
    } catch (error) {
      logger.error('Failed to unregister push token from backend:', error);
      return false;
    }
  },

  // ===========================================================================
  // FULL REGISTRATION FLOW
  // ===========================================================================

  /**
   * Complete registration flow:
   * 1. Request permissions
   * 2. Get Expo push token
   * 3. Setup Android channels
   * 4. Store token locally
   * 5. Register token with backend
   *
   * Returns the token if successful, null otherwise.
   */
  registerForPushNotifications: async (): Promise<string | null> => {
    // Get the push token
    const token = await NotificationService.getExpoPushToken();

    if (!token) {
      return null;
    }

    // Setup Android channels
    await NotificationService.setupAndroidChannels();

    // Store token for later cleanup
    await NotificationService.storePushToken(token);

    // Register with backend
    await NotificationService.registerTokenWithBackend(token);

    return token;
  },

  /**
   * Unregister for push notifications
   * Should be called on logout
   */
  unregisterForPushNotifications: async (): Promise<void> => {
    // Unregister from backend
    await NotificationService.unregisterTokenFromBackend();

    // Clear badge
    await NotificationService.clearBadge();

    // Dismiss all notifications
    await NotificationService.dismissAllNotifications();
  },
};

export default NotificationService;
