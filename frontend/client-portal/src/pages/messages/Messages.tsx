// frontend/client-portal/src/pages/messages/Messages.tsx

import React from 'react';
import { Box, Typography } from '@mui/material';
import { CommunicationHistory } from '../../components/communications';

const Messages: React.FC = () => {
  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
          Messages & Communications
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View all your messages, notifications, and communications from LifePlace Alfonso.
        </Typography>
      </Box>
      
      <CommunicationHistory />
    </Box>
  );
};

export default Messages;