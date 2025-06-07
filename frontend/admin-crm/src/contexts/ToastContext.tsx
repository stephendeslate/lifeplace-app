// frontend/admin-crm/src/contexts/ToastContext.tsx

import React, { createContext, useContext, useState, useCallback } from 'react';
import { 
  Snackbar, 
  Alert, 
  AlertTitle, 
  Button, 
  IconButton,
  Stack 
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import type { Toast, ToastContextType, ShowToastOptions } from '../types/toast.types';

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: React.ReactNode;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((options: ShowToastOptions) => {
    const toast: Toast = {
      id: generateId(),
      duration: 6000, // Default 6 seconds
      ...options,
    };

    setToasts(prev => [...prev, toast]);

    // Auto-hide toast after duration
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        hideToast(toast.id);
      }, toast.duration);
    }
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const value: ToastContextType = {
    toasts,
    showToast,
    hideToast,
    clearAllToasts,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      
      {/* Toast Container */}
      <Stack
        spacing={1}
        sx={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 9999,
          maxWidth: 400,
        }}
      >
        {toasts.map((toast) => (
          <Snackbar
            key={toast.id}
            open={true}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            sx={{ position: 'relative' }}
          >
            <Alert
              severity={toast.type}
              variant="filled"
              sx={{
                minWidth: 300,
                '& .MuiAlert-message': {
                  flex: 1,
                },
              }}
              action={
                <Stack direction="row" spacing={1} alignItems="center">
                  {toast.action && (
                    <Button
                      color="inherit"
                      size="small"
                      onClick={toast.action.onClick}
                      sx={{ 
                        color: 'inherit',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        },
                      }}
                    >
                      {toast.action.label}
                    </Button>
                  )}
                  <IconButton
                    size="small"
                    color="inherit"
                    onClick={() => hideToast(toast.id)}
                    sx={{
                      color: 'inherit',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      },
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Stack>
              }
            >
              <AlertTitle sx={{ margin: 0, fontWeight: 600 }}>
                {toast.title}
              </AlertTitle>
              {toast.message && (
                <div style={{ marginTop: 4 }}>
                  {toast.message}
                </div>
              )}
            </Alert>
          </Snackbar>
        ))}
      </Stack>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Convenience hooks for different toast types
export const useToastActions = () => {
  const { showToast } = useToast();

  return {
    showSuccess: (title: string, message?: string, options?: Partial<ShowToastOptions>) =>
      showToast({ type: 'success', title, message, ...options }),
    
    showError: (title: string, message?: string, options?: Partial<ShowToastOptions>) =>
      showToast({ type: 'error', title, message, duration: 8000, ...options }),
    
    showWarning: (title: string, message?: string, options?: Partial<ShowToastOptions>) =>
      showToast({ type: 'warning', title, message, ...options }),
    
    showInfo: (title: string, message?: string, options?: Partial<ShowToastOptions>) =>
      showToast({ type: 'info', title, message, ...options }),
  };
};