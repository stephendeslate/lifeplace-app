// frontend/client-portal/src/components/payments/PaymentMethodEditDialog.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Box,
  Stack,
  Typography,
  CircularProgress,
  IconButton,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  CreditCard as CreditCardIcon,
  AccountBalance as AccountBalanceIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { useUpdatePaymentMethod } from '../../hooks/useFinancial';
import type { PaymentMethod, PaymentMethodFormData } from '../../types/financial.types';

interface PaymentMethodEditDialogProps {
  open: boolean;
  paymentMethod: PaymentMethod | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const PaymentMethodEditDialog: React.FC<PaymentMethodEditDialogProps> = ({
  open,
  paymentMethod,
  onClose,
  onSuccess,
}) => {
  const theme = useTheme();
  const [formData, setFormData] = useState({
    nickname: '',
    is_default: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updatePaymentMethod = useUpdatePaymentMethod();

  // Reset form when dialog opens/closes or payment method changes
  useEffect(() => {
    if (open && paymentMethod) {
      setFormData({
        nickname: paymentMethod.nickname || '',
        is_default: paymentMethod.is_default,
      });
      setErrors({});
    } else {
      setFormData({
        nickname: '',
        is_default: false,
      });
      setErrors({});
    }
  }, [open, paymentMethod]);

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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Nickname validation (optional but if provided must be reasonable length)
    if (formData.nickname && formData.nickname.trim().length > 50) {
      newErrors.nickname = 'Nickname must be 50 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!paymentMethod || !validateForm()) {
      return;
    }

    try {
      const updateData: Partial<PaymentMethodFormData> = {
        nickname: formData.nickname.trim() || undefined,
        is_default: formData.is_default,
      };

      await updatePaymentMethod.mutateAsync({
        methodId: paymentMethod.id,
        methodData: updateData,
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      // Error is handled by the hook's onError callback
      if (import.meta.env.DEV) console.error('Error updating payment method:', error);
    }
  };

  const handleClose = () => {
    if (!updatePaymentMethod.isPending) {
      onClose();
    }
  };

  if (!paymentMethod) {
    return null;
  }

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
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <EditIcon />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Edit Payment Method
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Update the nickname and default status for your payment method
              </Typography>
            </Box>
          </Stack>
          <IconButton
            onClick={handleClose}
            disabled={updatePaymentMethod.isPending}
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

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 2 }}>
          {/* Current Payment Method Info */}
          <Box
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 2,
              backgroundColor: alpha('#fff', 0.05),
              border: `1px solid ${alpha('#fff', 0.1)}`,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              {getPaymentMethodIcon(paymentMethod.type)}
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {paymentMethod.type_display}
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
            </Stack>
          </Box>

          <Stack spacing={3}>
            {/* Nickname Field */}
            <TextField
              label="Nickname"
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              placeholder="e.g., Main Credit Card, Business Account"
              helperText={errors.nickname || 'Give your payment method a memorable name (optional)'}
              error={!!errors.nickname}
              disabled={updatePaymentMethod.isPending}
              fullWidth
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: alpha('#fff', 0.05),
                  '&:hover': {
                    backgroundColor: alpha('#fff', 0.08),
                  },
                  '&.Mui-focused': {
                    backgroundColor: alpha('#fff', 0.1),
                  },
                },
              }}
            />

            {/* Default Status */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  disabled={updatePaymentMethod.isPending}
                  sx={{
                    '&.Mui-checked': {
                      color: theme.palette.primary.main,
                    },
                  }}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Set as default payment method
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    This payment method will be automatically selected for future payments
                  </Typography>
                </Box>
              }
              sx={{
                alignItems: 'flex-start',
                '& .MuiFormControlLabel-label': { mt: 0.5 },
              }}
            />

            {/* Security Notice */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                backgroundColor: alpha(theme.palette.info.main, 0.1),
                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              }}
            >
              <Typography variant="body2" color="info.main" sx={{ fontWeight: 500, mb: 1 }}>
                Security Note
              </Typography>
              <Typography variant="caption" color="text.secondary">
                For security reasons, you cannot modify the card details or payment method type. If
                you need to update your card information, please add a new payment method and delete
                this one.
              </Typography>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            onClick={handleClose}
            disabled={updatePaymentMethod.isPending}
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
          <Button
            type="submit"
            variant="contained"
            disabled={updatePaymentMethod.isPending}
            startIcon={
              updatePaymentMethod.isPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <EditIcon />
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
                backgroundColor: alpha(theme.palette.primary.main, 0.3),
                color: alpha('#fff', 0.7),
              },
            }}
          >
            {updatePaymentMethod.isPending ? 'Updating...' : 'Update Method'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default PaymentMethodEditDialog;
