/**
 * ConnectionStatus - Placeholder component for connection status
 */

import React from 'react';
import { Box, Chip } from '@mui/material';

export interface ConnectionStatusProps {
  status?: 'connected' | 'connecting' | 'disconnected' | 'error';
  showDetails?: boolean;
  // Additional props used in MessageInterface
  isConnected?: boolean;
  connectionQuality?: 'excellent' | 'good' | 'poor' | 'offline';
  lastUpdateTime?: number;
  onReconnect?: () => void;
  compact?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  status = 'connected'
}) => {
  return (
    <Box>
      <Chip label={`Status: ${status}`} size="small" />
    </Box>
  );
};

export default ConnectionStatus;