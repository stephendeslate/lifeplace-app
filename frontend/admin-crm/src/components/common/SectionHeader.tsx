// frontend/admin-crm/src/components/common/SectionHeader.tsx
// Reusable section header with optional icon and actions
// Replaces 8+ repeated section header patterns

import React from 'react';
import { Box, Typography, type SxProps, type Theme } from '@mui/material';

interface SectionHeaderProps {
  /** Optional icon displayed before the title */
  icon?: React.ReactNode;
  /** Section title */
  title: string;
  /** Optional description below title */
  description?: string;
  /** Optional action buttons on the right */
  actions?: React.ReactNode;
  /** Typography variant for title */
  titleVariant?: 'h5' | 'h6' | 'subtitle1' | 'subtitle2';
  /** Additional sx props */
  sx?: SxProps<Theme>;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon,
  title,
  description,
  actions,
  titleVariant = 'h6',
  sx,
}) => {
  return (
    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2} sx={sx}>
      <Box display="flex" alignItems="center" gap={1.5}>
        {icon && (
          <Box
            sx={{
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {icon}
          </Box>
        )}
        <Box>
          <Typography variant={titleVariant} fontWeight={600}>
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          )}
        </Box>
      </Box>
      {actions && (
        <Box display="flex" alignItems="center" gap={1}>
          {actions}
        </Box>
      )}
    </Box>
  );
};

export default SectionHeader;
