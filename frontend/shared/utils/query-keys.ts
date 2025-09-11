// React Query key factory for shared queries
export const queryKeys = {
  // Auth keys
  auth: {
    user: () => ['auth', 'user'] as const,
    permissions: (userId: string) => ['auth', 'permissions', userId] as const,
  },

  // Messaging keys
  messaging: {
    all: () => ['messaging'] as const,
    threads: () => [...queryKeys.messaging.all(), 'threads'] as const,
    thread: (threadId: string) => [...queryKeys.messaging.threads(), threadId] as const,
    messages: (threadId: string) => [...queryKeys.messaging.thread(threadId), 'messages'] as const,
    unreadCount: () => [...queryKeys.messaging.all(), 'unreadCount'] as const,
  },

  // WebSocket keys
  websocket: {
    connection: () => ['websocket', 'connection'] as const,
    metrics: () => ['websocket', 'metrics'] as const,
  }
} as const;

// Helper function to invalidate query patterns
export const createInvalidationPattern = (pattern: readonly string[]) => ({
  queryKey: pattern
});