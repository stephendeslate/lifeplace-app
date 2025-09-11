// Centralized exports for all messaging hooks and utilities
// Provides a clean API for both admin-crm and client-portal applications

// Core React Query hooks
export {
  useThreads,
  useThread,
  useThreadStats,
  useMessages,
  useUnreadCounts,
  useThreadCounts,
  useCannedResponses,
  useMessagingAnalytics,
  useMultipleThreads,
  usePrefetchThread,
  useCacheUtils,
} from './useMessagingQueries';

// Optimistic updates and mutations
export {
  useSendMessage,
  useMarkAsRead,
  useAdminActions,
  useRetryFailedMessage,
} from './useOptimisticUpdates';

// Real-time synchronization
export {
  useRealtimeSync,
} from './useRealtimeSync';

// Draft persistence
export {
  useMessageDrafts,
} from './useMessageDrafts';

// Re-export types for convenience
export type {
  MessageThread,
  Message,
  MessageAttachment,
  ThreadFilters,
  MessageFilters,
  TypingIndicator,
  SendMessageRequest,
  CreateMessageData,
  CannedResponse,
  ThreadStats,
  QuickAction,
  AdminMessageAction,
  WSMessage,
} from '../../types/messaging.types';