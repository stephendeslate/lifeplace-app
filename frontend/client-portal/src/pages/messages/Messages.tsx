// frontend/client-portal/src/pages/messages/Messages.tsx

import React from 'react';
import { Box, Typography } from '@mui/material';
import { CommunicationHistory } from '../../components/communications';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';

const Messages: React.FC = () => {
  return (
    <Box>
      <AnimatedElement animation="slideDown" delay={100}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
            Messages & Communications
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View all your messages, notifications, and communications from LifePlace Alfonso.
          </Typography>
        </Box>
      </AnimatedElement>
      
      <AnimatedElement animation="slideUp" delay={200}>
        <CommunicationHistory />
      </AnimatedElement>
    </Box>
  );
};

export default Messages;