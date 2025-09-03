// frontend/client-portal/src/pages/Help.tsx

import React from 'react';
import { Box } from '@mui/material';
import { HelpCenter } from '../components/help';

export const Help: React.FC = () => {
  return (
    <Box sx={{ minHeight: 'calc(100vh - 64px)' }}>
      <HelpCenter />
    </Box>
  );
};