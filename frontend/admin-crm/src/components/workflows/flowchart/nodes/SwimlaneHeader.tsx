// frontend/admin-crm/src/components/workflows/flowchart/nodes/SwimlaneHeader.tsx

import React, { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Box, Typography, Chip } from '@mui/material';
import type { SwimlaneHeaderData } from '../types';

const SwimlaneHeaderComponent: React.FC<NodeProps> = ({ data }) => {
  const { label, color, stageCount } = data as SwimlaneHeaderData;

  return (
    <Box
      sx={{
        width: 180,
        height: 140,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${color}10`,
        borderRadius: 2,
        border: '2px solid',
        borderColor: color,
        p: 2,
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 4,
          backgroundColor: color,
          borderRadius: 1,
          mb: 1.5,
        }}
      />
      <Typography variant="subtitle1" fontWeight="bold" sx={{ color, textAlign: 'center' }}>
        {label}
      </Typography>
      <Chip
        label={`${stageCount} stage${stageCount !== 1 ? 's' : ''}`}
        size="small"
        sx={{
          mt: 1,
          backgroundColor: `${color}20`,
          color,
          fontWeight: 500,
        }}
      />
    </Box>
  );
};

export const SwimlaneHeader = memo(SwimlaneHeaderComponent);
