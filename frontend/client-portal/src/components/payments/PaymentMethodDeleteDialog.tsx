// frontend/client-portal/src/components/payments/PaymentMethodDeleteDialog.tsx

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Stack,
  Typography,
  CircularProgress,
  IconButton,
  Alert,
  Chip,
  useTheme,
  alpha,
  TextField,
} from '@mui/material';
import {
  Close as CloseIcon,
  DeleteOutline as DeleteIcon,
  Warning as WarningIcon,
  CreditCard as CreditCardIcon,
  AccountBalance as AccountBalanceIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { useDeletePaymentMethod } from '../../hooks/useFinancial';
import type { PaymentMethod } from '../../types/financial';

interface PaymentMethodDeleteDialogProps {
  open: boolean;
  paymentMethod: PaymentMethod | null;
  onClose: () => void;
  onSuccess?: () => void;
  isOnlyMethod?: boolean;
}

const PaymentMethodDeleteDialog: React.FC<PaymentMethodDeleteDialogProps> = ({
  open,
  paymentMethod,
  onClose,
  onSuccess,
  isOnlyMethod = false,
}) => {
  const theme = useTheme();
  const [confirmationText, setConfirmationText] = useState('');
  const [showConfirmationField, setShowConfirmationField] = useState(false);

  const deletePaymentMethod = useDeletePaymentMethod();

  const getPaymentMethodIcon = (type: string) => {
    switch (type) {
      case 'CREDIT_CARD':
        return <CreditCardIcon />;
      case 'BANK_TRANSFER':
        return <AccountBalanceIcon />;
      default:
        return <ReceiptIcon />;
    }
  };

  const getConfirmationText = (method: PaymentMethod) => {
    const identifier = method.last_four
      ? `${method.type_display} ••••${method.last_four}`
      : method.nickname || method.type_display;
    return `DELETE ${identifier}`;
  };

  const handleDeleteClick = () => {
    if (!paymentMethod) return;

    // For default methods or critical methods, require confirmation text
    if (paymentMethod.is_default || isOnlyMethod) {
      setShowConfirmationField(true);
    } else {
      handleConfirmedDelete();
    }
  };

  const handleConfirmedDelete = async () => {
    if (!paymentMethod) return;

    // If confirmation is required, validate it
    if (showConfirmationField) {
      const requiredText = getConfirmationText(paymentMethod);
      if (confirmationText.trim() !== requiredText) {
        return;
      }
    }

    try {
      await deletePaymentMethod.mutateAsync(paymentMethod.id);
      onSuccess?.();
      onClose();
    } catch (error) {
      // Error is handled by the hook's onError callback
      if (import.meta.env.DEV) console.error('Error deleting payment method:', error);
    }
  };

  const handleClose = () => {
    if (!deletePaymentMethod.isPending) {
      setConfirmationText('');
      setShowConfirmationField(false);
      onClose();
    }
  };

  if (!paymentMethod) {
    return null;
  }

  const requiredConfirmationText = getConfirmationText(paymentMethod);
  const isConfirmationValid =
    !showConfirmationField || confirmationText.trim() === requiredConfirmationText;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: alpha(theme.palette.background.paper, 0.95),
          backdropFilter: 'blur(10px)',
          border: `1px solid ${alpha('#fff', 0.1)}`,
        },
      }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                p: 1,
                borderRadius: 1,
                backgroundColor: alpha(theme.palette.error.main, 0.1),
                color: theme.palette.error.main,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <DeleteIcon />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'error.main' }}>
                Delete Payment Method
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This action cannot be undone
              </Typography>
            </Box>
          </Stack>
          <IconButton
            onClick={handleClose}
            disabled={deletePaymentMethod.isPending}
            sx={{
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: alpha('#fff', 0.1),
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={3}>
          {/* Payment Method Details */}
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              backgroundColor: alpha('#fff', 0.05),
              border: `1px solid ${alpha('#fff', 0.1)}`,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2} mb={1}>
              {getPaymentMethodIcon(paymentMethod.type)}
              <Box flex={1}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {paymentMethod.nickname || paymentMethod.type_display}
                </Typography>
                {paymentMethod.last_four && (
                  <Typography variant="body2" color="text.secondary">
                    •••• {paymentMethod.last_four}
                  </Typography>
                )}
                {paymentMethod.expiry_date && (
                  <Typography variant="caption" color="text.secondary">
                    Expires:{' '}
                    {new Date(paymentMethod.expiry_date).toLocaleDateString('en-US', {
                      month: '2-digit',
                      year: '2-digit',
                    })}
                  </Typography>
                )}
              </Box>
              {paymentMethod.is_default && (
                <Chip
                  label="Default"
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  }}
                />
              )}
            </Stack>
          </Box>

          {/* Warning Messages */}
          {paymentMethod.is_default && (
            <Alert
              severity="warning"
              icon={<WarningIcon />}
              sx={{
                backgroundColor: alpha(theme.palette.warning.main, 0.1),
                border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                '& .MuiAlert-icon': {
                  color: theme.palette.warning.main,
                },
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                This is your default payment method
              </Typography>
              <Typography variant="caption">
                Deleting this will remove your default payment method. You'll need to set another
                method as default if you have other payment methods saved.
              </Typography>
            </Alert>
          )}

          {isOnlyMethod && (
            <Alert
              severity="error"
              icon={<WarningIcon />}
              sx={{
                backgroundColor: alpha(theme.palette.error.main, 0.1),
                border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                '& .MuiAlert-icon': {
                  color: theme.palette.error.main,
                },
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                This is your only saved payment method
              </Typography>
              <Typography variant="caption">
                After deleting this method, you'll need to enter payment details manually for future
                transactions.
              </Typography>
            </Alert>
          )}

          {/* Confirmation Text Field */}
          {showConfirmationField && (
            <Box>
              <Typography variant="body2" sx={{ mb: 2, fontWeight: 500 }}>
                To confirm deletion, please type the following exactly:
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  p: 1.5,
                  mb: 2,
                  backgroundColor: alpha(theme.palette.error.main, 0.1),
                  border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  color: 'error.main',
                  fontWeight: 600,
                }}
              >
                {requiredConfirmationText}
              </Typography>
              <TextField
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={requiredConfirmationText}
                disabled={deletePaymentMethod.isPending}
                fullWidth
                variant="outlined"
                error={confirmationText.length > 0 && !isConfirmationValid}
                helperText={
                  confirmationText.length > 0 && !isConfirmationValid
                    ? "Text doesn't match. Please type exactly as shown above."
                    : 'Type the text above exactly to confirm deletion'
                }
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: alpha('#fff', 0.05),
                    fontFamily: 'monospace',
                    '&:hover': {
                      backgroundColor: alpha('#fff', 0.08),
                    },
                    '&.Mui-focused': {
                      backgroundColor: alpha('#fff', 0.1),
                    },
                  },
                }}
              />
            </Box>
          )}

          {/* General Warning */}
          {!showConfirmationField && (
            <Typography variant="body2" color="text.secondary">
              Are you sure you want to delete this payment method? This action cannot be undone.
            </Typography>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button
          onClick={handleClose}
          disabled={deletePaymentMethod.isPending}
          sx={{
            minWidth: 100,
            color: 'text.secondary',
            '&:hover': {
              backgroundColor: alpha('#fff', 0.05),
            },
          }}
        >
          Cancel
        </Button>

        {!showConfirmationField ? (
          <Button
            onClick={handleDeleteClick}
            variant="contained"
            color="error"
            disabled={deletePaymentMethod.isPending}
            startIcon={
              deletePaymentMethod.isPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <DeleteIcon />
              )
            }
            sx={{
              minWidth: 120,
              fontWeight: 600,
              boxShadow: 2,
              '&:hover': {
                boxShadow: 4,
              },
              '&:disabled': {
                backgroundColor: alpha(theme.palette.error.main, 0.3),
                color: alpha('#fff', 0.7),
              },
            }}
          >
            {deletePaymentMethod.isPending ? 'Deleting...' : 'Delete Method'}
          </Button>
        ) : (
          <Button
            onClick={handleConfirmedDelete}
            variant="contained"
            color="error"
            disabled={deletePaymentMethod.isPending || !isConfirmationValid}
            startIcon={
              deletePaymentMethod.isPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <DeleteIcon />
              )
            }
            sx={{
              minWidth: 150,
              fontWeight: 600,
              boxShadow: 2,
              '&:hover': {
                boxShadow: 4,
              },
              '&:disabled': {
                backgroundColor: alpha(theme.palette.error.main, 0.3),
                color: alpha('#fff', 0.7),
              },
            }}
          >
            {deletePaymentMethod.isPending ? 'Deleting...' : 'Confirm Delete'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PaymentMethodDeleteDialog;
