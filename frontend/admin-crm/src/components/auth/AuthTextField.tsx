// frontend/admin-crm/src/components/auth/AuthTextField.tsx
// Reusable styled text field for auth forms
// Replaces 100+ lines of duplicate TextField styling

import React from 'react';
import { TextField, InputAdornment, IconButton, type TextFieldProps } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { tokens } from '../../design-system';
import { createTransition } from '../../design-system/utils/animations';

interface AuthTextFieldProps extends Omit<TextFieldProps, 'sx' | 'variant'> {
  /** Whether the form is in dark mode */
  isDarkMode?: boolean;
  /** Icon to show at the start of the input */
  startIcon?: React.ReactNode;
  /** Whether this is a password field with visibility toggle */
  showPasswordToggle?: boolean;
  /** Current password visibility state (for password fields) */
  showPassword?: boolean;
  /** Callback to toggle password visibility */
  onTogglePassword?: () => void;
}

export const AuthTextField: React.FC<AuthTextFieldProps> = ({
  isDarkMode = false,
  startIcon,
  showPasswordToggle = false,
  showPassword = false,
  onTogglePassword,
  error,
  ...props
}) => {
  const getIconColor = () => {
    if (error) return tokens.color.error[500];
    return isDarkMode ? tokens.color.neutral[400] : tokens.color.neutral[500];
  };

  return (
    <TextField
      fullWidth
      variant="outlined"
      error={error}
      InputProps={{
        startAdornment: startIcon ? (
          <InputAdornment position="start">
            <span style={{ color: getIconColor(), display: 'flex', alignItems: 'center' }}>
              {startIcon}
            </span>
          </InputAdornment>
        ) : undefined,
        endAdornment: showPasswordToggle ? (
          <InputAdornment position="end">
            <IconButton
              onClick={onTogglePassword}
              edge="end"
              sx={{
                color: isDarkMode ? tokens.color.neutral[400] : tokens.color.neutral[500],
                '&:hover': {
                  color: tokens.color.primary[500],
                },
              }}
            >
              {showPassword ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </InputAdornment>
        ) : undefined,
        ...props.InputProps,
      }}
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: tokens.spacing.radius.md,
          backgroundColor: isDarkMode ? tokens.color.neutral[800] : 'white',
          border: `1px solid ${isDarkMode ? tokens.color.neutral[700] : tokens.color.neutral[300]}`,
          transition: createTransition(['border-color', 'background-color'], 'fast'),
          padding: '2px 0',
          color: isDarkMode ? tokens.color.neutral[200] : tokens.color.neutral[800],

          '& input': {
            color: isDarkMode ? tokens.color.neutral[200] : tokens.color.neutral[800],
            '&::placeholder': {
              color: isDarkMode ? tokens.color.neutral[500] : tokens.color.neutral[400],
            },
          },

          '&:hover': {
            borderColor: tokens.color.primary[300],
          },

          '&.Mui-focused': {
            borderColor: tokens.color.primary[500],
            boxShadow: `0 0 0 3px ${tokens.color.primary[100]}`,
          },

          '&.Mui-error': {
            borderColor: tokens.color.error[400],
            '&.Mui-focused': {
              boxShadow: `0 0 0 3px ${tokens.color.error[100]}`,
            },
          },

          // Remove default outline
          '& fieldset': {
            border: 'none',
          },
        },

        '& .MuiInputLabel-root': {
          color: isDarkMode ? tokens.color.neutral[400] : tokens.color.neutral[600],
          fontWeight: 500,
          '&.Mui-focused': {
            color: tokens.color.primary[600],
          },
          '&.Mui-error': {
            color: tokens.color.error[600],
          },
        },

        '& .MuiFormHelperText-root': {
          marginLeft: 0,
          fontWeight: 500,
          '&.Mui-error': {
            color: tokens.color.error[600],
          },
        },
      }}
      {...props}
    />
  );
};

export default AuthTextField;
