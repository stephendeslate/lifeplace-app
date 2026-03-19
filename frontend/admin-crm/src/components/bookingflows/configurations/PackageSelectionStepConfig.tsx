// frontend/admin-crm/src/components/bookingflows/configurations/PackageSelectionStepConfig.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  FormControlLabel,
  Switch,
  Typography,
  Stack,
  Alert,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  RadioGroup,
  Radio,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
} from '@mui/material';

import {
  ExpandMore as ExpandMoreIcon,
  LocalShipping as PackageIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import type {
  BookingFlowStep,
  PackageSelectionStepConfiguration,
} from '../../../types/bookingflows';
import { useBookingFlowStepConfiguration } from '../../../hooks/useBookingFlows';
import { useFormHandlers } from '../../../hooks/useFormHandlers';
import { ConfigSection } from '../../common';

interface PackageSelectionStepConfigProps {
  step: BookingFlowStep;
  onUpdate?: () => void;
  isLoading?: boolean;
}

interface PackageConfigFormData {
  available_categories: number[];
  available_packages: number[];
  selection_type: 'SINGLE' | 'MULTIPLE';
  min_selection: number;
  max_selection: number;
  show_pricing: boolean;
  show_descriptions: boolean;
  show_images: boolean;
  enable_comparison: boolean;
  filter_by_event_type: boolean;
  enable_dynamic_pricing: boolean;
  pricing_factors: Record<string, unknown>;
}

const defaultFormData: PackageConfigFormData = {
  available_categories: [],
  available_packages: [],
  selection_type: 'SINGLE',
  min_selection: 1,
  max_selection: 1,
  show_pricing: true,
  show_descriptions: true,
  show_images: true,
  enable_comparison: false,
  filter_by_event_type: false,
  enable_dynamic_pricing: false,
  pricing_factors: {},
};

export const PackageSelectionStepConfig: React.FC<PackageSelectionStepConfigProps> = ({
  step,
  onUpdate,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<PackageConfigFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Use centralized form handlers
  const { handleSwitchChange } = useFormHandlers(setFormData, errors, setErrors);

  // Use the correct hooks from useBookingFlowStepConfiguration
  const {
    useStepConfiguration,
    useAvailablePackages,
    useAvailableCategories,
    updateConfiguration,
    isUpdatingConfiguration,
    updateConfigurationError,
  } = useBookingFlowStepConfiguration();

  // Get step configuration and available options
  const { data: config, isLoading: isLoadingConfig } = useStepConfiguration(step.id);
  const { data: availablePackages = [], isLoading: isLoadingPackages } = useAvailablePackages(
    step.id,
  );
  const { data: availableCategories = [], isLoading: isLoadingCategories } = useAvailableCategories(
    step.id,
  );

  // Parse the configuration when it loads
  useEffect(() => {
    if (config && config.id) {
      // Type assertion since we know this is a PackageSelectionStepConfiguration
      const packageConfig = config as PackageSelectionStepConfiguration;
      setFormData({
        available_categories: packageConfig.available_categories || [],
        available_packages: packageConfig.available_packages || [],
        selection_type: packageConfig.selection_type || 'SINGLE',
        min_selection: packageConfig.min_selection || 1,
        max_selection: packageConfig.max_selection || 1,
        show_pricing: packageConfig.show_pricing ?? true,
        show_descriptions: packageConfig.show_descriptions ?? true,
        show_images: packageConfig.show_images ?? true,
        enable_comparison: packageConfig.enable_comparison ?? false,
        filter_by_event_type: packageConfig.filter_by_event_type ?? false,
        enable_dynamic_pricing: packageConfig.enable_dynamic_pricing ?? false,
        pricing_factors: packageConfig.pricing_factors || {},
      });
    }
  }, [config]);

  const handleInputChange =
    (field: keyof PackageConfigFormData) =>
    (
      event:
        | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
        | { target: { value: unknown } },
    ) => {
      const value = event.target.value;
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: '',
        }));
      }
    };

  const handleSelectionTypeChange = (value: 'SINGLE' | 'MULTIPLE') => {
    setFormData((prev) => ({
      ...prev,
      selection_type: value,
      min_selection: value === 'SINGLE' ? 1 : prev.min_selection,
      max_selection: value === 'SINGLE' ? 1 : prev.max_selection,
    }));
  };

  const handleCategoriesChange = (value: number[]) => {
    setFormData((prev) => ({
      ...prev,
      available_categories: value,
      // Clear specific packages when categories change
      available_packages: [],
    }));
  };

  const handlePackagesChange = (value: number[]) => {
    setFormData((prev) => ({
      ...prev,
      available_packages: value,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.available_categories.length === 0 && formData.available_packages.length === 0) {
      newErrors.packages = 'Select either categories or specific packages';
    }

    if (formData.selection_type === 'MULTIPLE') {
      if (formData.min_selection < 0) {
        newErrors.min_selection = 'Minimum selection cannot be negative';
      }

      if (formData.max_selection > 0 && formData.max_selection < formData.min_selection) {
        newErrors.max_selection = 'Maximum selection must be greater than or equal to minimum';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    // Use the updateConfiguration method from the hook
    updateConfiguration(
      {
        stepId: step.id,
        data: formData as unknown as Record<string, unknown>, // Send the entire form data as the configuration update
      },
      {
        onSuccess: () => {
          onUpdate?.();
        },
      },
    );
  };

  // Show loading state while fetching data
  if (isLoadingConfig || isLoadingPackages || isLoadingCategories) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Package Selection Configuration
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Configure which packages are available for selection and how clients can choose them.
      </Alert>

      {/* Show configuration update errors */}
      {updateConfigurationError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to update configuration:{' '}
          {updateConfigurationError instanceof Error
            ? updateConfigurationError.message
            : String(updateConfigurationError)}
        </Alert>
      ) : null}

      <Stack spacing={3}>
        {/* Package Availability */}
        <ConfigSection title="Available Packages">
          <Stack spacing={2}>
            {/* Categories Selection */}
            <FormControl fullWidth>
              <InputLabel>Filter by Categories</InputLabel>
              <Select
                multiple
                value={formData.available_categories}
                onChange={(e) => handleCategoriesChange(e.target.value as number[])}
                label="Filter by Categories"
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
                {availableCategories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    <Checkbox checked={formData.available_categories.includes(category.id)} />
                    <ListItemText primary={category.name} />
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="text.secondary">
                Show packages from selected categories
              </Typography>
            </FormControl>

            {/* Specific Packages Selection */}
            <FormControl fullWidth>
              <InputLabel>Specific Packages (Optional)</InputLabel>
              <Select
                multiple
                value={formData.available_packages}
                onChange={(e) => handlePackagesChange(e.target.value as number[])}
                label="Specific Packages (Optional)"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((packageId) => {
                      const pkg = availablePackages.find((p) => p.id === packageId);
                      return (
                        <Chip
                          key={packageId}
                          label={pkg?.name || `Package ${packageId}`}
                          size="small"
                          icon={<PackageIcon />}
                        />
                      );
                    })}
                  </Box>
                )}
              >
                {availablePackages.map((pkg) => (
                  <MenuItem key={pkg.id} value={pkg.id}>
                    <Checkbox checked={formData.available_packages.includes(pkg.id)} />
                    <ListItemText primary={pkg.name} secondary={`${pkg.base_price}`} />
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="text.secondary">
                Override category filtering with specific packages
              </Typography>
            </FormControl>

            {errors.packages && <Alert severity="error">{errors.packages}</Alert>}
          </Stack>
        </ConfigSection>

        {/* Selection Behavior */}
        <ConfigSection title="Selection Behavior">
          <Stack spacing={2}>
            <FormControl>
              <Typography variant="body2" gutterBottom>
                Selection Type
              </Typography>
              <RadioGroup
                value={formData.selection_type}
                onChange={(e) => handleSelectionTypeChange(e.target.value as 'SINGLE' | 'MULTIPLE')}
              >
                <FormControlLabel value="SINGLE" control={<Radio />} label="Single Selection" />
                <FormControlLabel value="MULTIPLE" control={<Radio />} label="Multiple Selection" />
              </RadioGroup>
            </FormControl>

            {formData.selection_type === 'MULTIPLE' && (
              <Box display="flex" gap={2}>
                <TextField
                  label="Minimum Selection"
                  type="number"
                  value={formData.min_selection}
                  onChange={handleInputChange('min_selection')}
                  error={!!errors.min_selection}
                  helperText={errors.min_selection || 'Minimum packages required'}
                  inputProps={{ min: 0 }}
                  sx={{ flex: 1 }}
                />

                <TextField
                  label="Maximum Selection"
                  type="number"
                  value={formData.max_selection}
                  onChange={handleInputChange('max_selection')}
                  error={!!errors.max_selection}
                  helperText={errors.max_selection || 'Maximum packages allowed (0 = unlimited)'}
                  inputProps={{ min: 0 }}
                  sx={{ flex: 1 }}
                />
              </Box>
            )}
          </Stack>
        </ConfigSection>

        {/* Event Type Filtering */}
        <ConfigSection title="Event Type Filtering">
          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.filter_by_event_type}
                  onChange={handleSwitchChange('filter_by_event_type')}
                />
              }
              label="Filter Packages by Event Type"
            />
            <Typography variant="caption" color="text.secondary">
              When enabled, only packages associated with the booking flow's event type are shown.
              Packages with no event types assigned will be hidden.
            </Typography>

            {formData.filter_by_event_type && (
              <Alert severity="info" sx={{ mt: 1 }}>
                Packages must have event types assigned in the Product settings to appear when this
                filter is enabled.
              </Alert>
            )}
          </Stack>
        </ConfigSection>

        {/* Display Options */}
        <ConfigSection title="Display Options">
          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.show_pricing}
                  onChange={handleSwitchChange('show_pricing')}
                />
              }
              label="Show Pricing"
            />
            <Typography variant="caption" color="text.secondary">
              Display package prices to clients
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.show_descriptions}
                  onChange={handleSwitchChange('show_descriptions')}
                />
              }
              label="Show Descriptions"
            />
            <Typography variant="caption" color="text.secondary">
              Display detailed package descriptions
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.show_images}
                  onChange={handleSwitchChange('show_images')}
                />
              }
              label="Show Images"
            />
            <Typography variant="caption" color="text.secondary">
              Display package images if available
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.enable_comparison}
                  onChange={handleSwitchChange('enable_comparison')}
                />
              }
              label="Enable Package Comparison"
            />
            <Typography variant="caption" color="text.secondary">
              Allow clients to compare packages side-by-side
            </Typography>
          </Stack>
        </ConfigSection>

        {/* Advanced Pricing */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="subtitle1">Advanced Pricing</Typography>
              {formData.enable_dynamic_pricing && (
                <Chip label="Enabled" size="small" color="primary" />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.enable_dynamic_pricing}
                    onChange={handleSwitchChange('enable_dynamic_pricing')}
                  />
                }
                label="Enable Dynamic Pricing"
              />
              <Typography variant="caption" color="text.secondary">
                Adjust prices based on guest count, date, or other factors
              </Typography>

              {formData.enable_dynamic_pricing && (
                <TextField
                  fullWidth
                  label="Pricing Factors (JSON)"
                  value={JSON.stringify(formData.pricing_factors, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setFormData((prev) => ({
                        ...prev,
                        pricing_factors: parsed,
                      }));
                    } catch {
                      // Invalid JSON, ignore
                    }
                  }}
                  multiline
                  rows={4}
                  helperText="Define pricing adjustment rules (e.g., guest count multipliers, date-based pricing)"
                />
              )}
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Configuration Summary */}
        <ConfigSection title="Configuration Summary">
          <Stack spacing={1}>
            <Typography variant="body2">
              <strong>Package Source:</strong>{' '}
              {formData.available_packages.length > 0
                ? `${formData.available_packages.length} specific packages`
                : formData.available_categories.length > 0
                  ? `${formData.available_categories.length} categories`
                  : 'All packages'}
            </Typography>

            <Typography variant="body2">
              <strong>Selection:</strong>{' '}
              {formData.selection_type === 'SINGLE'
                ? 'Single package'
                : `${formData.min_selection}-${formData.max_selection || '∞'} packages`}
            </Typography>

            <Typography variant="body2">
              <strong>Display:</strong>{' '}
              {[
                formData.show_pricing && 'Pricing',
                formData.show_descriptions && 'Descriptions',
                formData.show_images && 'Images',
                formData.enable_comparison && 'Comparison',
              ]
                .filter(Boolean)
                .join(', ') || 'Basic display'}
            </Typography>

            {formData.filter_by_event_type && (
              <Typography variant="body2">
                <strong>Event Type Filter:</strong> Enabled (only shows packages matching the flow's
                event type)
              </Typography>
            )}

            {formData.enable_dynamic_pricing && (
              <Typography variant="body2">
                <strong>Dynamic Pricing:</strong> Enabled
              </Typography>
            )}
          </Stack>
        </ConfigSection>

        {/* Actions */}
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isLoading || isUpdatingConfiguration}
          >
            {isLoading || isUpdatingConfiguration ? 'Saving...' : 'Save Configuration'}
          </Button>

          <Button
            variant="outlined"
            onClick={() => setFormData(defaultFormData)}
            disabled={isUpdatingConfiguration}
          >
            Reset to Defaults
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};
