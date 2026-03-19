// frontend/admin-crm/src/components/bookingflows/configurations/AddonSelectionStepConfig/AddonAvailabilitySection.tsx

import React from 'react';
import {
  Box,
  FormControlLabel,
  Switch,
  Typography,
  Stack,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import { ShoppingCart as AddonIcon, Category as CategoryIcon } from '@mui/icons-material';
import type { AddonConfigFormData, AvailableAddon, AvailableCategory } from './types';

interface AddonAvailabilitySectionProps {
  formData: AddonConfigFormData;
  errors: Record<string, string>;
  isDataLoading: boolean;
  isLoadingCategories: boolean;
  isLoadingAddons: boolean;
  availableCategories: AvailableCategory[];
  availableAddons: AvailableAddon[];
  onSwitchChange: (
    field: keyof AddonConfigFormData,
  ) => (event: React.ChangeEvent<HTMLInputElement>) => void;
  onCategoriesChange: (value: number[]) => void;
  onAddonsChange: (value: number[]) => void;
}

export const AddonAvailabilitySection: React.FC<AddonAvailabilitySectionProps> = ({
  formData,
  errors,
  isDataLoading,
  isLoadingCategories,
  isLoadingAddons,
  availableCategories,
  availableAddons,
  onSwitchChange,
  onCategoriesChange,
  onAddonsChange,
}) => (
  <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
    <Typography variant="subtitle1" gutterBottom>
      Available Add-ons
    </Typography>

    <Stack spacing={2}>
      {/* Event Type Filtering Toggle */}
      <Box>
        <FormControlLabel
          control={
            <Switch
              checked={formData.filter_by_event_type}
              onChange={onSwitchChange('filter_by_event_type')}
              disabled={isDataLoading}
            />
          }
          label="Filter by Event Type"
        />
        <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 6 }}>
          When enabled, automatically show all active add-ons associated with the booking flow's
          event type. When disabled, only add-ons explicitly configured below will be shown.
        </Typography>
      </Box>

      {/* Categories Selection */}
      <FormControl fullWidth disabled={formData.filter_by_event_type}>
        <InputLabel>Filter by Categories</InputLabel>
        <Select
          multiple
          value={formData.available_categories}
          onChange={(e) => onCategoriesChange(e.target.value as number[])}
          label="Filter by Categories"
          disabled={isDataLoading || formData.filter_by_event_type}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((categoryId) => {
                const category = availableCategories.find((c) => c.id === categoryId);
                return (
                  <Chip
                    key={categoryId}
                    label={category?.name || `Category ${categoryId}`}
                    size="small"
                    icon={<CategoryIcon />}
                  />
                );
              })}
            </Box>
          )}
        >
          {isLoadingCategories ? (
            <MenuItem disabled>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Loading categories...
            </MenuItem>
          ) : (
            availableCategories.map((category) => (
              <MenuItem key={category.id} value={category.id}>
                <Checkbox checked={formData.available_categories.includes(category.id)} />
                <ListItemText
                  primary={category.name}
                  secondary={category.description || `${category.sort_order} items`}
                />
              </MenuItem>
            ))
          )}
        </Select>
        <Typography variant="caption" color="text.secondary">
          Show add-ons from selected categories. Leave empty to show all categories.
        </Typography>
      </FormControl>

      {/* Specific Add-ons Selection */}
      <FormControl fullWidth disabled={formData.filter_by_event_type}>
        <InputLabel>Specific Add-ons (Override)</InputLabel>
        <Select
          multiple
          value={formData.available_addons}
          onChange={(e) => onAddonsChange(e.target.value as number[])}
          label="Specific Add-ons (Override)"
          disabled={isDataLoading || formData.filter_by_event_type}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((addonId) => {
                const addon = availableAddons.find((a) => a.id === addonId);
                return (
                  <Chip
                    key={addonId}
                    label={addon?.name || `Add-on ${addonId}`}
                    size="small"
                    icon={<AddonIcon />}
                    color={addon ? 'default' : 'error'}
                  />
                );
              })}
            </Box>
          )}
        >
          {isLoadingAddons ? (
            <MenuItem disabled>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Loading add-ons...
            </MenuItem>
          ) : (
            availableAddons.map((addon) => (
              <MenuItem key={addon.id} value={addon.id}>
                <Checkbox checked={formData.available_addons.includes(addon.id)} />
                <ListItemText
                  primary={addon.name}
                  secondary={`${addon.currency} ${addon.base_price} • ${addon.type}`}
                />
              </MenuItem>
            ))
          )}
        </Select>
        <Typography variant="caption" color="text.secondary">
          Override category filtering with specific add-ons. This will ignore category selection.
        </Typography>
      </FormControl>

      {errors.selection && <Alert severity="error">{errors.selection}</Alert>}
    </Stack>
  </Box>
);
