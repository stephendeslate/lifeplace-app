// frontend/client-portal/src/components/payments/PaymentMethodSelector.tsx

import React, { useState } from 'react';
import {
  Box,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  AccountBalance as BankIcon,
  Payment as PaymentIcon,
  Add as AddIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GlassCard } from '../../design-system';
import { PaymentGatewaySelector } from './PaymentGatewaySelector';
import FinancialApi from '../../apis/financial.api';
import type { PaymentMethod, PaymentMethodFormData, PaymentGateway } from '../../types/financial.types';

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod | null;
  onMethodSelect: (method: PaymentMethod | null) => void;
  disabled?: boolean;
  showAddNew?: boolean;
  allowedTypes?: PaymentMethod['type'][];
}

const PaymentMethodIcon: React.FC<{ type: PaymentMethod['type'] }> = ({ type }) => {
  switch (type) {
    case 'CREDIT_CARD':
      return <CreditCardIcon />;
    case 'BANK_TRANSFER':
      return <BankIcon />;
    case 'DIGITAL_WALLET':
      return <PaymentIcon />;
    default:
      return <PaymentIcon />;
  }
};

const AddPaymentMethodDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onSuccess: (method: PaymentMethod) => void;
}> = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<PaymentMethodFormData>({
    type: 'CREDIT_CARD',
    is_default: false,
    nickname: '',
    instructions: '',
  });
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: PaymentMethodFormData) => FinancialApi.createPaymentMethod(data),
    onSuccess: (method) => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
      onSuccess(method);
      onClose();
      handleReset();
    },
    onError: (error) => {
      setErrors({ general: error instanceof Error ? error.message : 'Failed to create payment method' });
    },
  });

  const handleReset = () => {
    setFormData({
      type: 'CREDIT_CARD',
      is_default: false,
      nickname: '',
      instructions: '',
    });
    setSelectedGateway(null);
    setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};
    if (!formData.nickname?.trim()) {
      newErrors.nickname = 'Nickname is required';
    }

    // Require gateway selection for payment types that need it
    const requiresGateway = ['CREDIT_CARD', 'DIGITAL_WALLET'].includes(formData.type);
    if (requiresGateway && !selectedGateway) {
      newErrors.gateway = 'Please select a payment gateway';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Include gateway in form data if selected
    const finalFormData: PaymentMethodFormData = {
      ...formData,
      ...(selectedGateway && { gateway: selectedGateway.id }),
    };

    createMutation.mutate(finalFormData);
  };

  const handleClose = () => {
    onClose();
    handleReset();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Add Payment Method</Typography>
            <Button onClick={handleClose} sx={{ minWidth: 'auto', p: 1 }}>
              <CloseIcon />
            </Button>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <TextField
                select
                label="Payment Type"
                value={formData.type}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  type: e.target.value as PaymentMethod['type']
                }))}
                required
              >
                <MenuItem value="CREDIT_CARD">Credit/Debit Card</MenuItem>
                <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
                <MenuItem value="DIGITAL_WALLET">Digital Wallet</MenuItem>
                <MenuItem value="CHECK">Check</MenuItem>
                <MenuItem value="CASH">Cash</MenuItem>
              </TextField>
            </FormControl>

            <TextField
              label="Nickname"
              value={formData.nickname}
              onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
              error={!!errors.nickname}
              helperText={errors.nickname || 'A friendly name for this payment method'}
              required
              fullWidth
            />

            <TextField
              label="Instructions"
              value={formData.instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
              multiline
              rows={3}
              placeholder="Special instructions or notes for this payment method..."
              fullWidth
            />

            {/* Show gateway selector for payment types that require it */}
            {['CREDIT_CARD', 'DIGITAL_WALLET'].includes(formData.type) && (
              <Box>
                <PaymentGatewaySelector
                  selectedGateway={selectedGateway}
                  onGatewaySelect={setSelectedGateway}
                  disabled={createMutation.isPending}
                  showTitle={true}
                  required={true}
                />
                {errors.gateway && (
                  <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                    {errors.gateway}
                  </Typography>
                )}
              </Box>
            )}

            <FormControlLabel
              control={
                <Radio
                  checked={formData.is_default}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
                />
              }
              label="Set as default payment method"
            />

            {errors.general && (
              <Alert severity="error">{errors.general}</Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={createMutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={createMutation.isPending}
            startIcon={createMutation.isPending && <CircularProgress size={20} />}
          >
            {createMutation.isPending ? 'Adding...' : 'Add Payment Method'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selectedMethod,
  onMethodSelect,
  disabled = false,
  showAddNew = true,
  allowedTypes,
}) => {
  const theme = useTheme();
  const [showAddDialog, setShowAddDialog] = useState(false);

  const {
    data: paymentMethods,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: () => FinancialApi.getPaymentMethods(),
  });

  // Filter payment methods by allowed types with defensive programming
  const filteredMethods = Array.isArray(paymentMethods)
    ? paymentMethods.filter(method =>
        !allowedTypes || allowedTypes.includes(method.type)
      )
    : [];

  const handleMethodChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const methodId = parseInt(event.target.value);
    const method = filteredMethods.find(m => m.id === methodId) || null;
    onMethodSelect(method);
  };

  const handleAddMethodSuccess = (newMethod: PaymentMethod) => {
    setShowAddDialog(false);
    onMethodSelect(newMethod);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Failed to load payment methods. Please try again.
      </Alert>
    );
  }

  if (!filteredMethods.length && !showAddNew) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        No payment methods available.
      </Alert>
    );
  }

  return (
    <>
      <GlassCard variant="light" intensity="subtle">
        <Box sx={{ p: 3 }}>
          <FormControl component="fieldset" fullWidth disabled={disabled}>
            <RadioGroup
              value={selectedMethod?.id || ''}
              onChange={handleMethodChange}
            >
              <Stack spacing={2}>
                {filteredMethods.map((method) => (
                  <Box key={method.id}>
                    <FormControlLabel
                      value={method.id}
                      control={<Radio />}
                      label={
                        <Box sx={{ ml: 1, flex: 1 }}>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <PaymentMethodIcon type={method.type} />
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                {method.nickname || method.type_display}
                              </Typography>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="body2" color="text.secondary">
                                  {method.type_display}
                                </Typography>
                                {method.last_four && (
                                  <Typography variant="body2" color="text.secondary">
                                    •••• {method.last_four}
                                  </Typography>
                                )}
                                {method.is_default && (
                                  <Chip
                                    label="Default"
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                  />
                                )}
                              </Stack>
                              {method.instructions && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                  {method.instructions}
                                </Typography>
                              )}
                            </Box>
                          </Stack>
                        </Box>
                      }
                      sx={{
                        m: 0,
                        p: 2,
                        border: `1px solid ${alpha('#fff', 0.1)}`,
                        borderRadius: 1,
                        backgroundColor: selectedMethod?.id === method.id
                          ? alpha(theme.palette.primary.main, 0.1)
                          : 'transparent',
                        '&:hover': {
                          backgroundColor: alpha('#fff', 0.05),
                        },
                      }}
                    />
                  </Box>
                ))}

                {showAddNew && (
                  <>
                    {filteredMethods.length > 0 && (
                      <Divider sx={{ my: 2, borderColor: alpha('#fff', 0.1) }} />
                    )}
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => setShowAddDialog(true)}
                      disabled={disabled}
                      sx={{
                        justifyContent: 'flex-start',
                        p: 2,
                        border: `1px dashed ${alpha('#fff', 0.3)}`,
                        backgroundColor: 'transparent',
                        '&:hover': {
                          backgroundColor: alpha('#fff', 0.05),
                          borderColor: alpha('#fff', 0.5),
                        },
                      }}
                    >
                      Add New Payment Method
                    </Button>
                  </>
                )}
              </Stack>
            </RadioGroup>
          </FormControl>

          {!filteredMethods.length && !showAddNew && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              No payment methods available
            </Typography>
          )}
        </Box>
      </GlassCard>

      <AddPaymentMethodDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSuccess={handleAddMethodSuccess}
      />
    </>
  );
};

export default PaymentMethodSelector;