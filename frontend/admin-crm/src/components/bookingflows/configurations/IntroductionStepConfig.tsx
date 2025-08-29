// frontend/admin-crm/src/components/bookingflows/configurations/IntroductionStepConfig.tsx

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
  Divider,
} from '@mui/material';

// Modern Design System imports
import { ModernCard } from '../../common/ModernCard';
import {
  Upload as UploadIcon,
  Preview as PreviewIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useBookingFlowStepConfiguration } from '../../../hooks/useBookingFlows';
import type { 
  BookingFlowStep, 
  IntroductionStepConfiguration 
} from '../../../types/bookingflows.types';

interface IntroductionStepConfigProps {
  step: BookingFlowStep;
  onConfigurationChange?: () => void;
}

interface IntroductionConfigFormData {
  title: string;
  content: string;
  show_event_details: boolean;
  show_pricing_overview: boolean;
  custom_css: string;
  background_image?: string;
}

const defaultFormData: IntroductionConfigFormData = {
  title: '',
  content: '',
  show_event_details: true,
  show_pricing_overview: false,
  custom_css: '',
  background_image: '',
};

export const IntroductionStepConfig: React.FC<IntroductionStepConfigProps> = ({
  step,
  onConfigurationChange,
}) => {
  const [formData, setFormData] = useState<IntroductionConfigFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Use the evolved hooks from useBookingFlows
  const {
    useStepConfiguration,
    updateConfiguration,
    isUpdatingConfiguration,
    updateConfigurationError,
  } = useBookingFlowStepConfiguration();

  // Get current configuration
  const {
    data: config,
    isLoading: isLoadingConfig,
    error: configError,
    refetch: refetchConfig,
  } = useStepConfiguration(step.id);

  // Initialize form data when config loads
  useEffect(() => {
    if (config && config.id) {
      // Type guard to ensure we have IntroductionStepConfiguration
      const introConfig = config as IntroductionStepConfiguration;
      
      setFormData({
        title: introConfig.title || `Welcome to ${step.name}`,
        content: introConfig.content || '',
        show_event_details: introConfig.show_event_details ?? true,
        show_pricing_overview: introConfig.show_pricing_overview ?? false,
        custom_css: introConfig.custom_css || '',
        background_image: introConfig.background_image || '',
      });
      setHasChanges(false);
    } else if (!isLoadingConfig && !config) {
      // No config exists, set defaults
      setFormData({
        ...defaultFormData,
        title: `Welcome to ${step.name}`,
        content: 'We\'re excited to help you plan your perfect event! This booking process will guide you through all the details we need.',
      });
      setHasChanges(false);
    }
  }, [config, step.name, isLoadingConfig]);

  // Track changes to enable/disable save button
  useEffect(() => {
    if (config) {
      const introConfig = config as IntroductionStepConfiguration;
      const hasFormChanges = 
        formData.title !== (introConfig.title || '') ||
        formData.content !== (introConfig.content || '') ||
        formData.show_event_details !== (introConfig.show_event_details ?? true) ||
        formData.show_pricing_overview !== (introConfig.show_pricing_overview ?? false) ||
        formData.custom_css !== (introConfig.custom_css || '') ||
        formData.background_image !== (introConfig.background_image || '');
      
      setHasChanges(hasFormChanges);
    }
  }, [formData, config]);

  const handleInputChange = (field: keyof IntroductionConfigFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleSwitchChange = (field: keyof IntroductionConfigFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.checked,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    // Prepare data for backend - matches IntroductionStepConfiguration fields
    const updateData = {
      title: formData.title.trim(),
      content: formData.content.trim(),
      show_event_details: formData.show_event_details,
      show_pricing_overview: formData.show_pricing_overview,
      custom_css: formData.custom_css.trim(),
      background_image: formData.background_image?.trim() || '',
    };

    updateConfiguration(
      { stepId: step.id, data: updateData },
      {
        onSuccess: () => {
          setHasChanges(false);
          onConfigurationChange?.();
        },
      }
    );
  };

  const handleReset = () => {
    if (config) {
      const introConfig = config as IntroductionStepConfiguration;
      setFormData({
        title: introConfig.title || `Welcome to ${step.name}`,
        content: introConfig.content || '',
        show_event_details: introConfig.show_event_details ?? true,
        show_pricing_overview: introConfig.show_pricing_overview ?? false,
        custom_css: introConfig.custom_css || '',
        background_image: introConfig.background_image || '',
      });
    } else {
      setFormData({
        ...defaultFormData,
        title: `Welcome to ${step.name}`,
        content: 'We\'re excited to help you plan your perfect event! This booking process will guide you through all the details we need.',
      });
    }
    setErrors({});
    setHasChanges(false);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // In a real implementation, this would upload to a file storage service
      // For now, we'll just store the filename
      setFormData(prev => ({
        ...prev,
        background_image: file.name,
      }));
    }
  };

  const handleRefresh = () => {
    refetchConfig();
  };

  // Loading state
  if (isLoadingConfig) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Introduction Step Configuration
        </Typography>
        <Stack spacing={3}>
          <Skeleton variant="rectangular" height={200} />
          <Skeleton variant="rectangular" height={150} />
          <Skeleton variant="rectangular" height={100} />
        </Stack>
      </Box>
    );
  }

  // Error state
  if (configError) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Introduction Step Configuration
        </Typography>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={handleRefresh}>
              Retry
            </Button>
          }
        >
          Failed to load step configuration: {configError instanceof Error ? configError.message : 'Unknown error'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">
          Introduction Step Configuration
        </Typography>
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
        The introduction step welcomes clients and sets expectations for the booking process.
      </Alert>

      {/* Show update errors */}
      {updateConfigurationError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to update configuration: {updateConfigurationError instanceof Error ? updateConfigurationError.message : 'Unknown error'}
        </Alert>
      )}

      <Stack spacing={3}>
        {/* Basic Content */}
        <ModernCard variant="glass" size="medium" animation="none">
          <Box sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Welcome Message
            </Typography>
            
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Title"
                value={formData.title}
                onChange={handleInputChange('title')}
                error={!!errors.title}
                helperText={errors.title || 'Main welcome heading'}
                required
                disabled={isUpdatingConfiguration}
              />
              
              <TextField
                fullWidth
                label="Content"
                value={formData.content}
                onChange={handleInputChange('content')}
                error={!!errors.content}
                helperText={errors.content || 'Welcome message and instructions'}
                multiline
                rows={4}
                required
                disabled={isUpdatingConfiguration}
              />
            </Stack>
          </Box>
        </ModernCard>

        {/* Display Options */}
        <ModernCard variant="glass" size="medium" animation="none">
          <Box sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Display Options
            </Typography>
            
            <Stack spacing={2}>
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.show_event_details}
                      onChange={handleSwitchChange('show_event_details')}
                      disabled={isUpdatingConfiguration}
                    />
                  }
                  label="Show Event Details"
                />
                <Typography variant="caption" color="text.secondary" display="block">
                  Display basic event information on the introduction step
                </Typography>
              </Box>

              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.show_pricing_overview}
                      onChange={handleSwitchChange('show_pricing_overview')}
                      disabled={isUpdatingConfiguration}
                    />
                  }
                  label="Show Pricing Overview"
                />
                <Typography variant="caption" color="text.secondary" display="block">
                  Display estimated pricing information upfront
                </Typography>
              </Box>
            </Stack>
          </Box>
        </ModernCard>

        {/* Customization */}
        <ModernCard variant="glass" size="medium" animation="none">
          <Box sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Customization
            </Typography>
            
            <Stack spacing={3}>
              {/* Background Image */}
              <Box>
                <Typography variant="body2" gutterBottom>
                  Background Image
                </Typography>
                
                <Box display="flex" alignItems="center" gap={2}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadIcon />}
                    size="small"
                    disabled={isUpdatingConfiguration}
                  >
                    Upload Image
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </Button>
                  
                  {formData.background_image && (
                    <Typography variant="body2" color="text.secondary">
                      {formData.background_image}
                    </Typography>
                  )}
                </Box>
                
                <Typography variant="caption" color="text.secondary">
                  Optional background image for the introduction step
                </Typography>
              </Box>

              {/* Custom CSS */}
              <TextField
                fullWidth
                label="Custom CSS"
                value={formData.custom_css}
                onChange={handleInputChange('custom_css')}
                multiline
                rows={4}
                helperText="Additional CSS styling for this step"
                placeholder=".introduction-step { /* Your custom styles */ }"
                disabled={isUpdatingConfiguration}
              />
            </Stack>
          </Box>
        </ModernCard>

        {/* Preview */}
        <ModernCard variant="glass" size="medium" animation="none">
          <Box sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <PreviewIcon color="primary" />
              <Typography variant="subtitle1">
                Live Preview
              </Typography>
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            <Box 
              sx={{ 
                p: 3, 
                border: 1, 
                borderColor: 'divider', 
                borderRadius: 1,
                backgroundColor: 'grey.50',
                position: 'relative',
                ...(formData.background_image && {
                  backgroundImage: `url(${formData.background_image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                })
              }}
            >
              <Typography variant="h5" gutterBottom>
                {formData.title || 'Welcome Title'}
              </Typography>
              
              <Typography variant="body1" paragraph>
                {formData.content || 'Welcome content will appear here...'}
              </Typography>
              
              {formData.show_event_details && (
                <Box sx={{ mt: 2, p: 2, backgroundColor: 'background.paper', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Event Details
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Event type, date, and basic information will be displayed here
                  </Typography>
                </Box>
              )}
              
              {formData.show_pricing_overview && (
                <Box sx={{ mt: 2, p: 2, backgroundColor: 'background.paper', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Pricing Overview
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Estimated pricing information will be displayed here
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Custom CSS Preview */}
            {formData.custom_css && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Custom CSS:
                </Typography>
                <Box 
                  sx={{ 
                    p: 1, 
                    backgroundColor: 'grey.100', 
                    borderRadius: 1,
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    whiteSpace: 'pre-wrap',
                    overflow: 'auto',
                    maxHeight: 150,
                  }}
                >
                  {formData.custom_css}
                </Box>
              </Box>
            )}
          </Box>
        </ModernCard>

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

        {/* Configuration Debug Info (Development only) */}
        {process.env.NODE_ENV === 'development' && config && (
          <ModernCard variant="glass" size="small" animation="none" sx={{ backgroundColor: 'grey.50' }}>
            <Box sx={{ p: 3 }}>
              <Typography variant="caption" gutterBottom>
                Debug: Current Configuration
              </Typography>
              <pre style={{ fontSize: '0.75rem', overflow: 'auto' }}>
                {JSON.stringify(config, null, 2)}
              </pre>
            </Box>
          </ModernCard>
        )}
      </Stack>
    </Box>
  );
};