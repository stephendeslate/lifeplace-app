# Phase 14: Performance & Offline Support - Implementation Plan

> **Phase Goal:** Optimize app performance with FlashList, React.memo, image caching, and implement comprehensive offline support with React Query persistence, mutation queuing, and error boundaries.

---

## Prerequisites Check

### Already Installed (from package.json)
- [x] `@shopify/flash-list` (2.0.2) - List virtualization
- [x] `@tanstack/react-query` (5.90.12) - Server state management
- [x] `expo-image` (3.0.11) - Image optimization with caching
- [x] `zustand` (5.0.9) - State management
- [x] `axios` (1.13.2) - HTTP client

### Dependencies to Install
```bash
# Offline support and persistence
npx expo install @react-native-async-storage/async-storage
npx expo install @react-native-community/netinfo
npm install @tanstack/react-query-persist-client @tanstack/query-async-storage-persister
```

---

## Implementation Tasks

### 14.1 Performance Optimization

#### 14.1.1 Replace FlatList with FlashList
**Files to Modify:**

| File | Current | Change |
|------|---------|--------|
| `app/(tabs)/events.tsx` | FlatList | FlashList with `estimatedItemSize` |
| `app/actions/index.tsx` | FlatList | FlashList with `estimatedItemSize` |
| `app/events/[id]/index.tsx` (tabs) | FlatList | FlashList where applicable |
| Any component using FlatList | FlatList | FlashList |

**Implementation Pattern:**
```typescript
import { FlashList } from '@shopify/flash-list';

// Replace:
<FlatList
  data={events}
  renderItem={({ item }) => <EventCard event={item} />}
  keyExtractor={(item) => item.id.toString()}
/>

// With:
<FlashList
  data={events}
  renderItem={({ item }) => <EventCard event={item} />}
  keyExtractor={(item) => item.id.toString()}
  estimatedItemSize={150} // Approximate card height in pixels
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={5}
/>
```

**Files to Create:**
- None (FlashList is already installed)

**Estimated Item Sizes by Component:**
| Component | Estimated Size |
|-----------|----------------|
| EventCard | 180 |
| ActionItemCard | 120 |
| InvoiceCard | 100 |
| ContractCard | 100 |
| QuoteLineItem | 80 |

---

#### 14.1.2 Implement React.memo Optimization
**Files to Modify:**

Wrap these components with `React.memo`:

| File | Component | Reason |
|------|-----------|--------|
| `src/components/events/EventCard.tsx` | EventCard | Rendered in lists |
| `src/components/actions/ActionItemCard.tsx` | ActionItemCard | Rendered in lists |
| `src/components/payments/InvoiceCard.tsx` | InvoiceCard | Rendered in lists |
| `src/components/contracts/ContractCard.tsx` | ContractCard | Rendered in lists |
| `src/components/quotes/QuoteLineItem.tsx` | QuoteLineItem | Rendered in lists |
| `src/components/dashboard/EventPreviewCard.tsx` | EventPreviewCard | Dashboard list item |
| `src/components/dashboard/ActionCard.tsx` | ActionCard | Dashboard list item |

**Implementation Pattern:**
```typescript
// Before:
export const EventCard = ({ event, onPress }: EventCardProps) => {
  // component implementation
};

// After:
import { memo } from 'react';

const EventCardComponent = ({ event, onPress }: EventCardProps) => {
  // component implementation
};

export const EventCard = memo(EventCardComponent);
```

**Hooks to Optimize with useCallback/useMemo:**

| File | Hook/Function | Optimization |
|------|---------------|--------------|
| `app/(tabs)/events.tsx` | filter callbacks | `useCallback` |
| `app/(tabs)/index.tsx` | navigation handlers | `useCallback` |
| `app/actions/index.tsx` | filter/sort functions | `useMemo` |
| `src/hooks/useEvents.ts` | filtered data | `useMemo` in consumers |

---

#### 14.1.3 Add Image Caching & Optimization
**Files to Audit/Modify:**

Ensure all image components use `expo-image` with proper caching:

```typescript
import { Image } from 'expo-image';

<Image
  source={{ uri: imageUrl }}
  placeholder={blurhash} // Optional blurhash
  contentFit="cover"
  transition={300}
  cachePolicy="memory-disk" // Enable disk caching
  style={{ width: '100%', aspectRatio: 4 / 3 }}
/>
```

**Files to Create:**
- `src/utils/imagePreloader.ts` - Image preloading utility

```typescript
// src/utils/imagePreloader.ts
import { Image } from 'expo-image';

/**
 * Preload critical images for faster display
 */
export const preloadImages = async (urls: string[]): Promise<void> => {
  await Promise.all(
    urls.filter(Boolean).map(url => Image.prefetch(url))
  );
};

/**
 * Preload event images when viewing events list
 */
export const preloadEventImages = async (events: Array<{ featured_image?: string }>) => {
  const urls = events
    .map(e => e.featured_image)
    .filter((url): url is string => Boolean(url));
  await preloadImages(urls);
};
```

---

#### 14.1.4 Profile and Optimize
**Actions:**
1. Enable React DevTools profiler in development
2. Identify components with unnecessary re-renders
3. Use `why-did-you-render` in development (optional)

**Add to development workflow:**
```bash
# Enable performance monitoring
EXPO_DEBUG=1 npx expo start
```

---

### 14.2 Offline Support

#### 14.2.1 Configure React Query Persistence
**Files to Create:**

**`src/utils/queryPersister.ts`**
```typescript
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'LIFEPLACE_QUERY_CACHE',
});

/**
 * Query keys that should be persisted for offline access
 */
export const PERSISTABLE_QUERY_KEYS = [
  'events',
  'dashboard',
  'venues',
  'packages',
  'contracts',
  'invoices',
  'quotes',
] as const;

/**
 * Determine if a query should be persisted
 */
export const shouldPersistQuery = (queryKey: unknown[]): boolean => {
  const rootKey = queryKey[0]?.toString();
  return PERSISTABLE_QUERY_KEYS.some(key => rootKey?.includes(key));
};
```

**Files to Modify:**

**`app/_layout.tsx`** - Wrap with PersistQueryClientProvider:
```typescript
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { asyncStoragePersister, shouldPersistQuery } from '@/utils/queryPersister';

// Replace QueryClientProvider with:
<PersistQueryClientProvider
  client={queryClient}
  persistOptions={{
    persister: asyncStoragePersister,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => {
        return (
          query.state.status === 'success' &&
          shouldPersistQuery(query.queryKey)
        );
      },
    },
  }}
>
  {/* existing providers */}
</PersistQueryClientProvider>
```

---

#### 14.2.2 Cache Critical Data
**Files to Create:**

**`src/utils/offlineStorage.ts`**
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@lifeplace_cache_';
const DEFAULT_EXPIRY = 1000 * 60 * 60 * 24; // 24 hours

interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export const offlineStorage = {
  /**
   * Store data with expiration
   */
  set: async <T>(key: string, data: T, expiryMs = DEFAULT_EXPIRY): Promise<void> => {
    const cached: CachedData<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + expiryMs,
    };
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cached));
  },

  /**
   * Retrieve cached data if not expired
   */
  get: async <T>(key: string): Promise<T | null> => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;

      const cached: CachedData<T> = JSON.parse(raw);

      if (Date.now() > cached.expiresAt) {
        await AsyncStorage.removeItem(CACHE_PREFIX + key);
        return null;
      }

      return cached.data;
    } catch {
      return null;
    }
  },

  /**
   * Remove specific cache entry
   */
  remove: async (key: string): Promise<void> => {
    await AsyncStorage.removeItem(CACHE_PREFIX + key);
  },

  /**
   * Clear all cached data
   */
  clearAll: async (): Promise<void> => {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
  },

  /**
   * Get cache metadata (for debugging)
   */
  getCacheInfo: async (): Promise<{ key: string; size: number; expiresAt: Date }[]> => {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));

    const info = await Promise.all(
      cacheKeys.map(async (key) => {
        const raw = await AsyncStorage.getItem(key);
        return {
          key: key.replace(CACHE_PREFIX, ''),
          size: raw?.length || 0,
          expiresAt: raw ? new Date(JSON.parse(raw).expiresAt) : new Date(),
        };
      })
    );

    return info;
  },
};
```

---

#### 14.2.3 Show Offline Indicator
**Files to Create:**

**`src/hooks/useNetworkState.ts`**
```typescript
import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
  isOffline: boolean;
}

export function useNetworkState(): NetworkState {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: true,
    isInternetReachable: true,
    type: 'unknown',
    isOffline: false,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const isOffline = !state.isConnected || state.isInternetReachable === false;
      setNetworkState({
        isConnected: state.isConnected ?? true,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        isOffline,
      });
    });

    return () => unsubscribe();
  }, []);

  return networkState;
}
```

**`src/components/common/OfflineBanner.tsx`**
```typescript
import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { WifiSlash } from 'phosphor-react-native';

import { useNetworkState } from '@/hooks/useNetworkState';
import { colors, spacing, typeScale } from '@/theme';

export const OfflineBanner = () => {
  const { isOffline } = useNetworkState();

  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <WifiSlash size={20} color={colors.neutral.white} />
      <Text style={styles.text}>
        You're offline. Some features may be unavailable.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.semantic.warning,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  text: {
    ...typeScale.labelMedium,
    color: colors.neutral.white,
  },
});
```

**Files to Modify:**

**`app/_layout.tsx`** - Add OfflineBanner to layout:
```typescript
import { OfflineBanner } from '@/components/common/OfflineBanner';

// Inside the Stack component, before children:
<OfflineBanner />
<Stack>
  {/* screens */}
</Stack>
```

---

#### 14.2.4 Queue Mutations for Retry
**Files to Create:**

**`src/utils/offlineMutationQueue.ts`**
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AxiosInstance } from 'axios';

interface QueuedMutation {
  id: string;
  endpoint: string;
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  data: unknown;
  timestamp: number;
  retryCount: number;
}

const QUEUE_KEY = '@lifeplace_mutation_queue';
const MAX_RETRIES = 3;

export const offlineMutationQueue = {
  /**
   * Add mutation to offline queue
   */
  enqueue: async (mutation: Omit<QueuedMutation, 'id' | 'timestamp' | 'retryCount'>): Promise<string> => {
    const queue = await offlineMutationQueue.getQueue();
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const newMutation: QueuedMutation = {
      ...mutation,
      id,
      timestamp: Date.now(),
      retryCount: 0,
    };

    queue.push(newMutation);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

    return id;
  },

  /**
   * Get all queued mutations
   */
  getQueue: async (): Promise<QueuedMutation[]> => {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /**
   * Get queue length
   */
  getQueueLength: async (): Promise<number> => {
    const queue = await offlineMutationQueue.getQueue();
    return queue.length;
  },

  /**
   * Process queued mutations when back online
   */
  processQueue: async (api: AxiosInstance): Promise<{ processed: number; failed: number }> => {
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      return { processed: 0, failed: 0 };
    }

    const queue = await offlineMutationQueue.getQueue();
    if (queue.length === 0) {
      return { processed: 0, failed: 0 };
    }

    const processed: string[] = [];
    const failed: string[] = [];

    for (const mutation of queue) {
      try {
        await api.request({
          url: mutation.endpoint,
          method: mutation.method,
          data: mutation.data,
        });
        processed.push(mutation.id);
      } catch (error) {
        console.error('Failed to process queued mutation:', mutation.id, error);

        if (mutation.retryCount >= MAX_RETRIES) {
          failed.push(mutation.id);
        }
      }
    }

    // Remove processed and failed mutations, increment retry count for others
    const remaining = queue
      .filter(m => !processed.includes(m.id) && !failed.includes(m.id))
      .map(m => ({ ...m, retryCount: m.retryCount + 1 }));

    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));

    return { processed: processed.length, failed: failed.length };
  },

  /**
   * Clear the entire queue
   */
  clearQueue: async (): Promise<void> => {
    await AsyncStorage.removeItem(QUEUE_KEY);
  },

  /**
   * Remove specific mutation from queue
   */
  removeMutation: async (id: string): Promise<void> => {
    const queue = await offlineMutationQueue.getQueue();
    const filtered = queue.filter(m => m.id !== id);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  },
};
```

**`src/hooks/useOfflineMutations.ts`**
```typescript
import { useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useNetworkState } from './useNetworkState';
import { offlineMutationQueue } from '@/utils/offlineMutationQueue';
import { api } from '@/utils/api';
import { useToast } from '@/contexts/ToastContext';

/**
 * Hook to automatically process offline mutations when coming back online
 */
export function useOfflineMutations() {
  const { isOffline, isConnected } = useNetworkState();
  const { showToast } = useToast();

  const processQueue = useCallback(async () => {
    const queueLength = await offlineMutationQueue.getQueueLength();

    if (queueLength === 0) return;

    const result = await offlineMutationQueue.processQueue(api);

    if (result.processed > 0) {
      showToast({
        type: 'success',
        message: `${result.processed} pending action${result.processed > 1 ? 's' : ''} synced`,
      });
    }

    if (result.failed > 0) {
      showToast({
        type: 'error',
        message: `${result.failed} action${result.failed > 1 ? 's' : ''} failed to sync`,
      });
    }
  }, [showToast]);

  // Process queue when coming back online
  useEffect(() => {
    if (isConnected && !isOffline) {
      processQueue();
    }
  }, [isConnected, isOffline, processQueue]);

  // Process queue when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        processQueue();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [processQueue]);

  return {
    processQueue,
    enqueue: offlineMutationQueue.enqueue,
    getQueueLength: offlineMutationQueue.getQueueLength,
  };
}
```

---

### 14.3 Error Boundaries

#### 14.3.1 Create ErrorBoundary Component
**Files to Create:**

**`src/components/common/ErrorBoundary.tsx`**
```typescript
import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WarningCircle, ArrowClockwise, House } from 'phosphor-react-native';
import { router } from 'expo-router';

import { colors, spacing, typeScale } from '@/theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error reporting service (e.g., Sentry, Crashlytics)
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // TODO: Send to error tracking service
    // Sentry.captureException(error, { extra: errorInfo });

    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    router.replace('/(tabs)');
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <WarningCircle size={64} color={colors.semantic.error} weight="light" />
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            We're sorry, but something unexpected happened. Please try again.
          </Text>

          {__DEV__ && this.state.error && (
            <View style={styles.errorDetails}>
              <Text style={styles.errorText}>
                {this.state.error.message}
              </Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
              <ArrowClockwise size={20} color={colors.neutral.white} />
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={this.handleGoHome}
            >
              <House size={20} color={colors.primary.charcoal} />
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                Go Home
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.neutral.cream,
  },
  title: {
    ...typeScale.headlineSmall,
    color: colors.primary.charcoal,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  message: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  errorDetails: {
    backgroundColor: colors.semantic.errorSubtle,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.xl,
    maxWidth: '100%',
  },
  errorText: {
    ...typeScale.labelSmall,
    color: colors.semantic.error,
    fontFamily: 'monospace',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.charcoal,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    gap: spacing.sm,
  },
  secondaryButton: {
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.lightGray,
  },
  buttonText: {
    ...typeScale.labelLarge,
    color: colors.neutral.white,
  },
  secondaryButtonText: {
    color: colors.primary.charcoal,
  },
});
```

**`src/components/common/ErrorFallback.tsx`**
```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WarningCircle, ArrowClockwise } from 'phosphor-react-native';

import { colors, spacing, typeScale } from '@/theme';

interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  title?: string;
  message?: string;
}

/**
 * Lightweight error fallback component for inline error states
 */
export const ErrorFallback = ({
  error,
  resetError,
  title = 'Failed to load',
  message = 'Something went wrong. Please try again.',
}: ErrorFallbackProps) => {
  return (
    <View style={styles.container}>
      <WarningCircle size={48} color={colors.semantic.error} weight="light" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {resetError && (
        <TouchableOpacity style={styles.button} onPress={resetError}>
          <ArrowClockwise size={16} color={colors.accent.lavender} />
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  title: {
    ...typeScale.titleMedium,
    color: colors.primary.charcoal,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  message: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  buttonText: {
    ...typeScale.labelMedium,
    color: colors.accent.lavender,
  },
});
```

---

#### 14.3.2 Wrap Screens with Boundaries
**Files to Modify:**

**`app/_layout.tsx`** - Wrap root with ErrorBoundary:
```typescript
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

// Wrap the entire app
<ErrorBoundary
  onError={(error, errorInfo) => {
    // Send to error tracking service
    console.error('Root ErrorBoundary:', error);
  }}
>
  <GestureHandlerRootView style={{ flex: 1 }}>
    {/* ... existing providers and Stack */}
  </GestureHandlerRootView>
</ErrorBoundary>
```

**Individual Screen Wrapping (Optional but Recommended):**
For screens that might fail independently, wrap them in their own error boundary to prevent full app crashes.

---

#### 14.3.3 Add Crash Reporting Setup
**Files to Create:**

**`src/utils/crashReporting.ts`**
```typescript
/**
 * Crash Reporting Setup
 *
 * TODO: Implement with your preferred service:
 * - Sentry: npm install @sentry/react-native
 * - Firebase Crashlytics: included in expo-firebase-analytics
 * - Bugsnag: npm install @bugsnag/react-native
 */

interface CrashReporter {
  initialize: () => void;
  captureException: (error: Error, context?: Record<string, unknown>) => void;
  setUser: (userId: string | null) => void;
  addBreadcrumb: (message: string, category?: string) => void;
}

// Placeholder implementation - replace with actual crash reporting service
export const crashReporter: CrashReporter = {
  initialize: () => {
    if (__DEV__) {
      console.log('[CrashReporter] Initialized in development mode');
    }
    // TODO: Initialize Sentry/Crashlytics/Bugsnag
  },

  captureException: (error: Error, context?: Record<string, unknown>) => {
    console.error('[CrashReporter] Exception:', error, context);
    // TODO: Send to crash reporting service
  },

  setUser: (userId: string | null) => {
    console.log('[CrashReporter] User set:', userId);
    // TODO: Set user context in crash reporting service
  },

  addBreadcrumb: (message: string, category = 'app') => {
    console.log(`[CrashReporter] Breadcrumb [${category}]:`, message);
    // TODO: Add breadcrumb to crash reporting service
  },
};
```

---

### 14.4 Update queryClient Configuration
**Files to Modify:**

**`src/utils/queryClient.ts`** - Enhanced with error handling and offline support:
```typescript
import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { parseApiError, isAuthError, isNetworkError } from './errorHandler';
import { useAuthStore } from '@/stores/authStore';
import { crashReporter } from './crashReporting';

// Global error handler
const onQueryError = (error: unknown) => {
  const apiError = parseApiError(error);

  // Handle auth errors globally
  if (isAuthError(error)) {
    useAuthStore.getState().clearAuth();
    return;
  }

  // Log network errors
  if (isNetworkError(error)) {
    console.warn('Network error:', apiError.message);
  }

  // Report non-network errors
  if (!isNetworkError(error) && error instanceof Error) {
    crashReporter.captureException(error, { type: 'query' });
  }
};

const onMutationError = (error: unknown) => {
  const apiError = parseApiError(error);
  console.error('Mutation error:', apiError.message);

  if (!isNetworkError(error) && error instanceof Error) {
    crashReporter.captureException(error, { type: 'mutation' });
  }
};

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: onQueryError,
  }),
  mutationCache: new MutationCache({
    onError: onMutationError,
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: (failureCount, error) => {
        // Don't retry on auth errors
        if (isAuthError(error)) return false;

        // Don't retry on 4xx errors (except timeout/rate limit)
        if (error instanceof AxiosError) {
          const status = error.response?.status;
          if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
            return false;
          }
        }

        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      networkMode: 'offlineFirst', // Use cached data when offline
    },
    mutations: {
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
});
```

---

## File Creation Summary

### New Files to Create (12 files)

| File | Purpose |
|------|---------|
| `src/utils/queryPersister.ts` | React Query persistence configuration |
| `src/utils/offlineStorage.ts` | Generic offline caching utility |
| `src/utils/offlineMutationQueue.ts` | Queue mutations when offline |
| `src/utils/imagePreloader.ts` | Image preloading utilities |
| `src/utils/crashReporting.ts` | Crash reporting setup |
| `src/hooks/useNetworkState.ts` | Network connectivity hook |
| `src/hooks/useOfflineMutations.ts` | Auto-process offline mutations |
| `src/components/common/OfflineBanner.tsx` | Offline indicator banner |
| `src/components/common/ErrorBoundary.tsx` | Error boundary component |
| `src/components/common/ErrorFallback.tsx` | Inline error fallback |
| `src/components/common/index.ts` | Export new components |

### Files to Modify (10+ files)

| File | Changes |
|------|---------|
| `app/_layout.tsx` | Add PersistQueryClientProvider, OfflineBanner, ErrorBoundary |
| `src/utils/queryClient.ts` | Enhanced error handling, offline mode |
| `app/(tabs)/events.tsx` | Replace FlatList with FlashList |
| `app/actions/index.tsx` | Replace FlatList with FlashList |
| `src/components/events/EventCard.tsx` | Wrap with React.memo |
| `src/components/actions/ActionItemCard.tsx` | Wrap with React.memo |
| `src/components/payments/InvoiceCard.tsx` | Wrap with React.memo |
| `src/components/contracts/ContractCard.tsx` | Wrap with React.memo |
| `src/components/dashboard/EventPreviewCard.tsx` | Wrap with React.memo |
| `src/components/dashboard/ActionCard.tsx` | Wrap with React.memo |

---

## Implementation Order

### Step 1: Install Dependencies
```bash
cd mobile-app
npx expo install @react-native-async-storage/async-storage @react-native-community/netinfo
npm install @tanstack/react-query-persist-client @tanstack/query-async-storage-persister
```

### Step 2: Core Utilities (Foundation)
1. Create `src/utils/offlineStorage.ts`
2. Create `src/utils/queryPersister.ts`
3. Create `src/hooks/useNetworkState.ts`
4. Update `src/utils/queryClient.ts`

### Step 3: Error Handling
1. Create `src/utils/crashReporting.ts`
2. Create `src/components/common/ErrorBoundary.tsx`
3. Create `src/components/common/ErrorFallback.tsx`
4. Update `app/_layout.tsx` with ErrorBoundary

### Step 4: Offline Support
1. Create `src/components/common/OfflineBanner.tsx`
2. Create `src/utils/offlineMutationQueue.ts`
3. Create `src/hooks/useOfflineMutations.ts`
4. Update `app/_layout.tsx` with PersistQueryClientProvider and OfflineBanner

### Step 5: Performance Optimization
1. Create `src/utils/imagePreloader.ts`
2. Replace FlatList with FlashList in list screens
3. Wrap list item components with React.memo
4. Add useCallback/useMemo optimizations

### Step 6: Testing & Verification
1. Test offline behavior (airplane mode)
2. Verify cached data persists across app restarts
3. Test error boundary catches crashes
4. Profile performance improvements

---

## Verification Checklist

### Performance
- [ ] Events list scrolls smoothly (60 FPS)
- [ ] Images load from cache on repeat visits
- [ ] No unnecessary re-renders in profiler
- [ ] Bundle size unchanged or reduced

### Offline Support
- [ ] App loads with cached data when offline
- [ ] Offline banner appears when disconnected
- [ ] Mutations queue when offline
- [ ] Queued mutations sync when back online
- [ ] Cache persists across app restarts

### Error Handling
- [ ] ErrorBoundary catches component errors
- [ ] App doesn't crash on API errors
- [ ] Retry buttons work correctly
- [ ] Errors logged (in dev: console, prod: crash service)

---

## Dependencies Summary

```json
{
  "dependencies": {
    "@react-native-async-storage/async-storage": "^1.x",
    "@react-native-community/netinfo": "^11.x",
    "@tanstack/react-query-persist-client": "^5.x",
    "@tanstack/query-async-storage-persister": "^5.x"
  }
}
```

---

## References

- [DEVELOPMENT_GUIDE.md Section 16](DEVELOPMENT_GUIDE.md) - Performance Optimization
- [DEVELOPMENT_GUIDE.md Section 18](DEVELOPMENT_GUIDE.md) - Offline and Edge Case Support
- [DEVELOPMENT_GUIDE.md Section 15](DEVELOPMENT_GUIDE.md) - Error Handling
- [TESTING_STRATEGY.md](../docs/testing/TESTING_STRATEGY.md) - Testing approach
- [FlashList Documentation](https://shopify.github.io/flash-list/)
- [TanStack Query Persistence](https://tanstack.com/query/latest/docs/react/plugins/persistQueryClient)
