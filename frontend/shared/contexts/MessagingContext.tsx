/**
 * Messaging Context Bridge
 * 
 * This file re-exports the MessagingProvider from the providers directory
 * to maintain compatibility with existing imports.
 */

export { 
  MessagingProvider,
  useMessagingContext,
  useMessagingState,
  useMessagingActions,
  useMessagingConfig,
  DEFAULT_MESSAGING_CONFIG
} from '../providers/MessagingProvider';

export type {
  MessagingState,
  MessagingActions,
  MessagingContextValue
} from '../providers/MessagingProvider';
export type {
  MessagingConfig
} from '../types/messaging.types';