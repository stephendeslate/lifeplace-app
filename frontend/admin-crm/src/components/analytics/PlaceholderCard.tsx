// frontend/admin-crm/src/components/analytics/PlaceholderCard.tsx
import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import type { PlaceholderResponse } from '../../types/analytics.types';
import { tokens, createGlassColor } from '../../design-system';

interface PlaceholderCardProps {
  title: string;
  response?: PlaceholderResponse;
  height?: number | string;
}

export const PlaceholderCard: React.FC<PlaceholderCardProps> = ({
  title,
  response,
  height = 200,
}) => {
  return (
    <Paper
      sx={{
        p: 3,
        height,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: createGlassColor(tokens.color.warning[500], 0.05),
        border: `1px dashed ${createGlassColor(tokens.color.warning[500], 0.3)}`,
      }}
    >
      <Box
        sx={{
          p: 2,
          borderRadius: tokens.spacing.radius.full,
          backgroundColor: createGlassColor(tokens.color.warning[500], 0.1),
          mb: 2,
        }}
      >
        <BuildIcon sx={{ fontSize: 32, color: tokens.color.warning[500] }} />
      </Box>

      <Typography variant="h6" color="text.primary" gutterBottom>
        {title}
      </Typography>

      <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ maxWidth: 300 }}>
        {response?.message ||
          'This feature is currently in development and will be available soon.'}
      </Typography>
    </Paper>
  );
};

export default PlaceholderCard;
