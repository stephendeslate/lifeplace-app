// frontend/client-portal/src/pages/legal/TermsPage.tsx

import React from 'react';
import { Box, Typography, Container, CircularProgress, Alert, Paper } from '@mui/material';
import { useLegalDocument } from '../../hooks/useLegalDocument';

export const TermsPage: React.FC = () => {
  const { document, isLoading, error } = useLegalDocument('TERMS_OF_SERVICE');

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !document) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Alert severity="info">
            Terms of Service content is not available at this time.
          </Alert>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 600 }}>
          {document.title || 'Terms of Service'}
        </Typography>
        {document.effective_date && (
          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
            Effective: {new Date(document.effective_date).toLocaleDateString()}
          </Typography>
        )}
        <Box
          sx={{
            '& p': { mb: 2 },
            '& h1, & h2, & h3, & h4': { mt: 3, mb: 1 },
            '& ul, & ol': { pl: 3 }
          }}
          dangerouslySetInnerHTML={{ __html: document.content }}
        />
      </Paper>
    </Container>
  );
};
