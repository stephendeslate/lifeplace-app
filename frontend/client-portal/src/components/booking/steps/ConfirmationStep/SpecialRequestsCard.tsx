// frontend/client-portal/src/components/booking/steps/ConfirmationStep/SpecialRequestsCard.tsx

import React from 'react';
import { Paper, Typography, Divider } from '@mui/material';

interface SpecialRequestsCardProps {
  specialRequests: string;
}

export const SpecialRequestsCard: React.FC<SpecialRequestsCardProps> = ({ specialRequests }) => {
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Special Requests
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
        {specialRequests}
      </Typography>
    </Paper>
  );
};
