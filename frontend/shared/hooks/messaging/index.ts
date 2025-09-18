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

// Direct API hooks for context-aware filtering
export {
  useDirectThreads,
} from './useDirectThreads';

// Optimistic updates and mutations
export {
  useSendMessage,
  useMarkAsRead,
  useAdminActions,
  useRetryFailedMessage,
} from './useOptimisticUpdates';

// Archive/unarchive mutations with optimistic updates
export {
  useArchiveThread,
  useUnarchiveThread,
  useAssignThread,
  useSetThreadPriority,
  useResolveThread,
  useMessagingMutations,
} from './useMessagingMutations';

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