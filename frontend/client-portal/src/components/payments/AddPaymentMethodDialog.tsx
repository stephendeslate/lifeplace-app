// frontend/client-portal/src/components/payments/AddPaymentMethodDialog.tsx

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  Alert,
  FormControlLabel,
  Checkbox,
  alpha,
} from '@mui/material';
import { Close as CloseIcon, CheckCircle as SuccessIcon } from '@mui/icons-material';
import { PaymentGatewaySelector } from './PaymentGatewaySelector';
import { UnifiedStripePaymentFlow } from './UnifiedStripePaymentFlow';
import { GlassCard } from '../../design-system';
import type {
  PaymentFlowResult,
  PaymentFlowError,
  SaveModeConfig,
} from '../../types/unified-payment-flow.types';
import type { PaymentGateway } from '../../types/financial.types';

interface AddPaymentMethodDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddPaymentMethodDialog: React.FC<AddPaymentMethodDialogProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleGatewaySelect = (gateway: PaymentGateway | null) => {
    setSelectedGateway(gateway);
    setError(null);
  };

  const handleClose = useCallback(() => {
    // Reset all state when closing
    setSelectedGateway(null);
    setSaveAsDefault(false);
    setNickname('');
    setLoading(false);
    setError(null);
    setSuccess(false);
    setSuccessMessage(null);
    onClose();
  }, [onClose]);

  const handleSuccess = useCallback(
    (result: PaymentFlowResult) => {
      if (result.mode === 'save' && result.saveResult) {
        setSuccess(true);
        setSuccessMessage(
          'Payment method added successfully! You can now use it for future payments.',
        );

        // Close dialog and notify parent after showing success briefly
        setTimeout(() => {
          onSuccess?.();
          handleClose();
        }, 2000);
      }
    },
    [onSuccess, handleClose],
  );

  const handleError = useCallback((error: PaymentFlowError) => {
    setError(error.message);
    setLoading(false);
  }, []);

  // Success state display
  if (success) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogContent>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: 4,
            }}
          >
            <SuccessIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              Payment Method Added!
            </Typography>
            <Typography variant="body1" color="text.secondary" textAlign="center">
              {successMessage || 'Your payment method has been saved successfully.'}
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  // Main dialog content
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: alpha('#fff', 0.95),
          backdropFilter: 'blur(10px)',
        },
      }}
    >
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Add Payment Method
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Save a payment method for faster checkout
            </Typography>
          </Box>
          <Button onClick={handleClose} sx={{ minWidth: 'auto', p: 1 }} disabled={loading}>
            <CloseIcon />
          </Button>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          {/* Gateway Selection */}
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Select Payment Gateway
            </Typography>
            <PaymentGatewaySelector
              selectedGateway={selectedGateway}
              onGatewaySelect={handleGatewaySelect}
              disabled={loading}
              showTitle={false}
              required={true}
            />
          </Box>

          {/* Payment Method Configuration */}
          {selectedGateway && (
            <GlassCard variant="light" intensity="subtle" sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Payment Method Options
                </Typography>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={saveAsDefault}
                      onChange={(e) => setSaveAsDefault(e.target.checked)}
                      color="primary"
                      disabled={loading}
                    />
                  }
                  label="Set as default payment method"
                  sx={{
                    '& .MuiFormControlLabel-label': {
                      fontSize: '0.875rem',
                      color: 'text.secondary',
                    },
                  }}
                />
              </Stack>
            </GlassCard>
          )}

          {/* Payment Form */}
          {selectedGateway?.code === 'stripe' && (
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Payment Information
              </Typography>

              <UnifiedStripePaymentFlow
                config={
                  {
                    mode: 'save',
                    save_as_default: saveAsDefault,
                    nickname: nickname || undefined,
                  } as SaveModeConfig
                }
                gateway={selectedGateway}
                onSuccess={handleSuccess}
                onError={handleError}
                disabled={loading}
                loading={loading}
              />
            </Box>
          )}

          {/* Error Display */}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Stack>
      </DialogContent>

      {/* Footer Actions - Only show if gateway not selected yet */}
      {!selectedGateway && (
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="contained" disabled={!selectedGateway} sx={{ minWidth: 120 }}>
            Continue
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default AddPaymentMethodDialog;
