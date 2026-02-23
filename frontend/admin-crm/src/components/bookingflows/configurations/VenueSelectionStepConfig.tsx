// frontend/admin-crm/src/components/bookingflows/configurations/VenueSelectionStepConfig.tsx

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
  Skeleton,
} from '@mui/material';

import { Save as SaveIcon, Refresh as RefreshIcon, Home as VenueIcon } from '@mui/icons-material';
import { useBookingFlowStepConfiguration } from '../../../hooks/useBookingFlows';
import { useFormHandlers } from '../../../hooks/useFormHandlers';
import { ConfigSection } from '../../common';
import { tokens } from '../../../design-system';
import type {
  BookingFlowStep,
  VenueSelectionStepConfiguration,
} from '../../../types/bookingflows.types';

interface VenueSelectionStepConfigProps {
  step: BookingFlowStep;
  onConfigurationChange?: () => void;
}

interface VenueSelectionConfigFormData {
  min_venues: number;
  max_venues: number;
  show_pricing: boolean;
  show_included_hours: boolean;
  show_bundle_discount: boolean;
  bundle_discount_percent: string;
  title: string;
  description: string;
  // Package recommendation settings
  show_package_recommendations: boolean;
  show_view_packages_option: boolean;
  view_packages_button_text: string;
}

const defaultFormData: VenueSelectionConfigFormData = {
  min_venues: 1,
  max_venues: 5,
  show_pricing: true,
  show_included_hours: true,
  show_bundle_discount: true,
  bundle_discount_percent: '10.00',
  title: 'Select Your Spaces',
  description: 'Choose which spaces to include in your booking.',
  show_package_recommendations: true,
  show_view_packages_option: true,
  view_packages_button_text: 'Not sure? View our packages instead',
};

export const VenueSelectionStepConfig: React.FC<VenueSelectionStepConfigProps> = ({
  step,
  onConfigurationChange,
}) => {
  const [formData, setFormData] = useState<VenueSelectionConfigFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Use centralized form handlers
  const { handleInputChange, handleSwitchChange } = useFormHandlers(setFormData, errors, setErrors);

  const {
    useStepConfiguration,
    updateConfiguration,
    isUpdatingConfiguration,
    updateConfigurationError,
  } = useBookingFlowStepConfiguration();

  const {
    data: config,
    isLoading: isLoadingConfig,
    error: configError,
    refetch: refetchConfig,
  } = useStepConfiguration(step.id);

  // Initialize form data when config loads
  useEffect(() => {
    if (config && config.id) {
      const venueConfig = config as VenueSelectionStepConfiguration;

      setFormData({
        min_venues: venueConfig.min_venues ?? 1,
        max_venues: venueConfig.max_venues ?? 5,
        show_pricing: venueConfig.show_pricing ?? true,
        show_included_hours: venueConfig.show_included_hours ?? true,
        show_bundle_discount: venueConfig.show_bundle_discount ?? true,
        bundle_discount_percent: venueConfig.bundle_discount_percent || '10.00',
        title: venueConfig.title || 'Select Your Spaces',
        description: venueConfig.description || 'Choose which spaces to include in your booking.',
        show_package_recommendations: venueConfig.show_package_recommendations ?? true,
        show_view_packages_option: venueConfig.show_view_packages_option ?? true,
        view_packages_button_text:
          venueConfig.view_packages_button_text || 'Not sure? View our packages instead',
      });
      setHasChanges(false);
    } else if (!isLoadingConfig && !config) {
      setFormData(defaultFormData);
      setHasChanges(false);
    }
  }, [config, isLoadingConfig]);

  // Track changes
  useEffect(() => {
    if (config) {
      const venueConfig = config as VenueSelectionStepConfiguration;
      const hasFormChanges =
        formData.min_venues !== (venueConfig.min_venues ?? 1) ||
        formData.max_venues !== (venueConfig.max_venues ?? 5) ||
        formData.show_pricing !== (venueConfig.show_pricing ?? true) ||
        formData.show_included_hours !== (venueConfig.show_included_hours ?? true) ||
        formData.show_bundle_discount !== (venueConfig.show_bundle_discount ?? true) ||
        formData.bundle_discount_percent !== (venueConfig.bundle_discount_percent || '10.00') ||
        formData.title !== (venueConfig.title || 'Select Your Spaces') ||
        formData.description !== (venueConfig.description || '') ||
        formData.show_package_recommendations !==
          (venueConfig.show_package_recommendations ?? true) ||
        formData.show_view_packages_option !== (venueConfig.show_view_packages_option ?? true) ||
        formData.view_packages_button_text !==
          (venueConfig.view_packages_button_text || 'Not sure? View our packages instead');

      setHasChanges(hasFormChanges);
    }
  }, [formData, config]);

  const handleNumberChange =
    (field: 'min_venues' | 'max_venues') => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(event.target.value, 10);
      if (!isNaN(value) && value >= 0) {
        setFormData((prev) => ({
          ...prev,
          [field]: value,
        }));
      }
    };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (formData.min_venues < 0) {
      newErrors.min_venues = 'Minimum venues cannot be negative';
    }

    if (formData.max_venues < formData.min_venues) {
      newErrors.max_venues = 'Maximum venues must be greater than or equal to minimum';
    }

    const discountPercent = parseFloat(formData.bundle_discount_percent);
    if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      newErrors.bundle_discount_percent = 'Discount must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const updateData = {
      min_venues: formData.min_venues,
      max_venues: formData.max_venues,
      show_pricing: formData.show_pricing,
      show_included_hours: formData.show_included_hours,
      show_bundle_discount: formData.show_bundle_discount,
      bundle_discount_percent: formData.bundle_discount_percent,
      title: formData.title.trim(),
      description: formData.description.trim(),
      show_package_recommendations: formData.show_package_recommendations,
      show_view_packages_option: formData.show_view_packages_option,
      view_packages_button_text: formData.view_packages_button_text.trim(),
    };

    updateConfiguration(
      { stepId: step.id, data: updateData },
      {
        onSuccess: () => {
          setHasChanges(false);
          onConfigurationChange?.();
        },
      },
    );
  };

  const handleReset = () => {
    if (config) {
      const venueConfig = config as VenueSelectionStepConfiguration;
      setFormData({
        min_venues: venueConfig.min_venues ?? 1,
        max_venues: venueConfig.max_venues ?? 5,
        show_pricing: venueConfig.show_pricing ?? true,
        show_included_hours: venueConfig.show_included_hours ?? true,
        show_bundle_discount: venueConfig.show_bundle_discount ?? true,
        bundle_discount_percent: venueConfig.bundle_discount_percent || '10.00',
        title: venueConfig.title || 'Select Your Spaces',
        description: venueConfig.description || 'Choose which spaces to include in your booking.',
        show_package_recommendations: venueConfig.show_package_recommendations ?? true,
        show_view_packages_option: venueConfig.show_view_packages_option ?? true,
        view_packages_button_text:
          venueConfig.view_packages_button_text || 'Not sure? View our packages instead',
      });
    } else {
      setFormData(defaultFormData);
    }
    setErrors({});
    setHasChanges(false);
  };

  const handleRefresh = () => {
    refetchConfig();
  };

  if (isLoadingConfig) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Venue Selection Step Configuration
        </Typography>
        <Stack spacing={3}>
          <Skeleton variant="rectangular" height={200} />
          <Skeleton variant="rectangular" height={150} />
        </Stack>
      </Box>
    );
  }

  if (configError) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Venue Selection Step Configuration
        </Typography>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={handleRefresh}>
              Retry
            </Button>
          }
        >
          Failed to load step configuration:{' '}
          {configError instanceof Error ? configError.message : 'Unknown error'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <VenueIcon color="primary" />
          <Typography variant="h6">Venue Selection Step Configuration</Typography>
        </Box>
        <Button
          size="small"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={isLoadingConfig}
        >
          Refresh
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Configure how clients select spaces/venues for custom package curation. Selected venues will
        be bundled into a custom package with optional multi-space discounts.
      </Alert>

      {updateConfigurationError ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to update configuration:{' '}
          {updateConfigurationError instanceof Error
            ? updateConfigurationError.message
            : 'Unknown error'}
        </Alert>
      ) : null}

      <Stack spacing={3}>
        {/* Content Settings */}
        <ConfigSection title="Step Content">
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="Title"
              value={formData.title}
              onChange={handleInputChange('title')}
              error={!!errors.title}
              helperText={errors.title || 'Heading displayed at the top of the step'}
              required
              disabled={isUpdatingConfiguration}
            />

            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={handleInputChange('description')}
              helperText="Instructions for clients"
              multiline
              rows={2}
              disabled={isUpdatingConfiguration}
            />
          </Stack>
        </ConfigSection>

        {/* Selection Constraints */}
        <ConfigSection title="Selection Constraints">
          <Stack spacing={2} direction="row">
            <TextField
              type="number"
              label="Minimum Venues"
              value={formData.min_venues}
              onChange={handleNumberChange('min_venues')}
              error={!!errors.min_venues}
              helperText={errors.min_venues || 'Minimum spaces required'}
              inputProps={{ min: 0 }}
              disabled={isUpdatingConfiguration}
              sx={{ width: 200 }}
            />

            <TextField
              type="number"
              label="Maximum Venues"
              value={formData.max_venues}
              onChange={handleNumberChange('max_venues')}
              error={!!errors.max_venues}
              helperText={errors.max_venues || 'Maximum spaces allowed'}
              inputProps={{ min: 1 }}
              disabled={isUpdatingConfiguration}
              sx={{ width: 200 }}
            />
          </Stack>
        </ConfigSection>

        {/* Display Options */}
        <ConfigSection title="Display Options">
          <Stack spacing={2}>
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.show_pricing}
                    onChange={handleSwitchChange('show_pricing')}
                    disabled={isUpdatingConfiguration}
                  />
                }
                label="Show Pricing"
              />
              <Typography variant="caption" color="text.secondary" display="block">
                Display standalone rental price for each venue
              </Typography>
            </Box>

            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.show_included_hours}
                    onChange={handleSwitchChange('show_included_hours')}
                    disabled={isUpdatingConfiguration}
                  />
                }
                label="Show Included Hours"
              />
              <Typography variant="caption" color="text.secondary" display="block">
                Display how many hours are included with each venue
              </Typography>
            </Box>

            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.show_bundle_discount}
                    onChange={handleSwitchChange('show_bundle_discount')}
                    disabled={isUpdatingConfiguration}
                  />
                }
                label="Show Multi-Space Discount"
              />
              <Typography variant="caption" color="text.secondary" display="block">
                Show discount applied when selecting multiple spaces
              </Typography>
            </Box>
          </Stack>
        </ConfigSection>

        {/* Package Recommendations */}
        <ConfigSection
          title="Package Recommendations"
          description="Show users pre-made packages that match their venue selection, helping them find better value options."
        >
          <Stack spacing={2}>
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.show_package_recommendations}
                    onChange={handleSwitchChange('show_package_recommendations')}
                    disabled={isUpdatingConfiguration}
                  />
                }
                label="Show Package Recommendations"
              />
              <Typography variant="caption" color="text.secondary" display="block">
                When enabled, shows matching pre-made packages with price comparisons
              </Typography>
            </Box>

            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.show_view_packages_option}
                    onChange={handleSwitchChange('show_view_packages_option')}
                    disabled={isUpdatingConfiguration}
                  />
                }
                label="Show 'View Packages' Option"
              />
              <Typography variant="caption" color="text.secondary" display="block">
                Allow users to navigate to package selection if unsure about venue selection
              </Typography>
            </Box>

            {formData.show_view_packages_option && (
              <TextField
                fullWidth
                label="View Packages Button Text"
                value={formData.view_packages_button_text}
                onChange={handleInputChange('view_packages_button_text')}
                helperText="Text shown on the button to navigate to packages"
                disabled={isUpdatingConfiguration}
              />
            )}
          </Stack>
        </ConfigSection>

        {/* Bundle Discount */}
        <ConfigSection title="Multi-Space Discount">
          <TextField
            label="Discount Percentage"
            value={formData.bundle_discount_percent}
            onChange={handleInputChange('bundle_discount_percent')}
            error={!!errors.bundle_discount_percent}
            helperText={
              errors.bundle_discount_percent ||
              'Discount applied when selecting 2+ spaces (e.g., 10.00 for 10%)'
            }
            disabled={isUpdatingConfiguration}
            sx={{ width: 200 }}
            InputProps={{
              endAdornment: <Typography color="text.secondary">%</Typography>,
            }}
          />
        </ConfigSection>

        {/* Available Venues Note */}
        <Alert severity="info">
          To configure which venues are available for selection, use the Django admin panel to edit
          the VenueSelectionStepConfiguration and set the available_venues field. If left empty, all
          rentable venues will be shown.
        </Alert>

        {/* Actions */}
        <Box display="flex" gap={2} justifyContent="flex-end">
          <Button
            variant="outlined"
            onClick={handleReset}
            disabled={isUpdatingConfiguration || !hasChanges}
          >
            Reset Changes
          </Button>

          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={isUpdatingConfiguration || !hasChanges}
          >
            {isUpdatingConfiguration ? 'Saving...' : 'Save Configuration'}
          </Button>
        </Box>

        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && config && (
          <Box
            sx={{ borderRadius: tokens.spacing.radius.md, bgcolor: tokens.color.neutral[50], p: 3 }}
          >
            <Typography variant="caption" gutterBottom>
              Debug: Current Configuration
            </Typography>
            <pre style={{ fontSize: '0.75rem', overflow: 'auto' }}>
              {JSON.stringify(config, null, 2)}
            </pre>
          </Box>
        )}
      </Stack>
    </Box>
  );
};
