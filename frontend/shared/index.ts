// Main export file for shared messaging system
// Provides a single entry point for both applications

// Context exports
export {
  WebSocketProvider,
  useWebSocket,
  useWebSocketConnectionState,
} from './services/websocket.context';

export { MessagingProvider } from './providers/MessagingProvider';
export {
  useMessagingContext,
  useMessagingActions,
  useMessagingState,
  useMessagingConfig,
} from './hooks/useMessagingProvider';

// Hook exports
export * from './hooks/messaging';

// API exports
export { 
  messagingApi,
  setApiClient,
} from './apis/messaging.api';

// Query keys
export { messagingKeys } from './queries/messagingKeys';

// Type exports
export * from './types/messaging.types';

// Configuration exports
export {
  DEFAULT_MESSAGING_CONFIG,
  createMessagingConfig,
  createWebSocketConfig,
} from './configs/messaging.config';