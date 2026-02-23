// frontend/admin-crm/src/components/common/ConfirmDialog.tsx

import React, { useState, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

type DialogType = 'info' | 'warning' | 'error' | 'success' | 'delete';

interface ConfirmDialogOptions {
  title?: string;
  message: string | ReactNode;
  type?: DialogType;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  showCancel?: boolean;
  autoFocus?: 'confirm' | 'cancel';
  allowAsync?: boolean;
}

interface ConfirmDialogState extends ConfirmDialogOptions {
  open: boolean;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ConfirmDialogContextType {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  confirmDelete: (itemName?: string) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | undefined>(undefined);

export const useConfirmDialog = () => {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error('useConfirmDialog must be used within ConfirmDialogProvider');
  }
  return context;
};

interface ConfirmDialogProviderProps {
  children: ReactNode;
}

export const ConfirmDialogProvider: React.FC<ConfirmDialogProviderProps> = ({ children }) => {
  const [dialogState, setDialogState] = useState<ConfirmDialogState>({
    open: false,
    message: '',
  });
  const [loading, setLoading] = useState(false);

  const confirm = (options: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogState({
        open: true,
        title: options.title || 'Confirm Action',
        message: options.message,
        type: options.type || 'info',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        confirmColor: options.confirmColor || (options.type === 'delete' ? 'error' : 'primary'),
        showCancel: options.showCancel !== false,
        autoFocus: options.autoFocus || 'cancel',
        allowAsync: options.allowAsync || false,
        onConfirm: async () => {
          if (options.allowAsync) {
            setLoading(true);
            try {
              await new Promise((resolve) => setTimeout(resolve, 0)); // Allow for async operations
            } finally {
              setLoading(false);
            }
          }
          setDialogState((prev) => ({ ...prev, open: false }));
          resolve(true);
        },
        onCancel: () => {
          setDialogState((prev) => ({ ...prev, open: false }));
          resolve(false);
        },
      });
    });
  };

  const confirmDelete = (itemName?: string): Promise<boolean> => {
    return confirm({
      title: 'Confirm Delete',
      message: itemName
        ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
        : 'Are you sure you want to delete this item? This action cannot be undone.',
      type: 'delete',
      confirmText: 'Delete',
      cancelText: 'Keep',
      confirmColor: 'error',
    });
  };

  const getIcon = (type: DialogType) => {
    switch (type) {
      case 'warning':
        return <WarningIcon sx={{ fontSize: 48 }} color="warning" />;
      case 'error':
        return <ErrorIcon sx={{ fontSize: 48 }} color="error" />;
      case 'success':
        return <SuccessIcon sx={{ fontSize: 48 }} color="success" />;
      case 'delete':
        return <DeleteIcon sx={{ fontSize: 48 }} color="error" />;
      default:
        return <InfoIcon sx={{ fontSize: 48 }} color="info" />;
    }
  };

  return (
    <ConfirmDialogContext.Provider value={{ confirm, confirmDelete }}>
      {children}
      <Dialog
        open={dialogState.open}
        onClose={dialogState.showCancel ? dialogState.onCancel : undefined}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={!dialogState.showCancel}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {getIcon(dialogState.type || 'info')}
            <Typography variant="h6">{dialogState.title}</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {typeof dialogState.message === 'string' ? (
            <DialogContentText>{dialogState.message}</DialogContentText>
          ) : (
            dialogState.message
          )}
          {dialogState.type === 'delete' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This action is permanent and cannot be undone.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          {dialogState.showCancel && (
            <Button
              onClick={dialogState.onCancel}
              disabled={loading}
              autoFocus={dialogState.autoFocus === 'cancel'}
            >
              {dialogState.cancelText}
            </Button>
          )}
          <Button
            onClick={dialogState.onConfirm}
            color={dialogState.confirmColor}
            variant="contained"
            disabled={loading}
            autoFocus={dialogState.autoFocus === 'confirm'}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {dialogState.confirmText}
          </Button>
        </DialogActions>
      </Dialog>
    </ConfirmDialogContext.Provider>
  );
};

// Standalone confirm dialog component for simple use cases
interface SimpleConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  type?: DialogType;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const SimpleConfirmDialog: React.FC<SimpleConfirmDialogProps> = ({
  open,
  title = 'Confirm',
  message,
  type = 'info',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
        {type === 'delete' && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            This action cannot be undone.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>
          {cancelText}
        </Button>
        <Button
          onClick={handleConfirm}
          color={type === 'delete' ? 'error' : 'primary'}
          variant="contained"
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
