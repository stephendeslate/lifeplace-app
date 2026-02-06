// frontend/client-portal/src/pages/legal/PrivacyPage.tsx

import React from 'react';
import { Box, Typography, Container, CircularProgress, Alert, Paper } from '@mui/material';
import DOMPurify from 'dompurify';
import { SEO } from '../../hooks/useSEO';
import { useLegalDocument } from '../../hooks/useLegalDocument';
import { formatPhilippinesTime } from '../../utils/timezone';

export const PrivacyPage: React.FC = () => {
  const { document, isLoading, error } = useLegalDocument('PRIVACY_POLICY');

  if (isLoading) {
    return (
      <>
        <SEO
          title="Privacy Policy | LifePlace Alfonso"
          description="Privacy policy for LifePlace Alfonso."
          noIndex={true}
        />
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        </Container>
      </>
    );
  }

  if (error || !document) {
    return (
      <>
        <SEO
          title="Privacy Policy | LifePlace Alfonso"
          description="Privacy policy for LifePlace Alfonso."
          noIndex={true}
        />
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Paper sx={{ p: 4 }}>
            <Alert severity="info">
              Privacy Policy content is not available at this time.
            </Alert>
          </Paper>
        </Container>
      </>
    );
  }

  return (
    <>
      <SEO
        title="Privacy Policy | LifePlace Alfonso"
        description="Privacy policy for LifePlace Alfonso."
        noIndex={true}
      />
      <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 600 }}>
          {document.title || 'Privacy Policy'}
        </Typography>
        {document.effective_date && (
          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
            Effective: {formatPhilippinesTime(document.effective_date, false, 'MMMM d, yyyy')}
          </Typography>
        )}
        <Box
          sx={{
            '& p': { mb: 2 },
            '& h1, & h2, & h3, & h4': { mt: 3, mb: 1 },
            '& ul, & ol': { pl: 3 }
          }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(document.content) }}
        />
      </Paper>
      </Container>
    </>
  );
};
