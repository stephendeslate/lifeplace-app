import React from 'react';
import {
  Box,
  TextField,
  Typography,
  Button,
  FormControlLabel,
  Switch,
  Stack,
  InputAdornment,
} from '@mui/material';
import {
  ChildCare as ChildCareIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import IconButton from '@mui/material/IconButton';
import { Controller } from 'react-hook-form';
import type { ChildPricingTier } from '@/types/payments';
import type { SectionProps } from './types';

interface ChildPricingSectionProps extends SectionProps {
  childPricingEnabled: boolean;
  childPricingTiers: ChildPricingTier[];
  onAddTier: () => void;
  onUpdateTier: (index: number, field: keyof ChildPricingTier, value: string | number) => void;
  onRemoveTier: (index: number) => void;
}

export const ChildPricingSection: React.FC<ChildPricingSectionProps> = ({
  control,
  childPricingEnabled,
  childPricingTiers,
  onAddTier,
  onUpdateTier,
  onRemoveTier,
}) => (
  <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
    <Typography variant="h6" fontWeight={600} gutterBottom>
      Child/Youth Pricing
    </Typography>
    <Stack spacing={3}>
      <Box display="flex" alignItems="center" gap={1.5} mb={2}>
        <ChildCareIcon color="success" />
        <Typography variant="subtitle2" color="text.secondary">
          Configure age-based pricing tiers for discounts
        </Typography>
      </Box>

      <Controller
        name="child_pricing_enabled"
        control={control}
        render={({ field }) => (
          <FormControlLabel
            control={<Switch {...field} checked={field.value} color="success" />}
            label="Enable Child/Youth Pricing"
          />
        )}
      />

      {childPricingEnabled && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2">Pricing Tiers</Typography>
            <Button startIcon={<AddIcon />} onClick={onAddTier} size="small" variant="outlined">
              Add Tier
            </Button>
          </Box>

          {(childPricingTiers || []).map((tier, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                gap: 2,
                alignItems: 'center',
                p: 2,
                borderRadius: 1,
                bgcolor: 'grey.50',
                border: 1,
                borderColor: 'divider',
              }}
            >
              <TextField
                label="Label"
                value={tier.label}
                onChange={(e) => onUpdateTier(index, 'label', e.target.value)}
                size="small"
                sx={{ flex: 1.5 }}
              />
              <TextField
                label="Min Age"
                type="number"
                value={tier.min_age}
                onChange={(e) => onUpdateTier(index, 'min_age', parseInt(e.target.value, 10) || 0)}
                size="small"
                sx={{ flex: 1 }}
                InputProps={{
                  inputProps: { min: 0 },
                }}
              />
              <TextField
                label="Max Age"
                type="number"
                value={tier.max_age}
                onChange={(e) => onUpdateTier(index, 'max_age', parseInt(e.target.value, 10) || 0)}
                size="small"
                sx={{ flex: 1 }}
                InputProps={{
                  inputProps: { min: 0 },
                }}
              />
              <TextField
                label="Discount"
                type="number"
                value={tier.discount_percentage}
                onChange={(e) =>
                  onUpdateTier(index, 'discount_percentage', parseInt(e.target.value, 10) || 0)
                }
                size="small"
                sx={{ flex: 1 }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  inputProps: { min: 0, max: 100 },
                }}
              />
              <IconButton onClick={() => onRemoveTier(index)} color="error" size="small">
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}

          {(childPricingTiers || []).length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              No pricing tiers configured. Click &quot;Add Tier&quot; to create one.
            </Typography>
          )}
        </>
      )}
    </Stack>
  </Box>
);
