/**
 * RealTimeIndicators - Placeholder component for real-time indicators
 */

import React from 'react';
import { Box } from '@mui/material';

export interface RealTimeIndicatorsProps {
  threadId?: string;
  showTyping?: boolean;
  showPresence?: boolean;
  // Props used in MessageInterface
  isConnected?: boolean;
  connectionQuality?: 'excellent' | 'good' | 'poor' | 'offline';
  typingUsers?: string[];
  onlineUsers?: string[];
  compact?: boolean;
}

export const RealTimeIndicators: React.FC<RealTimeIndicatorsProps> = ({
  threadId,
  showTyping = true,
  showPresence = true,
  isConnected = false,
  connectionQuality = 'offline',
  typingUsers = [],
  onlineUsers = [],
  compact = false
}) => {
  return (
    <Box>
      <div>Real Time Indicators Placeholder - {threadId}</div>
    </Box>
  );
};

export default RealTimeIndicators;