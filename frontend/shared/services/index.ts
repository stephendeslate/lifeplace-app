/**
 * Shared Services Module
 * 
 * Exports all shared services and utilities for both admin-crm and client-portal applications
 */

// WebSocket Services
export {
  webSocketManager,
  MessagingWebSocketService,
  type WebSocketConnectionState,
  type WebSocketEventType,
  type WebSocketEvent,
  type ConnectionMetrics,
  type WebSocketConfig
} from './websocket.service';

// WebSocket Context
export {
  WebSocketProvider,
  useWebSocket,
  useWebSocketConnectionState,
  useWebSocketMetrics,
  type WebSocketContextState
} from './websocket.context';

// API Services
export {
  messagingAPI,
  MessagingAPIService,
  type UploadProgressCallback
} from './messaging.api';

// React Query Hooks
export {
  // Query hooks
  useThreads,
  useInfiniteThreads,
  useThread,
  useThreadStats,
  useThreadMessages,
  useMessage,
  useSearchMessages,
  useSearchThreads,
  
  // Mutation hooks
  useCreateThread,
  useUpdateThread,
  useSendMessage,
  useUpdateMessage,
  useDeleteMessage,
  useMarkMessageRead,
  useMarkThreadRead,
  useUploadFile,
  useAdminAction,
  
  // Cache management
  useInvalidateMessaging,
  useAddMessageToCache,
  useUpdateThreadInCache,
  
  // Query keys
  messagingKeys
} from './messaging.queries';

// Comprehensive Messaging Hooks
export {
  // Main messaging hook
  useMessaging,
  type MessagingState,
  type MessagingActions,
  type UseMessagingOptions,
  type UseMessagingReturn,
  
  // Real-time updates hook
  useRealTimeUpdates,
  type RealTimeState,
  type UseRealTimeUpdatesOptions,
  type UseRealTimeUpdatesReturn,
  
  // Message operations hook
  useMessageOperations,
  type MessageDraft,
  type MessageOperation,
  type MessageValidation,
  type UseMessageOperationsOptions,
  type UseMessageOperationsReturn,
  
  // Thread management hook
  useThreadManagement,
  type ThreadManagementState,
  type ThreadManagementActions,
  type UseThreadManagementOptions,
  type UseThreadManagementReturn
} from '../hooks';

// Re-export messaging types for convenience
export type {
  MessageThread,
  Message,
  MessageAttachment,
  MessageComposition,
  SendMessageRequest,
  SendMessageResponse,
  CreateMessageData,
  ThreadFilters,
  MessageFilters,
  TypingIndicator,
  MessageReadReceipt,
  WSMessage,
  ThreadStats,
  QuickAction,
  CannedResponse,
  AdminMessageAction,
  PaginatedApiResponse,
  PaginatedThreadsResponse,
  PaginatedMessagesResponse
} from '../types/messaging.types';