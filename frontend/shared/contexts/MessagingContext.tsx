/**
 * Messaging Context Bridge
 * 
 * This file re-exports the MessagingProvider from the providers directory
 * to maintain compatibility with existing imports.
 */

export { MessagingProvider } from '../providers/MessagingProvider';
export {
  useMessagingContext,
  useMessagingState,
  useMessagingActions,
  useMessagingConfig,
} from '../hooks/useMessagingProvider';

export { DEFAULT_MESSAGING_CONFIG } from '../configs/messaging.config';

export type {
  MessagingState,
  MessagingActions,
  MessagingContextValue
} from '../providers/MessagingProvider';
export type {
  MessagingConfig
} from '../types/messaging.types';