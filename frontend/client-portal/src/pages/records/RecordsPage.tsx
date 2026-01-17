// frontend/client-portal/src/pages/records/RecordsPage.tsx

import React from 'react';
import { Box, Typography, Container } from '@mui/material';
import { SEO } from '../../hooks/useSEO';
import { CommunicationHistory } from '../../components/communications';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';

export const RecordsPage: React.FC = () => {
  return (
    <>
      <SEO
        title="Communication Records | LifePlace Alfonso"
        description="View your communication records."
        noIndex={true}
      />
      <Container maxWidth="xl" sx={{ py: 3 }}>
      <AnimatedElement animation="fadeIn" delay={100}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
            Communication Records
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View all email and SMS communications sent to you by our team.
          </Typography>
        </Box>
      </AnimatedElement>

        <AnimatedElement animation="slideUp" delay={200}>
          <CommunicationHistory />
        </AnimatedElement>
      </Container>
    </>
  );
};

export default RecordsPage;