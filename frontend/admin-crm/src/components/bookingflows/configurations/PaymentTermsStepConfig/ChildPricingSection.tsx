// frontend/admin-crm/src/components/bookingflows/configurations/PaymentTermsStepConfig/ChildPricingSection.tsx

import React from 'react';
import {
  Box,
  TextField,
  FormControlLabel,
  Switch,
  Typography,
  Stack,
  Alert,
  Button,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  ChildCare as ChildCareIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import type { ChildPricingTier, PaymentTermsFormData } from './types';

interface ChildPricingSectionProps {
  formData: PaymentTermsFormData;
  paymentSettings: Record<string, unknown> | undefined;
  onSwitchChange: (
    field: keyof PaymentTermsFormData,
  ) => (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAddTier: () => void;
  onUpdateTier: (index: number, field: keyof ChildPricingTier, value: string | number) => void;
  onRemoveTier: (index: number) => void;
  renderGlobalDefault: (field: string, value: unknown) => string;
}

export const ChildPricingSection: React.FC<ChildPricingSectionProps> = ({
  formData,
  paymentSettings,
  onSwitchChange,
  onAddTier,
  onUpdateTier,
  onRemoveTier,
  renderGlobalDefault,
}) => {
  const ps = paymentSettings as Record<string, unknown> | undefined;

  return (
    <Box>
      <Typography
        variant="subtitle2"
        gutterBottom
        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <ChildCareIcon fontSize="small" />
        Child/Youth Pricing Override
      </Typography>

      <Stack spacing={2}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.child_pricing_enabled === true}
              onChange={onSwitchChange('child_pricing_enabled')}
            />
          }
          label={`Enable Child Pricing (Global: ${renderGlobalDefault('child_pricing_enabled', ps?.child_pricing_enabled)})`}
        />

        {formData.child_pricing_enabled && (
          <>
            <Alert severity="info" sx={{ mb: 1 }}>
              Define age-based pricing tiers. Use 100% discount for free entry.
            </Alert>

            {(formData.child_pricing_tiers || []).map((tier, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <TextField
                  label="Min Age"
                  type="number"
                  value={tier.min_age}
                  onChange={(e) => onUpdateTier(index, 'min_age', parseInt(e.target.value) || 0)}
                  size="small"
                  sx={{ width: 100 }}
                />
                <TextField
                  label="Max Age"
                  type="number"
                  value={tier.max_age}
                  onChange={(e) => onUpdateTier(index, 'max_age', parseInt(e.target.value) || 0)}
                  size="small"
                  sx={{ width: 100 }}
                />
                <TextField
                  label="Discount %"
                  type="number"
                  value={tier.discount_percentage}
                  onChange={(e) =>
                    onUpdateTier(index, 'discount_percentage', parseInt(e.target.value) || 0)
                  }
                  size="small"
                  sx={{ width: 120 }}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                />
                <TextField
                  label="Label"
                  value={tier.label}
                  onChange={(e) => onUpdateTier(index, 'label', e.target.value)}
                  size="small"
                  sx={{ flex: 1, minWidth: 150 }}
                  placeholder="e.g., Child, Infant"
                />
                <IconButton onClick={() => onRemoveTier(index)} color="error" size="small">
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}

            <Button variant="outlined" startIcon={<AddIcon />} onClick={onAddTier} size="small">
              Add Pricing Tier
            </Button>
          </>
        )}
      </Stack>
    </Box>
  );
};
