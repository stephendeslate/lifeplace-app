/**
 * Shared Messaging Hooks
 * 
 * Comprehensive React hooks for messaging functionality
 * across both admin-crm and client-portal applications
 */

// Main messaging hook
export {
  useMessaging,
  type MessagingState,
  type MessagingActions,
  type UseMessagingOptions,
  type UseMessagingReturn
} from './useMessaging';

// Real-time updates hook
export {
  useRealTimeUpdates,
  type RealTimeState,
  type UseRealTimeUpdatesOptions,
  type UseRealTimeUpdatesReturn
} from './useRealTimeUpdates';

// Message operations hook
export {
  useMessageOperations,
  type MessageDraft,
  type MessageOperation,
  type MessageValidation,
  type UseMessageOperationsOptions,
  type UseMessageOperationsReturn
} from './useMessageOperations';

// Thread management hook
export {
  useThreadManagement,
  type ThreadManagementState,
  type ThreadManagementActions,
  type UseThreadManagementOptions,
  type UseThreadManagementReturn
} from './useThreadManagement';