// frontend/admin-crm/src/pages/settings/templates/QuestionnaireTemplates.tsx

import React, { useEffect } from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { Psychology } from '@mui/icons-material';
import { useLayout } from '../../../contexts/LayoutContext';

export const QuestionnaireTemplates: React.FC = () => {
  const { setBreadcrumbs } = useLayout();

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings', path: '/settings' },
      { label: 'Template Management' },
      { label: 'Questionnaire Templates' },
    ]);
  }, [setBreadcrumbs]);

  return (
    <Box>
      <Card elevation={2}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <Psychology sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Questionnaire Templates
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Create and manage questionnaire templates for client intake and event planning.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This feature is coming soon...
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};