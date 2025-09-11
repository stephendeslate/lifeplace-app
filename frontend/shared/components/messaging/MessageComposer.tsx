/**
 * MessageComposer - Placeholder component for message composer
 */

import React from 'react';
import { Box } from '@mui/material';

export interface MessageComposerProps {
  threadId?: string;
  onSendMessage?: (content: string, attachments?: File[]) => void;
  placeholder?: string;
  disabled?: boolean;
  // Additional props used in MessageInterface
  onStartTyping?: () => void;
  onStopTyping?: () => void;
  isTyping?: boolean;
  enableFileUploads?: boolean;
  userRole?: 'CLIENT' | 'ADMIN';
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  threadId
}) => {
  return (
    <Box>
      <div>Message Composer Placeholder - {threadId}</div>
    </Box>
  );
};

export default MessageComposer;