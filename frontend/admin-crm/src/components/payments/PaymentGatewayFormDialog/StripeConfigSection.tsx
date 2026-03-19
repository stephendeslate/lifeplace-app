// frontend/admin-crm/src/components/payments/PaymentGatewayFormDialog/StripeConfigSection.tsx

import React from 'react';
import {
  TextField,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Divider,
  Stack,
  Chip,
} from '@mui/material';
import { Security as SecurityIcon, CreditCard as StripeIcon } from '@mui/icons-material';
import type { PaymentGateway, StripeConfig } from '@/types/payments';
import { getGatewayPaymentMethods } from '@/types/payments';

interface StripeConfigSectionProps {
  stripeConfig: StripeConfig;
  errors: Record<string, string>;
  gateway?: PaymentGateway | null;
  onConfigChange: (
    field: keyof StripeConfig,
  ) => (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const StripeConfigSection: React.FC<StripeConfigSectionProps> = ({
  stripeConfig,
  errors,
  gateway,
  onConfigChange,
}) => (
  <>
    <Divider sx={{ my: 3 }} />

    <Box sx={{ mb: 2 }}>
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <StripeIcon color="primary" />
        <Typography variant="h6">Stripe Configuration</Typography>
        <Chip label="Recommended" size="small" color="success" />
      </Box>
      <Typography variant="body2" color="text.secondary">
        Enter your Stripe API keys from your Stripe Dashboard &rarr; Developers &rarr; API Keys.
      </Typography>

      {/* Supported Payment Methods */}
      <Box
        sx={{
          mt: 2,
          p: 2,
          bgcolor: 'success.50',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'success.200',
        }}
      >
        <Typography variant="subtitle2" color="success.dark" gutterBottom>
          Supported Payment Methods
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {getGatewayPaymentMethods('stripe').map((method) => (
            <Chip
              key={method.code}
              label={method.icon.length <= 2 ? `${method.icon} ${method.name}` : method.name}
              size="small"
              variant="outlined"
              sx={{ bgcolor: 'white' }}
            />
          ))}
        </Stack>
      </Box>
    </Box>

    <Stack spacing={3}>
      <TextField
        fullWidth
        label="Publishable Key"
        value={stripeConfig.publishable_key || ''}
        onChange={onConfigChange('publishable_key')}
        error={!!errors.publishable_key}
        helperText={
          errors.publishable_key ||
          (gateway?.masked_config?.publishable_key
            ? `Currently configured: ${gateway.masked_config.publishable_key}`
            : 'Starts with pk_test_ or pk_live_')
        }
        placeholder={
          gateway?.masked_config?.publishable_key
            ? 'Leave empty to keep current key'
            : 'pk_test_...'
        }
      />

      <TextField
        fullWidth
        label="Secret Key"
        type="password"
        value={stripeConfig.secret_key || ''}
        onChange={onConfigChange('secret_key')}
        error={!!errors.secret_key}
        helperText={
          errors.secret_key ||
          (gateway?.masked_config?.secret_key
            ? `Currently configured: ${gateway.masked_config.secret_key}`
            : 'Starts with sk_test_ or sk_live_')
        }
        placeholder={
          gateway?.masked_config?.secret_key ? 'Leave empty to keep current key' : 'sk_test_...'
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
        onChange={onConfigChange('webhook_secret')}
        helperText={
          gateway?.masked_config?.webhook_secret
            ? `Currently configured: ${gateway.masked_config.webhook_secret}`
            : 'Used to verify webhook authenticity (optional)'
        }
        placeholder={
          gateway?.masked_config?.webhook_secret
            ? 'Leave empty to keep current secret'
            : 'whsec_...'
        }
      />

      <Box>
        <FormControlLabel
          control={
            <Switch
              checked={stripeConfig.test_mode || false}
              onChange={onConfigChange('test_mode')}
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
);
