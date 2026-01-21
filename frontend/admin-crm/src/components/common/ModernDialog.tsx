// frontend/admin-crm/src/components/common/ModernDialog.tsx

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  IconButton,
  Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { tokens } from '../../design-system/tokens';

// Standardized dialog spacing constants
export const DIALOG_PADDING = {
  CONTENT: 4,
  ACTIONS: 4,
  TITLE: 3,
  GAP: 2,
} as const;

export const DIALOG_SIZES = {
  FORM_SMALL: 'sm' as const,
  FORM_MEDIUM: 'md' as const,
  FORM_LARGE: 'lg' as const,
  CONFIRMATION: 'xs' as const,
} as const;

export interface ModernDialogAction {
  label: string;
  onClick: () => void;
  variant?: 'text' | 'outlined' | 'contained';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  disabled?: boolean;
  loading?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  show?: boolean;
}

export interface ModernDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: ModernDialogAction[];
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  fullWidth?: boolean;
  showCloseButton?: boolean;
  disableEscapeKeyDown?: boolean;
  disableBackdropClick?: boolean;
  className?: string;
  contentSx?: Record<string, unknown>;
}

export const ModernDialog: React.FC<ModernDialogProps> = ({
  open,
  onClose,
  title,
  children,
  actions = [],
  maxWidth = 'sm',
  fullWidth = true,
  showCloseButton = true,
  disableEscapeKeyDown = false,
  disableBackdropClick = false,
  className,
  contentSx = {},
}) => {
  const handleClose = (_event: unknown, reason?: string) => {
    if (disableBackdropClick && reason === 'backdropClick') {
      return;
    }
    if (disableEscapeKeyDown && reason === 'escapeKeyDown') {
      return;
    }
    onClose();
  };

  const visibleActions = actions.filter(action => action.show !== false);
  const isAnyActionLoading = visibleActions.some(action => action.loading);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      className={className}
      PaperProps={{
        sx: {
          backdropFilter: 'blur(20px)',
          borderRadius: tokens.spacing.radius.xxl,
          border: `1px solid ${tokens.color.borders.glass}`,
          background: `linear-gradient(135deg, ${tokens.color.neutral[50]} 0%, ${tokens.color.neutral[100]} 100%)`,
          boxShadow: `0 25px 80px ${tokens.color.neutral[900]}20`,
          minHeight: maxWidth === 'xs' ? 'auto' : '60vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          background: `linear-gradient(135deg, ${tokens.color.primary[100]} 0%, ${tokens.color.secondary[100]} 100%)`,
          borderBottom: `1px solid ${tokens.color.neutral[200]}`,
          fontWeight: 600,
          fontSize: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pr: showCloseButton ? 1 : 3,
        }}
      >
        <Typography variant="h6" component="div" sx={{ fontWeight: 'inherit', fontSize: 'inherit' }}>
          {title}
        </Typography>
        {showCloseButton && (
          <IconButton
            onClick={() => onClose()}
            disabled={isAnyActionLoading}
            size="small"
            sx={{
              '&:hover': {
                background: `linear-gradient(135deg, ${tokens.color.neutral[200]} 0%, ${tokens.color.neutral[100]} 100%)`,
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent 
        sx={{
          pt: 3,
          pb: visibleActions.length > 0 ? 1 : 3,
          ...contentSx,
        }}
      >
        {children}
      </DialogContent>

      {visibleActions.length > 0 && (
        <DialogActions sx={{ p: 3, gap: 1, borderTop: `1px solid ${tokens.color.neutral[200]}` }}>
          {visibleActions.map((action, index) => (
            <Button
              key={index}
              onClick={action.onClick}
              variant={action.variant || 'contained'}
              color={action.color || 'primary'}
              disabled={action.disabled || isAnyActionLoading}
              startIcon={action.loading ? undefined : action.startIcon}
              endIcon={action.loading ? undefined : action.endIcon}
              sx={{
                ...(action.variant === 'contained' && {
                  background: action.color === 'error' 
                    ? `linear-gradient(135deg, ${tokens.color.error[500]} 0%, ${tokens.color.error[600]} 100%)`
                    : `linear-gradient(135deg, ${tokens.color.primary[500]} 0%, ${tokens.color.primary[600]} 100%)`,
                  '&:hover': {
                    background: action.color === 'error'
                      ? `linear-gradient(135deg, ${tokens.color.error[600]} 0%, ${tokens.color.error[700]} 100%)`
                      : `linear-gradient(135deg, ${tokens.color.primary[600]} 0%, ${tokens.color.primary[700]} 100%)`,
                    transform: 'translateY(-1px)',
                    boxShadow: action.color === 'error'
                      ? `0 6px 20px ${tokens.color.error[500]}40`
                      : `0 6px 20px ${tokens.color.primary[500]}40`,
                  },
                  '&:disabled': {
                    background: tokens.color.neutral[200],
                    color: tokens.color.neutral[500],
                  },
                  transition: 'all 0.2s ease-in-out',
                }),
                ...(action.variant !== 'contained' && {
                  '&:hover': {
                    background: `linear-gradient(135deg, ${tokens.color.neutral[100]} 0%, ${tokens.color.neutral[50]} 100%)`,
                  },
                }),
              }}
            >
              {action.loading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                action.label
              )}
            </Button>
          ))}
        </DialogActions>
      )}
    </Dialog>
  );
};

// Convenience functions for common dialog patterns
export const createStandardActions = (
  onCancel: () => void,
  onConfirm: () => void,
  options?: {
    cancelLabel?: string;
    confirmLabel?: string;
    confirmColor?: 'primary' | 'error' | 'warning';
    isLoading?: boolean;
    confirmDisabled?: boolean;
  }
): ModernDialogAction[] => [
  {
    label: options?.cancelLabel || 'Cancel',
    onClick: onCancel,
    variant: 'text',
    disabled: options?.isLoading,
  },
  {
    label: options?.confirmLabel || 'Confirm',
    onClick: onConfirm,
    variant: 'contained',
    color: options?.confirmColor || 'primary',
    loading: options?.isLoading,
    disabled: options?.confirmDisabled,
  },
];

export const createDeleteActions = (
  onCancel: () => void,
  onDelete: () => void,
  isDeleting?: boolean
): ModernDialogAction[] => [
  {
    label: 'Cancel',
    onClick: onCancel,
    variant: 'text',
    disabled: isDeleting,
  },
  {
    label: isDeleting ? 'Deleting...' : 'Delete',
    onClick: onDelete,
    variant: 'contained',
    color: 'error',
    loading: isDeleting,
  },
];

export default ModernDialog;