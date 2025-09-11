/**
 * Messaging Components Export Index
 * Centralizes all messaging component exports for easier importing
 */

// Main components
export { MessageInterface, type MessageInterfaceProps } from './MessageInterface';
export { default as ConversationThread } from './ConversationThread';
export { default as MessageComposer } from './MessageComposer';
export { default as ThreadList } from './ThreadList';
export { default as RealTimeIndicators } from './RealTimeIndicators';
export { default as ConnectionStatus } from './ConnectionStatus';
export { default as MessageRoutes } from './MessageRoutes';

// Performance components
export { VirtualMessageList, type VirtualMessageListRef } from './performance/VirtualMessageList';

// Real-time components
export { TypingIndicator } from './realtime/TypingIndicator';
export { ReadReceipts } from './realtime/ReadReceipts';
export { PresenceIndicator } from './realtime/PresenceIndicator';

// Re-export all components as default exports too for backward compatibility
import MessageInterfaceDefault from './MessageInterface';
import VirtualMessageListDefault from './performance/VirtualMessageList';
import TypingIndicatorDefault from './realtime/TypingIndicator';
import ReadReceiptsDefault from './realtime/ReadReceipts';
import PresenceIndicatorDefault from './realtime/PresenceIndicator';

export {
  MessageInterfaceDefault,
  VirtualMessageListDefault,
  TypingIndicatorDefault,
  ReadReceiptsDefault,
  PresenceIndicatorDefault
};