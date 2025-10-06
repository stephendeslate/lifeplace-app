// frontend/admin-crm/src/components/payments/PaymentGatewayFormDialog.tsx

import React, { useState, useEffect } from 'react';
import {
  TextField,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Divider,
  Alert,
  Collapse,
  Stack,
  Chip,
  Button,
} from '@mui/material';
import { ModernDialog, createDialogActions } from '../common';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Security as SecurityIcon,
  CreditCard as StripeIcon,
  Payment as PayMongoIcon,
} from '@mui/icons-material';
import { useCreatePaymentGateway, useUpdatePaymentGateway } from '../../hooks/usePayments';
import type { 
  PaymentGateway, 
  PaymentGatewayFormData,
  StripeConfig,
  PayMongoConfig,
} from '../../types/payments.types';
import { GATEWAY_TEMPLATES } from '../../types/payments.types';
import { tokens } from '../../design-system/tokens';

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
      // Use masked_config for initial display if available, but keep empty config for new values
      const initialConfig = gateway.masked_config && Object.keys(gateway.masked_config).length > 0
        ? {
            // Only populate non-sensitive fields and masked fields for display
            test_mode: gateway.masked_config.test_mode || false,
            environment: gateway.masked_config.environment || 'sandbox',
            // Keep sensitive fields empty for editing (they'll show as placeholders)
          }
        : {};

      setFormData({
        name: gateway.name,
        code: gateway.code,
        is_active: gateway.is_active,
        config: initialConfig,
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

  const handleStripeConfigChange = (field: keyof StripeConfig) => (
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

  const setupGateway = (gatewayType: 'stripe' | 'paymongo') => {
    const template = GATEWAY_TEMPLATES[gatewayType];
    setFormData(prev => ({
      ...prev,
      name: template.name,
      code: template.code,
      description: template.description,
      config: template.config as unknown as Record<string, unknown>,
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

    // Stripe specific validation
    if (formData.code === 'stripe') {
      const config = formData.config as unknown as StripeConfig;
      if (!config.publishable_key?.trim()) {
        newErrors.publishable_key = 'Publishable key is required for Stripe';
      }
      if (!config.secret_key?.trim()) {
        newErrors.secret_key = 'Secret key is required for Stripe';
      }
    }

    // PayMongo specific validation
    if (formData.code === 'paymongo') {
      const config = formData.config as unknown as PayMongoConfig;
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

    // For editing, merge with existing config to preserve values for empty fields
    let finalConfig = formData.config;

    if (isEditing && gateway?.masked_config) {
      // Only include fields that have values to avoid overwriting existing config with empty strings
      const configToUpdate: Record<string, unknown> = {};

      // Copy over existing non-sensitive fields that we want to keep
      if ('test_mode' in formData.config) {
        configToUpdate.test_mode = formData.config.test_mode;
      }
      if ('environment' in formData.config) {
        configToUpdate.environment = formData.config.environment;
      }

      // Only add sensitive fields if they have values
      Object.entries(formData.config).forEach(([key, value]) => {
        if (value && typeof value === 'string' && value.trim() !== '') {
          configToUpdate[key] = value.trim();
        }
      });

      finalConfig = configToUpdate;
    }

    const submitData = {
      name: formData.name.trim(),
      code: formData.code.trim(),
      is_active: formData.is_active,
      config: finalConfig,
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

  const isStripe = formData.code === 'stripe';
  const isPayMongo = formData.code === 'paymongo';
  const stripeConfig = formData.config as unknown as StripeConfig;
  const paymongoConfig = formData.config as unknown as PayMongoConfig;

  const actions = createDialogActions(
    onClose,
    handleSubmit,
    {
      cancelLabel: 'Cancel',
      confirmLabel: isEditing ? 'Update Gateway' : 'Create Gateway',
      isLoading: isSubmitting,
      confirmDisabled: isSubmitting,
    }
  );

  return (
    <ModernDialog
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Payment Gateway' : 'Add Payment Gateway'}
      actions={actions}
      maxWidth="md"
      fullWidth
      contentSx={{ minHeight: '60vh' }}
    >
        <Box sx={{ mt: 2 }}>
          {/* Configuration Status for Editing */}
          {isEditing && gateway?.masked_config && (
            <Box sx={{ mb: 3 }}>
              <Alert
                severity={gateway.masked_config._configured ? "success" : "warning"}
                sx={{
                  backdropFilter: 'blur(10px)',
                  background: gateway.masked_config._configured ?
                    'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)',
                  borderRadius: tokens.spacing.radius.lg,
                  border: `1px solid ${gateway.masked_config._configured ?
                    tokens.color.success[500] : tokens.color.warning[500]}25`,
                }}
              >
                <strong>
                  {gateway.masked_config._configured ?
                    '✅ Gateway Configured' :
                    '⚠️ Configuration Incomplete'
                  }
                </strong>
                <br />
                {gateway.masked_config._configured ?
                  'This gateway has all required API keys configured. Leave fields empty to keep existing values.' :
                  'This gateway is missing required configuration. Please provide the necessary API keys.'
                }
              </Alert>
            </Box>
          )}

          {/* Quick Setup Options */}
          {!isEditing && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Quick Setup
              </Typography>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  startIcon={<StripeIcon />}
                  onClick={() => setupGateway('stripe')}
                  size="small"
                >
                  Setup Stripe
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PayMongoIcon />}
                  onClick={() => setupGateway('paymongo')}
                  size="small"
                >
                  Setup PayMongo
                </Button>
              </Stack>
              
              <Alert 
                severity="info" 
                sx={{ 
                  mt: 2,
                  backdropFilter: 'blur(10px)',
                  background: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: tokens.spacing.radius.lg,
                  border: `1px solid ${tokens.color.borders.glass}`,
                }}
              >
                <strong>Recommendation:</strong> Start with Stripe for immediate development, 
                then add PayMongo for Philippine-specific payment methods.
              </Alert>
            </Box>
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
                placeholder="e.g., Stripe, PayMongo, PayPal"
              />
              
              <TextField
                fullWidth
                label="Gateway Code"
                value={formData.code}
                onChange={handleChange('code')}
                error={!!errors.code}
                helperText={errors.code || 'Unique identifier (lowercase, no spaces)'}
                placeholder="e.g., stripe, paymongo, paypal"
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

          {/* Stripe Configuration */}
          {isStripe && (
            <>
              <Divider sx={{ my: 3 }} />
              
              <Box sx={{ mb: 2 }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <StripeIcon color="primary" />
                  <Typography variant="h6">
                    Stripe Configuration
                  </Typography>
                  <Chip 
                    label="Recommended" 
                    size="small" 
                    color="success" 
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Enter your Stripe API keys from your Stripe Dashboard → Developers → API Keys.
                </Typography>
              </Box>

              <Stack spacing={3}>
                <TextField
                  fullWidth
                  label="Publishable Key"
                  value={stripeConfig.publishable_key || ''}
                  onChange={handleStripeConfigChange('publishable_key')}
                  error={!!errors.publishable_key}
                  helperText={
                    errors.publishable_key ||
                    (gateway?.masked_config?.publishable_key ?
                      `Currently configured: ${gateway.masked_config.publishable_key}` :
                      'Starts with pk_test_ or pk_live_'
                    )
                  }
                  placeholder={
                    gateway?.masked_config?.publishable_key ?
                      'Leave empty to keep current key' :
                      'pk_test_...'
                  }
                />

                <TextField
                  fullWidth
                  label="Secret Key"
                  type="password"
                  value={stripeConfig.secret_key || ''}
                  onChange={handleStripeConfigChange('secret_key')}
                  error={!!errors.secret_key}
                  helperText={
                    errors.secret_key ||
                    (gateway?.masked_config?.secret_key ?
                      `Currently configured: ${gateway.masked_config.secret_key}` :
                      'Starts with sk_test_ or sk_live_'
                    )
                  }
                  placeholder={
                    gateway?.masked_config?.secret_key ?
                      'Leave empty to keep current key' :
                      'sk_test_...'
                  }
                  InputProps={{
                    startAdornment: <SecurityIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />

                <TextField
                  fullWidth
                  label="Webhook Endpoint Secret"
                  type="password"
                  value={stripeConfig.webhook_secret || ''}
                  onChange={handleStripeConfigChange('webhook_secret')}
                  helperText={
                    gateway?.masked_config?.webhook_secret ?
                      `Currently configured: ${gateway.masked_config.webhook_secret}` :
                      'Used to verify webhook authenticity (optional)'
                  }
                  placeholder={
                    gateway?.masked_config?.webhook_secret ?
                      'Leave empty to keep current secret' :
                      'whsec_...'
                  }
                />

                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={stripeConfig.test_mode || false}
                        onChange={handleStripeConfigChange('test_mode')}
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

          {/* PayMongo Configuration */}
          {isPayMongo && (
            <>
              <Divider sx={{ my: 3 }} />
              
              <Box sx={{ mb: 2 }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <PayMongoIcon color="primary" />
                  <Typography variant="h6">
                    PayMongo Configuration
                  </Typography>
                  <Chip 
                    label="Philippines" 
                    size="small" 
                    color="info" 
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Enter your PayMongo API credentials from your PayMongo Dashboard → Developers → API Keys.
                </Typography>
              </Box>

              <Stack spacing={3}>
                <TextField
                  fullWidth
                  label="Public Key"
                  value={paymongoConfig.public_key || ''}
                  onChange={handlePayMongoConfigChange('public_key')}
                  error={!!errors.public_key}
                  helperText={
                    errors.public_key ||
                    (gateway?.masked_config?.public_key ?
                      `Currently configured: ${gateway.masked_config.public_key}` :
                      'Starts with pk_test_ or pk_live_'
                    )
                  }
                  placeholder={
                    gateway?.masked_config?.public_key ?
                      'Leave empty to keep current key' :
                      'pk_test_...'
                  }
                />

                <TextField
                  fullWidth
                  label="Secret Key"
                  type="password"
                  value={paymongoConfig.secret_key || ''}
                  onChange={handlePayMongoConfigChange('secret_key')}
                  error={!!errors.secret_key}
                  helperText={
                    errors.secret_key ||
                    (gateway?.masked_config?.secret_key ?
                      `Currently configured: ${gateway.masked_config.secret_key}` :
                      'Starts with sk_test_ or sk_live_'
                    )
                  }
                  placeholder={
                    gateway?.masked_config?.secret_key ?
                      'Leave empty to keep current key' :
                      'sk_test_...'
                  }
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
                  helperText={
                    gateway?.masked_config?.webhook_secret ?
                      `Currently configured: ${gateway.masked_config.webhook_secret}` :
                      'Used to verify webhook authenticity (optional)'
                  }
                  placeholder={
                    gateway?.masked_config?.webhook_secret ?
                      'Leave empty to keep current secret' :
                      'whsec_...'
                  }
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
    </ModernDialog>
  );
};