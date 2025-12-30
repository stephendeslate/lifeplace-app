# Phase 9: Push Notifications - Implementation Plan

> **Phase Status:** Ready for Implementation
> **Dependencies:** Phases 1-8 Complete, Backend Push Infrastructure Ready
> **Reference:** [ROADMAP.md](./ROADMAP.md), [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) lines 8550-8968

---

## Overview

Phase 9 integrates push notifications into the LifePlace mobile app, enabling real-time alerts for quotes, payments, contracts, events, and messages. The backend already has full push notification support with `DevicePushToken` model, Expo push services, and preference management.

### Backend API Endpoints (Already Available)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/notifications/push-tokens/` | POST | Register device push token |
| `/api/notifications/push-tokens/unregister/` | POST | Unregister by token/device_id |
| `/api/notifications/push-tokens/my_devices/` | GET | List user's registered devices |
| `/api/notifications/push-tokens/test_push/` | POST | Send test notification |
| `/api/notifications/preferences/my_preferences/` | GET | Get user's notification preferences |
| `/api/notifications/preferences/update_preferences/` | PUT/PATCH | Update preferences |
| `/api/notifications/notifications/` | GET | List notifications |
| `/api/notifications/notifications/unread/` | GET | Get unread notifications |
| `/api/notifications/notifications/counts/` | GET | Get notification counts |
| `/api/notifications/notifications/{id}/mark_read/` | POST | Mark as read |
| `/api/notifications/notifications/mark_all_read/` | POST | Mark all as read |

---

## Implementation Tasks

### 9.1 Install Dependencies

**Files to Create/Modify:** `package.json`

```bash
npx expo install expo-notifications expo-device expo-constants
```

**Verification Checklist:**
- [ ] All packages install without errors
- [ ] `expo-notifications` version is compatible with current Expo SDK
- [ ] No peer dependency conflicts

---

### 9.2 Notification Types Definition

**File:** `src/types/notifications.types.ts`

```typescript
// Notification type codes (matching backend NotificationType.code values)
export type NotificationTypeCode =
  | 'quote_created'
  | 'quote_updated'
  | 'quote_expiring'
  | 'payment_due'
  | 'payment_reminder'
  | 'payment_received'
  | 'contract_ready'
  | 'contract_signed'
  | 'event_update'
  | 'event_reminder'
  | 'task_assigned'
  | 'task_reminder'
  | 'message_received'
  | 'general';

// Notification categories (matching backend)
export type NotificationCategory =
  | 'SYSTEM'
  | 'EVENT'
  | 'TASK'
  | 'PAYMENT'
  | 'CLIENT'
  | 'CONTRACT'
  | 'WORKFLOW'
  | 'COMMUNICATION'
  | 'MARKETING';

// Push notification data payload
export interface PushNotificationData {
  notification_id?: string;
  notification_type?: NotificationTypeCode;
  category?: NotificationCategory;
  action_url?: string;
  event_id?: string;
  client_id?: string;
  quote_id?: string;
  contract_id?: string;
  invoice_id?: string;
  test?: boolean;
}

// Device push token
export interface DevicePushToken {
  id: string;
  token: string;
  device_id: string;
  device_type: 'ios' | 'android' | 'web';
  device_name: string;
  is_active: boolean;
  last_used_at: string | null;
  failure_count: number;
  app_version: string;
  created_at: string;
  updated_at: string;
}

// Register token request
export interface RegisterPushTokenRequest {
  token: string;
  device_type: 'ios' | 'android' | 'web';
  device_id?: string;
  device_name?: string;
  app_version?: string;
}

// Unregister token request
export interface UnregisterPushTokenRequest {
  token?: string;
  device_id?: string;
}

// Notification preference (matching backend model)
export interface NotificationPreference {
  id: string;
  user: string;

  // Global toggles
  email_enabled: boolean;
  sms_enabled: boolean;
  in_app_enabled: boolean;
  push_enabled: boolean;

  // Category-specific push preferences
  system_push: boolean;
  event_push: boolean;
  task_push: boolean;
  payment_push: boolean;
  client_push: boolean;
  contract_push: boolean;
  workflow_push: boolean;
  communication_push: boolean;
  marketing_push: boolean;

  // Advanced
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  digest_frequency: 'IMMEDIATE' | 'HOURLY' | 'DAILY' | 'WEEKLY';
}

// Notification item (from backend)
export interface Notification {
  id: string;
  notification_type_details: {
    code: NotificationTypeCode;
    name: string;
    category: NotificationCategory;
    icon: string;
    color: string;
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  };
  title: string;
  content: string;
  action_url: string;
  is_read: boolean;
  read_at: string | null;
  time_since_created: string;
  can_mark_read: boolean;
  created_at: string;
  event?: string;
  event_name?: string;
}

// Notification counts
export interface NotificationCounts {
  total: number;
  unread: number;
  by_category: Record<NotificationCategory, number>;
  by_priority: Record<string, number>;
}
```

---

### 9.3 Notification Service

**File:** `src/services/notifications.ts`

This is the core service that handles:
- Push permission requests
- Expo push token retrieval
- Android notification channel configuration
- Device token registration with backend
- Local notification scheduling
- Badge management

**Key Implementation Points:**

1. **Permission Flow:**
   - Check existing permissions first
   - Only request if not already granted
   - Handle permission denied gracefully

2. **Token Registration:**
   - Get Expo push token using project ID from `app.json`
   - Send to backend via `/api/notifications/push-tokens/`
   - Include device metadata (type, name, app version)

3. **Android Channels:**
   - `default` - General notifications (MAX importance)
   - `payments` - Payment reminders (HIGH importance)
   - `events` - Event updates (HIGH importance)
   - `messages` - Chat/messages (HIGH importance)
   - `contracts` - Contract notifications (HIGH importance)

4. **Token Persistence:**
   - Store token in `expo-secure-store` for logout cleanup
   - Check if token changed on app launch

```typescript
// Reference implementation from DEVELOPMENT_GUIDE.md lines 8558-8731
// See src/services/notifications.ts code block
```

---

### 9.4 Notification API Layer

**File:** `src/apis/notifications.api.ts`

```typescript
import { api } from '@/utils/api';
import type {
  DevicePushToken,
  RegisterPushTokenRequest,
  UnregisterPushTokenRequest,
  NotificationPreference,
  Notification,
  NotificationCounts,
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
  const response = await api.post('/api/notifications/push-tokens/', data);
  return response.data;
};

/**
 * Unregister push token (on logout)
 */
export const unregisterPushToken = async (
  data: UnregisterPushTokenRequest
): Promise<{ message: string; count: number }> => {
  const response = await api.post('/api/notifications/push-tokens/unregister/', data);
  return response.data;
};

/**
 * Get user's registered devices
 */
export const getMyDevices = async (): Promise<{
  devices: DevicePushToken[];
  count: number;
}> => {
  const response = await api.get('/api/notifications/push-tokens/my_devices/');
  return response.data;
};

/**
 * Send a test push notification
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
  const response = await api.post('/api/notifications/push-tokens/test_push/', data || {});
  return response.data;
};

// =============================================================================
// NOTIFICATION PREFERENCES
// =============================================================================

/**
 * Get user's notification preferences
 */
export const getNotificationPreferences = async (): Promise<NotificationPreference> => {
  const response = await api.get('/api/notifications/preferences/my_preferences/');
  return response.data;
};

/**
 * Update notification preferences
 */
export const updateNotificationPreferences = async (
  data: Partial<NotificationPreference>
): Promise<NotificationPreference> => {
  const response = await api.patch('/api/notifications/preferences/update_preferences/', data);
  return response.data;
};

/**
 * Reset preferences to defaults
 */
export const resetPreferencesToDefaults = async (): Promise<{
  message: string;
  preferences: NotificationPreference;
}> => {
  const response = await api.post('/api/notifications/preferences/reset_to_defaults/');
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
}): Promise<{
  results: Notification[];
  count: number;
  next: string | null;
  previous: string | null;
}> => {
  const response = await api.get('/api/notifications/notifications/', { params });
  return response.data;
};

/**
 * Get unread notifications
 */
export const getUnreadNotifications = async (
  limit: number = 20
): Promise<Notification[]> => {
  const response = await api.get('/api/notifications/notifications/unread/', {
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
  const response = await api.get('/api/notifications/notifications/recent/', {
    params: { limit },
  });
  return response.data;
};

/**
 * Get notification counts
 */
export const getNotificationCounts = async (): Promise<NotificationCounts> => {
  const response = await api.get('/api/notifications/notifications/counts/');
  return response.data;
};

/**
 * Mark notification as read
 */
export const markNotificationRead = async (
  notificationId: string
): Promise<Notification> => {
  const response = await api.post(
    `/api/notifications/notifications/${notificationId}/mark_read/`
  );
  return response.data;
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsRead = async (): Promise<{ marked_read: number }> => {
  const response = await api.post('/api/notifications/notifications/mark_all_read/');
  return response.data;
};

/**
 * Get single notification by ID
 */
export const getNotificationById = async (id: string): Promise<Notification> => {
  const response = await api.get(`/api/notifications/notifications/${id}/`);
  return response.data;
};

/**
 * Delete notification
 */
export const deleteNotification = async (id: string): Promise<void> => {
  await api.delete(`/api/notifications/notifications/${id}/`);
};
```

---

### 9.5 Notification Hook

**File:** `src/hooks/useNotifications.ts`

This hook manages:
- Push token registration on authentication
- Foreground notification listeners
- Notification tap handling with deep linking
- Token cleanup on logout

**Key Features:**

1. **Automatic Registration:**
   - Registers token when user authenticates
   - Re-registers if token changes
   - Handles permission denied gracefully

2. **Notification Listeners:**
   - `addNotificationReceivedListener` - foreground notifications
   - `addNotificationResponseReceivedListener` - tap responses

3. **Deep Link Navigation:**
   - Parse notification data
   - Navigate to appropriate screen based on type
   - Handle edge cases (missing IDs, unknown types)

```typescript
// Reference implementation from DEVELOPMENT_GUIDE.md lines 8738-8818
// Key navigation mapping:
// - quote_* → /quotes/[id]
// - payment_* → /payments/[id]
// - contract_* → /contracts/[id]
// - event_* → /events/[id]
// - task_* → /events/[event_id]?tab=tasks
// - message_* → /messages/[thread_id]
// - default → /(tabs)/notifications
```

---

### 9.6 Notification Preferences Hook

**File:** `src/hooks/useNotificationPreferences.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  resetPreferencesToDefaults,
} from '@/apis/notifications.api';
import type { NotificationPreference } from '@/types/notifications.types';
import { useToast } from '@/contexts/ToastContext';

export const notificationKeys = {
  all: ['notifications'] as const,
  preferences: () => [...notificationKeys.all, 'preferences'] as const,
  list: (filters?: Record<string, unknown>) =>
    [...notificationKeys.all, 'list', filters] as const,
  unread: () => [...notificationKeys.all, 'unread'] as const,
  counts: () => [...notificationKeys.all, 'counts'] as const,
  devices: () => [...notificationKeys.all, 'devices'] as const,
};

export function useNotificationPreferences() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: preferences, isLoading, error, refetch } = useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: getNotificationPreferences,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateMutation = useMutation({
    mutationFn: updateNotificationPreferences,
    onSuccess: (data) => {
      queryClient.setQueryData(notificationKeys.preferences(), data);
      showToast('Preferences updated', 'success');
    },
    onError: () => {
      showToast('Failed to update preferences', 'error');
    },
  });

  const resetMutation = useMutation({
    mutationFn: resetPreferencesToDefaults,
    onSuccess: (data) => {
      queryClient.setQueryData(notificationKeys.preferences(), data.preferences);
      showToast('Preferences reset to defaults', 'success');
    },
    onError: () => {
      showToast('Failed to reset preferences', 'error');
    },
  });

  const updatePreference = (
    key: keyof NotificationPreference,
    value: boolean | string
  ) => {
    updateMutation.mutate({ [key]: value });
  };

  return {
    preferences: preferences ?? {
      push_enabled: true,
      event_push: true,
      payment_push: true,
      task_push: true,
      contract_push: true,
      communication_push: true,
      marketing_push: false,
    } as NotificationPreference,
    isLoading,
    error,
    refetch,
    updatePreference,
    updatePreferences: updateMutation.mutate,
    resetToDefaults: resetMutation.mutate,
    isUpdating: updateMutation.isPending,
    isResetting: resetMutation.isPending,
  };
}
```

---

### 9.7 Notifications List Hook

**File:** `src/hooks/useNotificationsList.ts`

```typescript
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import {
  getNotifications,
  getUnreadNotifications,
  getNotificationCounts,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '@/apis/notifications.api';
import { notificationKeys } from './useNotificationPreferences';
import { useToast } from '@/contexts/ToastContext';

interface NotificationFilters {
  is_read?: boolean;
  type?: string;
  category?: string;
  priority?: string;
}

export function useNotificationsList(filters?: NotificationFilters) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Paginated notifications list
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: notificationKeys.list(filters),
    queryFn: ({ pageParam = 0 }) =>
      getNotifications({ ...filters, limit: 20, offset: pageParam }),
    getNextPageParam: (lastPage) => {
      if (lastPage.next) {
        const url = new URL(lastPage.next);
        return parseInt(url.searchParams.get('offset') || '0');
      }
      return undefined;
    },
    initialPageParam: 0,
  });

  // Flatten pages into single array
  const notifications = data?.pages.flatMap((page) => page.results) ?? [];

  // Mark single notification read
  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.counts() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unread() });
    },
  });

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: (data) => {
      showToast(`Marked ${data.marked_read} notifications as read`, 'success');
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: () => {
      showToast('Failed to mark notifications as read', 'error');
    },
  });

  // Delete notification
  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.counts() });
    },
  });

  return {
    notifications,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    markAsRead: markReadMutation.mutate,
    markAllAsRead: markAllReadMutation.mutate,
    deleteNotification: deleteMutation.mutate,
    isMarkingRead: markReadMutation.isPending,
    isMarkingAllRead: markAllReadMutation.isPending,
  };
}

export function useUnreadNotifications(limit: number = 10) {
  return useQuery({
    queryKey: notificationKeys.unread(),
    queryFn: () => getUnreadNotifications(limit),
    refetchInterval: 60000, // Poll every minute
  });
}

export function useNotificationCounts() {
  return useQuery({
    queryKey: notificationKeys.counts(),
    queryFn: getNotificationCounts,
    refetchInterval: 60000, // Poll every minute
  });
}
```

---

### 9.8 Notification Handler Utility

**File:** `src/utils/notificationHandler.ts`

```typescript
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import type { PushNotificationData, NotificationTypeCode } from '@/types/notifications.types';

/**
 * Handle notification tap and navigate to appropriate screen
 */
export function handleNotificationNavigation(data: PushNotificationData): void {
  const { notification_type, action_url, event_id, quote_id, contract_id, invoice_id } = data;

  // If action_url provided, use it directly
  if (action_url) {
    try {
      // Parse the URL and navigate
      const path = new URL(action_url).pathname;
      router.push(path as any);
      return;
    } catch {
      // If URL parsing fails, fall through to type-based navigation
    }
  }

  // Navigate based on notification type
  switch (notification_type) {
    case 'quote_created':
    case 'quote_updated':
    case 'quote_expiring':
      if (quote_id) {
        router.push(`/quotes/${quote_id}`);
      } else {
        router.push('/actions');
      }
      break;

    case 'payment_due':
    case 'payment_reminder':
    case 'payment_received':
      if (invoice_id) {
        router.push(`/payments/${invoice_id}`);
      } else {
        router.push('/payments');
      }
      break;

    case 'contract_ready':
    case 'contract_signed':
      if (contract_id) {
        router.push(`/contracts/${contract_id}`);
      } else {
        router.push('/actions');
      }
      break;

    case 'event_update':
    case 'event_reminder':
      if (event_id) {
        router.push(`/events/${event_id}`);
      } else {
        router.push('/(tabs)/events');
      }
      break;

    case 'task_assigned':
    case 'task_reminder':
      if (event_id) {
        router.push(`/events/${event_id}?tab=tasks`);
      } else {
        router.push('/actions');
      }
      break;

    case 'message_received':
      // Navigate to messages (Phase 12)
      router.push('/messages' as any);
      break;

    default:
      // Default to action center
      router.push('/actions');
  }
}

/**
 * Get notification channel ID for Android based on type
 */
export function getChannelForNotificationType(
  type: NotificationTypeCode | undefined
): string {
  switch (type) {
    case 'payment_due':
    case 'payment_reminder':
    case 'payment_received':
      return 'payments';

    case 'event_update':
    case 'event_reminder':
      return 'events';

    case 'message_received':
      return 'messages';

    case 'contract_ready':
    case 'contract_signed':
      return 'contracts';

    default:
      return 'default';
  }
}

/**
 * Clear all delivered notifications
 */
export async function clearAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}

/**
 * Get the current badge count
 */
export async function getBadgeCount(): Promise<number> {
  return Notifications.getBadgeCountAsync();
}

/**
 * Update badge count based on unread count
 */
export async function updateBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear badge
 */
export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}
```

---

### 9.9 Root Layout Integration

**File:** `app/_layout.tsx` (Modify)

Add notification initialization and hook to the root layout:

```typescript
// Add imports
import { useNotifications } from '@/hooks/useNotifications';

// Inside RootLayout component, after other hooks:
function NotificationInitializer() {
  // Initialize push notifications
  useNotifications();
  return null;
}

// Add to provider hierarchy (inside AuthProvider):
<AuthProvider>
  <ToastProvider>
    <NotificationInitializer />
    {/* ... rest of layout */}
  </ToastProvider>
</AuthProvider>
```

---

### 9.10 Notification Preferences Screen

**File:** `app/settings/notifications.tsx`

Create the notification preferences screen with:
- Global push toggle
- Category-specific toggles (events, payments, contracts, tasks, messages)
- Marketing opt-in toggle
- Test notification button

**UI Components:**
- Section headers with dividers
- Toggle switches with icons
- Description text for each preference
- Pull-to-refresh for preference sync

**Reference:** DEVELOPMENT_GUIDE.md lines 8821-8967

---

### 9.11 Logout Cleanup Integration

**File:** `src/hooks/useAuth.ts` (Modify)

Add token unregistration to logout flow:

```typescript
const logout = async () => {
  try {
    // Get stored push token before clearing auth
    const pushToken = await SecureStore.getItemAsync('expo_push_token');

    // Unregister push token from backend
    if (pushToken) {
      try {
        await unregisterPushToken({ token: pushToken });
      } catch {
        // Continue with logout even if unregistration fails
      }
    }

    // Clear auth state
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    await SecureStore.deleteItemAsync('expo_push_token');

    // Clear badge
    await Notifications.setBadgeCountAsync(0);

    // Navigate to login
    router.replace('/(auth)/login');
  } catch (error) {
    console.error('Logout error:', error);
  }
};
```

---

### 9.12 Profile Screen Integration

**File:** `app/(tabs)/profile.tsx` (Modify)

Add navigation to notification preferences:

```typescript
// Add to settings section
<TouchableOpacity
  style={styles.settingRow}
  onPress={() => router.push('/settings/notifications')}
>
  <View style={styles.settingIcon}>
    <Bell size={24} color={colors.accent.lavender} />
  </View>
  <View style={styles.settingContent}>
    <Text style={styles.settingTitle}>Notifications</Text>
    <Text style={styles.settingDescription}>
      Manage push notification preferences
    </Text>
  </View>
  <CaretRight size={20} color={colors.neutral.gray} />
</TouchableOpacity>
```

---

### 9.13 App Configuration

**File:** `app.json` (Modify)

Add notification configuration:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#7C5CBF",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ],
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#7C5CBF",
      "iosDisplayInForeground": true,
      "androidMode": "default",
      "androidCollapsedTitle": "LifePlace"
    }
  }
}
```

---

## File Structure Summary

```
mobile-app/
├── src/
│   ├── types/
│   │   └── notifications.types.ts          # NEW
│   │
│   ├── apis/
│   │   └── notifications.api.ts            # NEW
│   │
│   ├── services/
│   │   └── notifications.ts                # NEW
│   │
│   ├── hooks/
│   │   ├── useNotifications.ts             # NEW
│   │   ├── useNotificationPreferences.ts   # NEW
│   │   └── useNotificationsList.ts         # NEW
│   │
│   └── utils/
│       └── notificationHandler.ts          # NEW
│
├── app/
│   ├── _layout.tsx                         # MODIFY - add notification init
│   └── settings/
│       └── notifications.tsx               # NEW
│
└── app.json                                # MODIFY - add notification config
```

---

## Testing Checklist

### 9.1 Permission Flow
- [ ] Request permissions on first launch (authenticated)
- [ ] Handle permission denied gracefully
- [ ] Show settings prompt if permissions denied

### 9.2 Token Registration
- [ ] Token registers successfully on login
- [ ] Token updates if changed
- [ ] Token unregisters on logout
- [ ] Multiple devices handled correctly

### 9.3 Notification Receipt
- [ ] Foreground notifications display correctly
- [ ] Background notifications work
- [ ] Notification tap navigates to correct screen
- [ ] Badge count updates

### 9.4 Preferences
- [ ] Preferences load correctly
- [ ] Toggle updates persist to backend
- [ ] Category toggles work independently
- [ ] Reset to defaults works

### 9.5 Test Notifications
- [ ] Test push from preferences screen works
- [ ] Test notification navigates correctly
- [ ] Test notification shows expected content

### 9.6 Notification Types
- [ ] Quote notifications → /quotes/[id]
- [ ] Payment notifications → /payments/[id]
- [ ] Contract notifications → /contracts/[id]
- [ ] Event notifications → /events/[id]
- [ ] Task notifications → /events/[id]?tab=tasks
- [ ] General notifications → /actions

---

## Security Considerations

1. **Token Storage:** Push tokens stored in `expo-secure-store`, not AsyncStorage
2. **Token Validation:** Backend validates Expo token format before storing
3. **User Isolation:** Users can only manage their own device tokens
4. **Logout Cleanup:** Tokens properly unregistered on logout to prevent stale notifications
5. **Preference Enforcement:** Backend enforces preferences before sending

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Permission denied | Show informative message, settings link |
| Token registration fails | Retry silently, log error |
| Notification tap with missing ID | Navigate to fallback (action center) |
| Preference update fails | Show error toast, revert UI |
| Test notification fails | Show error with retry option |

---

## Performance Considerations

1. **Badge Polling:** Poll counts every 60 seconds (not too aggressive)
2. **Notification List:** Use infinite scroll with 20-item pages
3. **Preference Caching:** 5-minute stale time for preferences
4. **Token Registration:** Only on auth state change, not on every mount

---

## Implementation Order

1. **Install dependencies** (9.1)
2. **Create types** (9.2)
3. **Create notification service** (9.3)
4. **Create API layer** (9.4)
5. **Create hooks** (9.5, 9.6, 9.7)
6. **Create utility functions** (9.8)
7. **Integrate with root layout** (9.9)
8. **Create preferences screen** (9.10)
9. **Integrate with logout** (9.11)
10. **Integrate with profile** (9.12)
11. **Update app.json** (9.13)
12. **Test all scenarios**

---

## Notes

- This implementation requires a **development build** (not Expo Go) for full push notification functionality
- Android notification channels are configured for proper categorization
- Deep linking is integrated via the existing `useDeepLinking` hook
- Backend already has full push notification infrastructure - no backend changes needed
