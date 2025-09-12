/**
 * Messaging Context Definition
 * 
 * Separated from MessagingProvider component to ensure proper module structure
 * and to avoid Fast Refresh incompatibility issues.
 */

import { createContext } from 'react';
import type { MessagingContextValue } from '../providers/MessagingProvider';

export const MessagingContext = createContext<MessagingContextValue | null>(null);