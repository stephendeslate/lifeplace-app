import React from 'react';
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  InputAdornment,
} from '@mui/material';
import type { ProductFormData } from '@/types/products.types';

interface PricingSectionProps {
  formData: ProductFormData;
  errors: Record<string, string>;
  onInputChange: (
    field: keyof ProductFormData,
  ) => (
    event:
      | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | { target: { value: unknown } },
  ) => void;
  onSwitchChange: (
    field: keyof ProductFormData,
  ) => (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({
  formData,
  errors,
  onInputChange,
  onSwitchChange,
}) => {
  return (
    <>
      <Typography variant="h6" gutterBottom>
        Pricing
      </Typography>

      <Box display="flex" flexDirection="column" gap={2}>
        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
          <Box flex={1}>
            <FormControl fullWidth>
              <InputLabel>Pricing Model</InputLabel>
              <Select
                value={formData.pricing_model}
                onChange={onInputChange('pricing_model')}
                label="Pricing Model"
              >
                <MenuItem value="FIXED">Fixed Price</MenuItem>
                <MenuItem value="HOURLY">Hourly Rate</MenuItem>
                <MenuItem value="TIERED">Tiered Pricing</MenuItem>
                <MenuItem value="CUSTOM">Custom Quote</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box flex={1}>
            <FormControl fullWidth>
              <InputLabel>Pricing Unit</InputLabel>
              <Select
                value={formData.pricing_unit}
                onChange={onInputChange('pricing_unit')}
                label="Pricing Unit"
              >
                <MenuItem value="PER_EVENT">Per Event</MenuItem>
                <MenuItem value="PER_PERSON">Per Person</MenuItem>
                <MenuItem value="PER_HOUR">Per Hour</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
          <Box flex={1}>
            <TextField
              fullWidth
              label="Base Price"
              value={formData.base_price}
              onChange={onInputChange('base_price')}
              error={!!errors.base_price}
              helperText={errors.base_price}
              type="number"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">{formData.currency}</InputAdornment>
                ),
              }}
              disabled={formData.pricing_model === 'CUSTOM'}
              required
            />
          </Box>

          <Box flex={1} display="flex" alignItems="center">
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_tax_inclusive}
                  onChange={onSwitchChange('is_tax_inclusive')}
                />
              }
              label="Tax Inclusive"
            />
          </Box>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Pricing Unit determines how the price is displayed to clients (e.g., "per person" for
          camps, "per event" for weddings). If Tax Inclusive is enabled, the base price already
          includes tax.
        </Typography>
      </Box>
    </>
  );
};
