// frontend/admin-crm/src/components/payments/PaymentGatewayFormDialog.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Divider,
  CircularProgress,
  Alert,
  Collapse,
  Stack,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { useCreatePaymentGateway, useUpdatePaymentGateway } from '../../hooks/usePayments';
import type { 
  PaymentGateway, 
  PaymentGatewayFormData,
  PayMongoConfig,
} from '../../types/payments.types';

interface PaymentGatewayFormDialogProps {
  open: boolean;
  onClose: () => void;
  gateway?: PaymentGateway | null;
}

export const PaymentGatewayFormDialog: React.FC<PaymentGatewayFormDialogProps> = ({
  open,
  onClose,
  gateway,
}) => {
  const [formData, setFormData] = useState<PaymentGatewayFormData>({
    name: '',
    code: '',
    is_active: true,
    config: {},
    description: '',
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { mutate: createGateway, isPending: isCreating } = useCreatePaymentGateway();
  const { mutate: updateGateway, isPending: isUpdating } = useUpdatePaymentGateway();

  const isEditing = !!gateway;
  const isSubmitting = isCreating || isUpdating;

  // Initialize form data
  useEffect(() => {
    if (gateway) {
      setFormData({
        name: gateway.name,
        code: gateway.code,
        is_active: gateway.is_active,
        config: gateway.config || {},
        description: gateway.description,
      });
    } else {
      setFormData({
        name: '',
        code: '',
        is_active: true,
        config: {},
        description: '',
      });
    }
    setErrors({});
    setShowAdvanced(false);
  }, [gateway, open]);

  const handleChange = (field: keyof PaymentGatewayFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'is_active' ? event.target.checked : event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePayMongoConfigChange = (field: keyof PayMongoConfig) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'test_mode' ? event.target.checked : event.target.value;
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [field]: value,
      },
    }));
  };

  const setupPayMongo = () => {
    setFormData(prev => ({
      ...prev,
      name: 'PayMongo',
      code: 'paymongo',
      description: 'PayMongo payment gateway for Philippines',
      config: {
        public_key: '',
        secret_key: '',
        webhook_secret: '',
        test_mode: true,
      },
    }));
    setShowAdvanced(true);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Gateway name is required';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Gateway code is required';
    } else if (!/^[a-z0-9_-]+$/.test(formData.code)) {
      newErrors.code = 'Code must contain only lowercase letters, numbers, underscores, and hyphens';
    }

    // PayMongo specific validation
    if (formData.code === 'paymongo') {
      const config = formData.config as PayMongoConfig;
      if (!config.public_key?.trim()) {
        newErrors.public_key = 'Public key is required for PayMongo';
      }
      if (!config.secret_key?.trim()) {
        newErrors.secret_key = 'Secret key is required for PayMongo';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const submitData = {
      name: formData.name.trim(),
      code: formData.code.trim(),
      is_active: formData.is_active,
      config: formData.config,
      description: formData.description.trim(),
    };

    if (isEditing && gateway) {
      updateGateway({ id: gateway.id, data: submitData }, {
        onSuccess: () => onClose(),
      });
    } else {
      createGateway(submitData, {
        onSuccess: () => onClose(),
      });
    }
  };

  const isPayMongo = formData.code === 'paymongo';
  const paymongoConfig = formData.config as PayMongoConfig;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {isEditing ? 'Edit Payment Gateway' : 'Add Payment Gateway'}
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* Quick Setup for PayMongo */}
          {!isEditing && (
            <Alert 
              severity="info" 
              sx={{ mb: 3 }}
              action={
                <Button color="inherit" size="small" onClick={setupPayMongo}>
                  Setup PayMongo
                </Button>
              }
            >
              For Philippine businesses, we recommend using PayMongo for secure payment processing.
            </Alert>
          )}

          {/* Basic Information */}
          <Stack spacing={3}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 3
            }}>
              <TextField
                fullWidth
                label="Gateway Name"
                value={formData.name}
                onChange={handleChange('name')}
                error={!!errors.name}
                helperText={errors.name}
                placeholder="e.g., PayMongo, Stripe, PayPal"
              />
              
              <TextField
                fullWidth
                label="Gateway Code"
                value={formData.code}
                onChange={handleChange('code')}
                error={!!errors.code}
                helperText={errors.code || 'Unique identifier (lowercase, no spaces)'}
                placeholder="e.g., paymongo, stripe, paypal"
                disabled={isEditing}
              />
            </Box>

            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={handleChange('description')}
              multiline
              rows={2}
              placeholder="Brief description of this payment gateway"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={handleChange('is_active')}
                />
              }
              label="Enable this gateway"
            />
          </Stack>

          {/* PayMongo Configuration */}
          {isPayMongo && (
            <>
              <Divider sx={{ my: 3 }} />
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  PayMongo Configuration
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Enter your PayMongo API credentials. You can find these in your PayMongo dashboard.
                </Typography>
              </Box>

              <Stack spacing={3}>
                <TextField
                  fullWidth
                  label="Public Key"
                  value={paymongoConfig.public_key || ''}
                  onChange={handlePayMongoConfigChange('public_key')}
                  error={!!errors.public_key}
                  helperText={errors.public_key || 'Starts with pk_test_ or pk_live_'}
                  placeholder="pk_test_..."
                />

                <TextField
                  fullWidth
                  label="Secret Key"
                  type="password"
                  value={paymongoConfig.secret_key || ''}
                  onChange={handlePayMongoConfigChange('secret_key')}
                  error={!!errors.secret_key}
                  helperText={errors.secret_key || 'Starts with sk_test_ or sk_live_'}
                  placeholder="sk_test_..."
                  InputProps={{
                    startAdornment: <SecurityIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />

                <TextField
                  fullWidth
                  label="Webhook Secret"
                  type="password"
                  value={paymongoConfig.webhook_secret || ''}
                  onChange={handlePayMongoConfigChange('webhook_secret')}
                  helperText="Used to verify webhook authenticity (optional)"
                  placeholder="whsec_..."
                />

                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={paymongoConfig.test_mode || false}
                        onChange={handlePayMongoConfigChange('test_mode')}
                      />
                    }
                    label="Test Mode"
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                    Use test keys for development and testing
                  </Typography>
                </Box>
              </Stack>
            </>
          )}

          {/* Advanced Configuration */}
          <Box sx={{ mt: 3 }}>
            <Button
              onClick={() => setShowAdvanced(!showAdvanced)}
              endIcon={showAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              variant="text"
              color="primary"
            >
              Advanced Configuration
            </Button>
            
            <Collapse in={showAdvanced}>
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  For custom gateway configurations, add JSON configuration here.
                </Typography>
                
                <TextField
                  fullWidth
                  label="Custom Configuration (JSON)"
                  value={JSON.stringify(formData.config, null, 2)}
                  onChange={(e) => {
                    try {
                      const config = JSON.parse(e.target.value);
                      setFormData(prev => ({ ...prev, config }));
                    } catch {
                      // Invalid JSON, don't update
                    }
                  }}
                  multiline
                  rows={6}
                  variant="outlined"
                  sx={{ fontFamily: 'monospace' }}
                />
              </Box>
            </Collapse>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <CircularProgress size={20} />
          ) : (
            isEditing ? 'Update Gateway' : 'Create Gateway'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};