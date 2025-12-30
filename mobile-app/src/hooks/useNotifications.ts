/**
 * useNotifications Hook
 *
 * Core hook for push notification management:
 * - Registers push token when user authenticates
 * - Listens for incoming notifications (foreground)
 * - Handles notification tap navigation
 * - Cleans up on unmount
 *
 * USAGE:
 * Call this hook at the root level (inside AuthProvider) to
 * enable push notifications throughout the app.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

import { NotificationService } from '@/services/notifications';
import { registerPushToken } from '@/apis/notifications.api';
import { useAuthStore } from '@/stores/authStore';
import {
  handleNotificationNavigation,
  parseNotificationData,
} from '@/utils/notificationHandler';
import type { PushNotificationData } from '@/types/notifications.types';

// =============================================================================
// TYPES
// =============================================================================

interface UseNotificationsResult {
  /** The Expo push token (null if not registered) */
  expoPushToken: string | null;
  /** Whether notifications are currently enabled */
  isEnabled: boolean;
  /** Whether registration is in progress */
  isRegistering: boolean;
  /** Last received notification (while app is in foreground) */
  lastNotification: Notifications.Notification | null;
  /** Re-register push token (e.g., after re-enabling permissions) */
  registerToken: () => Promise<void>;
}

// =============================================================================
// HOOK
// =============================================================================

export function useNotifications(): UseNotificationsResult {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [lastNotification, setLastNotification] =
    useState<Notifications.Notification | null>(null);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Refs for listeners (to clean up on unmount)
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  // Track if we've already registered to prevent duplicate registrations
  const hasRegistered = useRef(false);

  // ===========================================================================
  // REGISTRATION
  // ===========================================================================

  const registerToken = useCallback(async () => {
    if (isRegistering) return;

    setIsRegistering(true);

    try {
      // Get push token from notification service
      const token = await NotificationService.registerForPushNotifications();

      if (token) {
        setExpoPushToken(token);
        setIsEnabled(true);

        // Register with backend
        try {
          const deviceId = await NotificationService.getDeviceId();
          const deviceName = NotificationService.getDeviceName();
          const deviceType = NotificationService.getDeviceType();
          const appVersion = Constants.expoConfig?.version || '1.0.0';

          await registerPushToken({
            token,
            device_type: deviceType,
            device_id: deviceId,
            device_name: deviceName,
            app_version: appVersion,
          });

          console.log('Push token registered with backend');
        } catch (error) {
          // Continue even if backend registration fails
          // Token is still valid for receiving notifications
          console.warn('Failed to register push token with backend:', error);
        }
      } else {
        setIsEnabled(false);
      }
    } catch (error) {
      console.error('Push notification registration failed:', error);
      setIsEnabled(false);
    } finally {
      setIsRegistering(false);
    }
  }, [isRegistering]);

  // ===========================================================================
  // REGISTRATION EFFECT
  // ===========================================================================

  useEffect(() => {
    // Only register when authenticated and haven't already registered
    if (!isAuthenticated || hasRegistered.current) {
      return;
    }

    // Check if push notifications are available
    if (!NotificationService.isAvailable()) {
      console.log('Push notifications not available (simulator or web)');
      return;
    }

    hasRegistered.current = true;
    registerToken();
  }, [isAuthenticated, registerToken]);

  // Reset registration tracking when logged out
  useEffect(() => {
    if (!isAuthenticated) {
      hasRegistered.current = false;
      setExpoPushToken(null);
      setIsEnabled(false);
    }
  }, [isAuthenticated]);

  // ===========================================================================
  // NOTIFICATION LISTENERS
  // ===========================================================================

  useEffect(() => {
    // Listener for notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification.request.content.title);
        setLastNotification(notification);
      }
    );

    // Listener for when user taps on a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification tapped:', response.notification.request.content.title);

        // Parse the notification data
        const data = parseNotificationData(response);

        // Navigate to the appropriate screen
        handleNotificationNavigation(data);
      }
    );

    // Cleanup listeners on unmount
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  // ===========================================================================
  // RETURN VALUE
  // ===========================================================================

  return {
    expoPushToken,
    isEnabled,
    isRegistering,
    lastNotification,
    registerToken,
  };
}

export default useNotifications;
