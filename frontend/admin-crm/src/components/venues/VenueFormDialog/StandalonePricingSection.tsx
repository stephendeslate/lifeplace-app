import React from 'react';
import {
  TextField,
  FormControlLabel,
  Switch,
  Box,
  Stack,
  Typography,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import type { SectionProps } from './types';

export const StandalonePricingSection: React.FC<SectionProps> = ({
  formData,
  expanded,
  onToggle,
  onInputChange,
  onSwitchChange,
}) => (
  <Accordion expanded={expanded} onChange={onToggle}>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <Typography variant="h6">Standalone Pricing</Typography>
    </AccordionSummary>
    <AccordionDetails>
      <Stack spacing={2}>
        <Alert severity="info" sx={{ mb: 1 }}>
          Enable standalone pricing to allow this venue to be rented independently or included in
          custom package bundles.
        </Alert>

        <FormControlLabel
          control={
            <Switch
              checked={formData.is_rentable_standalone}
              onChange={onSwitchChange('is_rentable_standalone')}
            />
          }
          label="Available for Standalone Rental"
        />

        {formData.is_rentable_standalone && (
          <Box display="flex" gap={2} flexWrap="wrap">
            <TextField
              label="Base Price"
              value={formData.standalone_base_price}
              onChange={onInputChange('standalone_base_price')}
              type="number"
              InputProps={{
                startAdornment: <InputAdornment position="start">&#8369;</InputAdornment>,
                inputProps: { min: 0, step: 0.01 },
              }}
              helperText="Price when rented as standalone"
              sx={{ flex: 1, minWidth: 200 }}
            />
            <TextField
              label="Included Hours"
              value={formData.standalone_included_hours}
              onChange={onInputChange('standalone_included_hours')}
              type="number"
              InputProps={{
                endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                inputProps: { min: 0, step: 0.5 },
              }}
              helperText="Hours included in base price"
              sx={{ flex: 1, minWidth: 150 }}
            />
            <TextField
              label="Excess Hour Rate"
              value={formData.standalone_excess_hour_price}
              onChange={onInputChange('standalone_excess_hour_price')}
              type="number"
              InputProps={{
                startAdornment: <InputAdornment position="start">&#8369;</InputAdornment>,
                inputProps: { min: 0, step: 0.01 },
              }}
              helperText="Per hour beyond included"
              sx={{ flex: 1, minWidth: 200 }}
            />
          </Box>
        )}
      </Stack>
    </AccordionDetails>
  </Accordion>
);
