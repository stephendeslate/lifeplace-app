/**
 * Messaging Provider Hooks
 * 
 * Separated from the MessagingProvider component to ensure Vite Fast Refresh compatibility.
 * These hooks provide access to the messaging context.
 */

import { useContext } from 'react';

// Import the context from separate file
import { MessagingContext } from '../contexts/MessagingProviderContext';
import type { MessagingContextValue, MessagingState, MessagingActions, MessagingConfig } from '../providers/MessagingProvider';

/**
 * Hook to access messaging context
 */
export const useMessagingContext = (): MessagingContextValue => {
  const context = useContext(MessagingContext);
  
  if (!context) {
    throw new Error('useMessagingContext must be used within a MessagingProvider');
  }
  
  return context;
};

/**
 * Hook to access only messaging state (for read-only components)
 */
export const useMessagingState = (): MessagingState => {
  const { state } = useMessagingContext();
  return state;
};

/**
 * Hook to access only messaging actions
 */
export const useMessagingActions = (): MessagingActions => {
  const { actions } = useMessagingContext();
  return actions;
};

/**
 * Hook to access messaging configuration
 */
export const useMessagingConfig = (): MessagingConfig => {
  const { config } = useMessagingContext();
  return config;
};