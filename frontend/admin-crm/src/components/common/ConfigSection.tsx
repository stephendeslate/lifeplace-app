// frontend/admin-crm/src/components/common/ConfigSection.tsx
// Reusable section container for booking flow configurations
// Replaces 50+ repeated section patterns

import React, { useState } from 'react';
import { Box, Typography, Collapse, IconButton, type SxProps, type Theme } from '@mui/material';
import { ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from '@mui/icons-material';
import { tokens } from '../../design-system';

interface ConfigSectionProps {
  /** Section title */
  title: string;
  /** Optional description text below title */
  description?: string;
  /** Optional icon displayed before title */
  icon?: React.ReactNode;
  /** Section content */
  children: React.ReactNode;
  /** Whether section can be collapsed */
  collapsible?: boolean;
  /** Initial expanded state (only applies when collapsible=true) */
  defaultExpanded?: boolean;
  /** Additional sx props for the container */
  sx?: SxProps<Theme>;
  /** Variant for different visual styles */
  variant?: 'default' | 'outlined' | 'flat';
}

export const ConfigSection: React.FC<ConfigSectionProps> = ({
  title,
  description,
  icon,
  children,
  collapsible = false,
  defaultExpanded = true,
  sx,
  variant = 'default',
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const handleToggle = () => {
    if (collapsible) {
      setExpanded(!expanded);
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'outlined':
        return {
          border: `1px solid ${tokens.color.borders.subtle}`,
          bgcolor: 'transparent',
        };
      case 'flat':
        return {
          border: 'none',
          bgcolor: 'transparent',
        };
      default:
        return {
          bgcolor: 'background.paper',
          border: `1px solid ${tokens.color.borders.subtle}`,
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <Box
      sx={
        {
          borderRadius: tokens.spacing.radius.lg,
          p: 3,
          border: variantStyles.border,
          bgcolor: variantStyles.bgcolor,
          ...sx,
        } as SxProps<Theme>
      }
    >
      {/* Header */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        onClick={collapsible ? handleToggle : undefined}
        sx={{
          cursor: collapsible ? 'pointer' : 'default',
          mb: expanded ? 2 : 0,
          userSelect: collapsible ? 'none' : 'auto',
        }}
      >
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
            <Typography variant="subtitle1" fontWeight={600}>
              {title}
            </Typography>
            {description && (
              <Typography variant="body2" color="text.secondary">
                {description}
              </Typography>
            )}
          </Box>
        </Box>
        {collapsible && (
          <IconButton size="small" onClick={handleToggle}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        )}
      </Box>

      {/* Content */}
      {collapsible ? (
        <Collapse in={expanded}>
          <Box>{children}</Box>
        </Collapse>
      ) : (
        <Box>{children}</Box>
      )}
    </Box>
  );
};

/**
 * Compact variant for nested sections or smaller areas
 */
export const ConfigSectionCompact: React.FC<Omit<ConfigSectionProps, 'variant'>> = (props) => (
  <ConfigSection {...props} sx={{ p: 2, ...props.sx }} />
);

export default ConfigSection;
