/**
 * ConversationThread - Placeholder component for conversation thread
 */

import React from 'react';
import { Box } from '@mui/material';

export interface ConversationThreadProps {
  threadId?: string;
  messages?: any[];
  onMessageClick?: (messageId: string) => void;
  // Additional props used in MessageInterface
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  onMarkAsRead?: (messageId?: string) => Promise<void>;
  userRole?: 'CLIENT' | 'ADMIN';
  enableVirtualization?: boolean;
}

export const ConversationThread: React.FC<ConversationThreadProps> = ({
  threadId
}) => {
  return (
    <Box>
      <div>Conversation Thread Placeholder - {threadId}</div>
    </Box>
  );
};

export default ConversationThread;