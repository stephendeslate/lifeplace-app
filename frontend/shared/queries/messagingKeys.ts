// Comprehensive query keys for messaging system
// Follows existing patterns and TanStack Query best practices

export const messagingKeys = {
  // Root key for all messaging-related queries
  all: ['messaging'] as const,
  
  // Thread-related queries
  threads: () => [...messagingKeys.all, 'threads'] as const,
  threadsWithFilters: (filters?: Record<string, unknown>) => 
    [...messagingKeys.threads(), { filters }] as const,
  thread: (id: string) => [...messagingKeys.threads(), id] as const,
  threadStats: (id: string) => [...messagingKeys.thread(id), 'stats'] as const,
  
  // Message-related queries
  messages: (threadId: string) => [...messagingKeys.thread(threadId), 'messages'] as const,
  messagesWithFilters: (threadId: string, filters?: Record<string, unknown>) =>
    [...messagingKeys.messages(threadId), { filters }] as const,
  message: (threadId: string, messageId: string) => 
    [...messagingKeys.messages(threadId), messageId] as const,
  
  // Count and status queries
  unreadCounts: () => [...messagingKeys.all, 'unread-counts'] as const,
  threadCounts: () => [...messagingKeys.all, 'thread-counts'] as const,
  
  // Admin-specific queries
  admin: {
    base: () => [...messagingKeys.all, 'admin'] as const,
    assignments: () => [...messagingKeys.admin.base(), 'assignments'] as const,
    cannedResponses: () => [...messagingKeys.admin.base(), 'canned-responses'] as const,
    analytics: () => [...messagingKeys.admin.base(), 'analytics'] as const,
    bulkActions: () => [...messagingKeys.admin.base(), 'bulk-actions'] as const,
  },
  
  // Real-time connection status
  connection: () => [...messagingKeys.all, 'connection'] as const,
  
  // File upload and attachment queries
  attachments: (threadId: string) => [...messagingKeys.thread(threadId), 'attachments'] as const,
  fileUpload: (uploadId: string) => [...messagingKeys.all, 'file-upload', uploadId] as const,
} as const;

// Type exports for better TypeScript support
export type MessagingKeys = typeof messagingKeys;
export type ThreadKey = ReturnType<typeof messagingKeys.thread>;
export type MessagesKey = ReturnType<typeof messagingKeys.messages>;