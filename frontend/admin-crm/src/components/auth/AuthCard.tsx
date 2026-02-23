// frontend/admin-crm/src/components/auth/AuthCard.tsx
// Reusable card component for auth forms
// Replaces duplicate card styling in auth forms

import React from 'react';
import { Box, Typography } from '@mui/material';
import { tokens } from '../../design-system';
import { useTheme } from '../../contexts/ThemeContext';

interface AuthCardProps {
  children: React.ReactNode;
  /** Optional title displayed at top */
  title?: string;
  /** Optional subtitle below title */
  subtitle?: string;
  /** Optional icon displayed above title */
  icon?: React.ReactNode;
  /** Icon container variant */
  iconVariant?: 'circular' | 'rounded';
}

export const AuthCard: React.FC<AuthCardProps> = ({
  children,
  title,
  subtitle,
  icon,
  iconVariant = 'rounded',
}) => {
  const { effectiveMode } = useTheme();
  const isDarkMode = effectiveMode === 'dark';

  return (
    <Box
      sx={{
        backgroundColor: isDarkMode ? tokens.color.neutral[900] : 'white',
        borderRadius: tokens.spacing.radius.xxl,
        p: { xs: 4, sm: 5 },
        border: `1px solid ${isDarkMode ? tokens.color.neutral[800] : tokens.color.neutral[200]}`,
        boxShadow: isDarkMode ? '0 4px 24px rgba(0, 0, 0, 0.4)' : '0 4px 24px rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* Header Section */}
      {(icon || title || subtitle) && (
        <Box sx={{ textAlign: 'center', mb: { xs: 3, sm: 4 } }}>
          {/* Icon */}
          {icon && (
            <Box
              sx={{
                display: 'inline-flex',
                mb: 3,
              }}
            >
              <Box
                sx={{
                  p: 2.5,
                  borderRadius:
                    iconVariant === 'circular'
                      ? tokens.spacing.radius.full
                      : tokens.spacing.radius.lg,
                  background: tokens.color.primary[50],
                  border: `1px solid ${tokens.color.primary[200]}`,
                  color: tokens.color.primary[600],
                }}
              >
                {icon}
              </Box>
            </Box>
          )}

          {/* Title */}
          {title && (
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 700,
                color: isDarkMode ? tokens.color.neutral[100] : tokens.color.primary[700],
                mb: subtitle ? 1 : 0,
                letterSpacing: '-0.02em',
              }}
            >
              {title}
            </Typography>
          )}

          {/* Subtitle */}
          {subtitle && (
            <Typography
              variant="body1"
              sx={{
                color: isDarkMode ? tokens.color.neutral[400] : tokens.color.neutral[600],
                fontWeight: 500,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      )}

      {/* Content */}
      {children}
    </Box>
  );
};

export default AuthCard;
