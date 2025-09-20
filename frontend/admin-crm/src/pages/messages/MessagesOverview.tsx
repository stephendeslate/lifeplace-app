/**
 * MessagesOverview - Admin CRM Messages Dashboard
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
} from '@mui/material';
import {
  Message as MessageIcon,
} from '@mui/icons-material';
import { MessageInterface } from '../../components/messaging/MessageInterface';

export interface MessagesOverviewProps {
  className?: string;
  defaultView?: 'grid' | 'list';
  enableSearch?: boolean;
  enableFilters?: boolean;
}

export const MessagesOverview: React.FC<MessagesOverviewProps> = ({
  className,
}) => {
  return (
    <Box
      className={className}
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          borderRadius: 0,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MessageIcon color="primary" />
          <Typography variant="h5" fontWeight={600}>
            Messages
          </Typography>
        </Box>
      </Paper>

      {/* Main Content Area */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <MessageInterface />
      </Box>
    </Box>
  );
};

export default MessagesOverview;