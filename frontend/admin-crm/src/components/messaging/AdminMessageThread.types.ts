/**
 * AdminMessageThread Props Interface
 *
 * This interface defines the props that AdminMessageThread will receive
 * instead of calling useMessagingContext() directly.
 * Based on client-portal pattern but extended for admin-specific features.
 */

import type { Message, MessageThread, MessagingConfig } from '@shared/types/messaging.types';

export interface AdminMessageThreadProps {
  // Thread identification
  threadId: string;

  // Optional display props
  clientId?: string;
  eventId?: string;
  showContext?: boolean;
  enableInternalNotes?: boolean;
  className?: string;

  // Messaging state passed as props (instead of context)
  currentThread: MessageThread | undefined;
  messages: Message[];
  isConnected: boolean;
  isLoadingMessages: boolean;
  hasMoreMessages: boolean;
  typingUsers: Array<{ user_id: number; user_name: string }>;
  config: MessagingConfig;
  isTyping: boolean;

  // Messaging actions passed as props (instead of context)
  onSendMessage: (content: string, attachments: File[], isInternalNote: boolean) => Promise<void>;
  onMarkAsRead: (messageId: string) => Promise<void>;
  onLoadMoreMessages: () => Promise<void>;
  onStartTyping: () => void;
  onStopTyping: () => void;
}