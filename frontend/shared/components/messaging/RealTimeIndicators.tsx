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
  showTyping: _ = true,
  showPresence: _1 = true,
  isConnected: _2 = false,
  connectionQuality: _3 = 'offline',
  typingUsers: _4 = [],
  onlineUsers: _5 = [],
  compact: _6 = false
}) => {
  return (
    <Box>
      <div>Real Time Indicators Placeholder - {threadId}</div>
    </Box>
  );
};

export default RealTimeIndicators;