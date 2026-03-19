// frontend/client-portal/src/components/booking/steps/ConfirmationStep/ContactInfoCard.tsx

import React from 'react';
import { Box, Typography, Paper, Chip, Divider } from '@mui/material';
import { Person } from '@mui/icons-material';
import type { ContactSummary } from '@/types/booking';

interface ContactInfoCardProps {
  contactSummary: ContactSummary;
}

export const ContactInfoCard: React.FC<ContactInfoCardProps> = ({ contactSummary }) => {
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Person />
        Contact Information
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box>
          <Typography variant="body2" color="text.secondary">
            Name:
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            {contactSummary.fullName}
          </Typography>
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">
            Email:
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            {contactSummary.email}
          </Typography>
        </Box>
        {contactSummary.phone && (
          <Box>
            <Typography variant="body2" color="text.secondary">
              Phone:
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {contactSummary.phone}
            </Typography>
          </Box>
        )}
        {contactSummary.company && (
          <Box>
            <Typography variant="body2" color="text.secondary">
              Company:
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {contactSummary.company}
            </Typography>
          </Box>
        )}
        {contactSummary.accountCreated && (
          <Chip
            label="Account Created"
            color="primary"
            size="small"
            sx={{ alignSelf: 'flex-start', mt: 1 }}
          />
        )}
      </Box>
    </Paper>
  );
};
