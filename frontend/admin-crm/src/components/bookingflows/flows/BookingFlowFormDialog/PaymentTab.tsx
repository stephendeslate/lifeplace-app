// frontend/admin-crm/src/components/bookingflows/flows/BookingFlowFormDialog/PaymentTab.tsx

import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Stack,
  Alert,
  Chip,
  OutlinedInput,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import type { PaymentGateway } from '@/types/payments';
import { getGatewayPaymentMethods } from '@/types/payments';
import type { EnhancedBookingFlowFormData } from './useBookingFlowFormLogic';

interface PaymentTabProps {
  formData: EnhancedBookingFlowFormData;
  errors: Record<string, string>;
  paymentGatewaysData: PaymentGateway[];
  handleInputChange: (
    field: keyof EnhancedBookingFlowFormData,
  ) => (
    event:
      | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | SelectChangeEvent<string | number[]>
      | { target: { value: unknown } },
  ) => void;
  handleSwitchChange: (
    field: keyof EnhancedBookingFlowFormData,
  ) => (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleMultiSelectChange: (
    field: keyof EnhancedBookingFlowFormData,
  ) => (event: SelectChangeEvent<number[]>) => void;
}

export const PaymentTab: React.FC<PaymentTabProps> = ({
  formData,
  errors,
  paymentGatewaysData,
  handleInputChange,
  handleSwitchChange,
  handleMultiSelectChange,
}) => (
  <Stack spacing={3}>
    <Typography variant="h6" gutterBottom>
      Payment Gateway Configuration
    </Typography>

    <Alert severity="info">
      Configure payment processing for this booking flow. These settings control which payment
      methods are available to clients.
    </Alert>

    <FormControl fullWidth error={!!errors.allowed_payment_gateways}>
      <InputLabel>Allowed Payment Gateways</InputLabel>
      <Select
        multiple
        value={formData.allowed_payment_gateways}
        onChange={handleMultiSelectChange('allowed_payment_gateways')}
        input={<OutlinedInput label="Allowed Payment Gateways" />}
        renderValue={(selected) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {(selected as number[]).map((value) => {
              const gateway = paymentGatewaysData.find((g) => g.id === value);
              return (
                <Chip
                  key={value}
                  label={gateway?.name || `Gateway ${value}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              );
            })}
          </Box>
        )}
      >
        {paymentGatewaysData
          .filter((g) => g.is_active)
          .map((gateway) => (
            <MenuItem key={gateway.id} value={gateway.id}>
              <Box>
                <Typography variant="body2">{gateway.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {gateway.code}
                </Typography>
              </Box>
            </MenuItem>
          ))}
      </Select>
      {errors.allowed_payment_gateways && (
        <Typography variant="caption" color="error" sx={{ mt: 1 }}>
          {errors.allowed_payment_gateways}
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
        Leave empty to use all active payment gateways
      </Typography>
    </FormControl>

    {/* Payment Methods Preview */}
    {formData.allowed_payment_gateways.length > 0 && (
      <Box
        sx={{
          p: 2,
          bgcolor: 'primary.50',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'primary.200',
        }}
      >
        <Typography variant="subtitle2" color="primary.dark" gutterBottom>
          Available Payment Methods for Clients
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {Array.from(
            new Set(
              formData.allowed_payment_gateways.flatMap((gatewayId) => {
                const gateway = paymentGatewaysData.find((g) => g.id === gatewayId);
                if (!gateway) return [];
                return getGatewayPaymentMethods(gateway.code).map((m) => m.name);
              }),
            ),
          ).map((methodName) => (
            <Chip
              key={methodName}
              label={methodName}
              size="small"
              variant="outlined"
              sx={{ bgcolor: 'white' }}
            />
          ))}
        </Stack>
      </Box>
    )}

    <FormControl
      fullWidth
      error={!!errors.default_payment_gateway}
      disabled={formData.allowed_payment_gateways.length === 0}
    >
      <InputLabel>Default Payment Gateway</InputLabel>
      <Select
        value={formData.default_payment_gateway}
        onChange={handleInputChange('default_payment_gateway')}
        label="Default Payment Gateway"
      >
        <MenuItem value="">
          <em>No Default</em>
        </MenuItem>
        {paymentGatewaysData
          .filter(
            (g) =>
              g.is_active &&
              (formData.allowed_payment_gateways.length === 0 ||
                formData.allowed_payment_gateways.includes(g.id)),
          )
          .map((gateway) => (
            <MenuItem key={gateway.id} value={gateway.id.toString()}>
              {gateway.name}
            </MenuItem>
          ))}
      </Select>
      {errors.default_payment_gateway && (
        <Typography variant="caption" color="error" sx={{ mt: 1 }}>
          {errors.default_payment_gateway}
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
        Preferred payment gateway that will be pre-selected for clients
      </Typography>
    </FormControl>

    <Box display="flex" flexDirection="column" gap={2}>
      <FormControlLabel
        control={
          <Switch
            checked={formData.require_immediate_payment}
            onChange={handleSwitchChange('require_immediate_payment')}
          />
        }
        label="Require Immediate Payment"
      />
      <Typography variant="caption" color="text.secondary">
        Process payment during booking completion instead of generating invoices
      </Typography>
    </Box>

    {formData.require_immediate_payment && (
      <Alert severity="warning">
        When immediate payment is required, clients must complete payment to finish the booking
        process. Ensure you have at least one payment gateway configured and tested.
      </Alert>
    )}
  </Stack>
);
