// frontend/admin-crm/src/components/payments/PaymentGatewayFormDialog/PayMongoConfigSection.tsx

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
import { Security as SecurityIcon, Payment as PayMongoIcon } from '@mui/icons-material';
import type { PaymentGateway, PayMongoConfig } from '@/types/payments';
import { getGatewayPaymentMethods } from '@/types/payments';

interface PayMongoConfigSectionProps {
  paymongoConfig: PayMongoConfig;
  errors: Record<string, string>;
  gateway?: PaymentGateway | null;
  onConfigChange: (
    field: keyof PayMongoConfig,
  ) => (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const PayMongoConfigSection: React.FC<PayMongoConfigSectionProps> = ({
  paymongoConfig,
  errors,
  gateway,
  onConfigChange,
}) => (
  <>
    <Divider sx={{ my: 3 }} />

    <Box sx={{ mb: 2 }}>
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <PayMongoIcon color="primary" />
        <Typography variant="h6">PayMongo Configuration</Typography>
        <Chip label="Philippines" size="small" color="info" />
      </Box>
      <Typography variant="body2" color="text.secondary">
        Enter your PayMongo API credentials from your PayMongo Dashboard &rarr; Developers &rarr;
        API Keys.
      </Typography>

      {/* Supported Payment Methods */}
      <Box
        sx={{
          mt: 2,
          p: 2,
          bgcolor: 'info.50',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'info.200',
        }}
      >
        <Typography variant="subtitle2" color="info.dark" gutterBottom>
          Supported Payment Methods (Philippines)
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {getGatewayPaymentMethods('paymongo').map((method) => (
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
        label="Public Key"
        value={paymongoConfig.public_key || ''}
        onChange={onConfigChange('public_key')}
        error={!!errors.public_key}
        helperText={
          errors.public_key ||
          (gateway?.masked_config?.public_key
            ? `Currently configured: ${gateway.masked_config.public_key}`
            : 'Starts with pk_test_ or pk_live_')
        }
        placeholder={
          gateway?.masked_config?.public_key ? 'Leave empty to keep current key' : 'pk_test_...'
        }
      />

      <TextField
        fullWidth
        label="Secret Key"
        type="password"
        value={paymongoConfig.secret_key || ''}
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
        label="Webhook Secret"
        type="password"
        value={paymongoConfig.webhook_secret || ''}
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
              checked={paymongoConfig.test_mode || false}
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
