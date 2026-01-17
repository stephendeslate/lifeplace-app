// QuickActionButton Component
// A standardized action button for Dashboard quick actions
// Supports both navigation (href) and click actions

import React from 'react';
import { Box, Typography, ButtonBase } from '@mui/material';
import { Link } from 'react-router-dom';
import { tokens } from '../../design-system';
import { IconBadge } from './IconBadge';

export interface QuickActionButtonProps {
  title: string;
  description?: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  disabled?: boolean;
  className?: string;
  sx?: object;
}

export const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  title,
  description,
  icon,
  href,
  onClick,
  color = 'primary',
  disabled = false,
  className,
  sx,
}) => {
  const buttonStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    p: 2,
    borderRadius: tokens.spacing.radius.lg,
    border: `1px solid ${tokens.color.borders.subtle}`,
    bgcolor: 'background.paper',
    width: '100%',
    textAlign: 'left' as const,
    transition: 'background-color 0.2s ease',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    '&:hover': disabled
      ? {}
      : {
          bgcolor: tokens.color.neutral[50],
        },
  };

  const content = (
    <>
      <IconBadge icon={icon} color={color} size="medium" variant="default" />
      <Box flex={1} minWidth={0}>
        <Typography
          variant="body1"
          fontWeight={600}
          sx={{
            color: tokens.color.neutral[800],
            lineHeight: 1.3,
          }}
        >
          {title}
        </Typography>
        {description && (
          <Typography
            variant="body2"
            sx={{
              color: tokens.color.neutral[500],
              mt: 0.25,
              lineHeight: 1.4,
            }}
          >
            {description}
          </Typography>
        )}
      </Box>
    </>
  );

  if (href && !disabled) {
    return (
      <ButtonBase
        component={Link}
        to={href}
        className={className}
        sx={{ ...buttonStyles, ...sx }}
        disableRipple
      >
        {content}
      </ButtonBase>
    );
  }

  return (
    <ButtonBase
      onClick={disabled ? undefined : onClick}
      className={className}
      sx={{ ...buttonStyles, ...sx }}
      disabled={disabled}
      disableRipple
    >
      {content}
    </ButtonBase>
  );
};

export default QuickActionButton;
