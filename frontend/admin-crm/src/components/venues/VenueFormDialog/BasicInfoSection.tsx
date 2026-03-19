import React from 'react';
import {
  TextField,
  FormControlLabel,
  Switch,
  Box,
  Stack,
  Typography,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import type { SectionProps } from './types';

interface BasicInfoSectionProps extends SectionProps {
  errors: Record<string, string>;
}

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  formData,
  errors,
  expanded,
  onToggle,
  onInputChange,
  onSwitchChange,
}) => (
  <Accordion expanded={expanded} onChange={onToggle}>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <Typography variant="h6">Basic Information</Typography>
    </AccordionSummary>
    <AccordionDetails>
      <Stack spacing={2}>
        <Box display="flex" gap={2}>
          <TextField
            fullWidth
            label="Venue Name"
            value={formData.name}
            onChange={onInputChange('name')}
            error={!!errors.name}
            helperText={errors.name}
            required
          />
          <TextField
            fullWidth
            label="Code"
            value={formData.code}
            onChange={onInputChange('code')}
            error={!!errors.code}
            helperText={
              errors.code || 'Uppercase letters, numbers, and underscores (e.g., CABANA_3)'
            }
            required
          />
        </Box>

        <TextField
          fullWidth
          label="Description"
          value={formData.description}
          onChange={onInputChange('description')}
          multiline
          rows={2}
        />

        <TextField
          fullWidth
          label="Location Description"
          value={formData.location_description}
          onChange={onInputChange('location_description')}
          helperText="Physical location within the property"
        />

        <Divider />

        <Typography variant="subtitle2" color="text.secondary">
          Capacity
        </Typography>
        <Box display="flex" gap={2}>
          <TextField
            label="Minimum"
            value={formData.minimum_capacity}
            onChange={onInputChange('minimum_capacity')}
            error={!!errors.minimum_capacity}
            helperText={errors.minimum_capacity}
            type="number"
            InputProps={{ inputProps: { min: 1 } }}
            sx={{ flex: 1 }}
          />
          <TextField
            label="Maximum"
            value={formData.maximum_capacity}
            onChange={onInputChange('maximum_capacity')}
            error={!!errors.maximum_capacity}
            helperText={errors.maximum_capacity}
            type="number"
            required
            InputProps={{ inputProps: { min: 1 } }}
            sx={{ flex: 1 }}
          />
          <TextField
            label="Recommended"
            value={formData.recommended_capacity}
            onChange={onInputChange('recommended_capacity')}
            type="number"
            InputProps={{ inputProps: { min: 1 } }}
            sx={{ flex: 1 }}
          />
        </Box>

        <Divider />

        <Box display="flex" gap={2} flexWrap="wrap">
          <FormControlLabel
            control={
              <Switch checked={formData.is_overnight} onChange={onSwitchChange('is_overnight')} />
            }
            label="Overnight Venue"
          />
          <FormControlLabel
            control={<Switch checked={formData.is_active} onChange={onSwitchChange('is_active')} />}
            label="Active"
          />
          <FormControlLabel
            control={
              <Switch checked={formData.is_bookable} onChange={onSwitchChange('is_bookable')} />
            }
            label="Bookable"
          />
          <FormControlLabel
            control={
              <Switch checked={formData.is_featured} onChange={onSwitchChange('is_featured')} />
            }
            label="Featured"
          />
        </Box>

        <TextField
          label="Sort Order"
          value={formData.sort_order}
          onChange={onInputChange('sort_order')}
          type="number"
          helperText="Lower numbers appear first"
          sx={{ width: 150 }}
        />
      </Stack>
    </AccordionDetails>
  </Accordion>
);
