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
  Card,
  CardContent,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Preview as PreviewIcon,
} from '@mui/icons-material';
import type { 
  BookingFlowStep, 
  IntroductionStepConfiguration 
} from '../../../types/bookingflows.types';

interface IntroductionStepConfigProps {
  step: BookingFlowStep;
  config?: IntroductionStepConfiguration | null;
  onUpdate: (data: Partial<IntroductionStepConfiguration>) => void;
  isLoading?: boolean;
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
  config,
  onUpdate,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<IntroductionConfigFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (config) {
      setFormData({
        title: config.title || `Welcome to ${step.name}`,
        content: config.content || '',
        show_event_details: config.show_event_details ?? true,
        show_pricing_overview: config.show_pricing_overview ?? false,
        custom_css: config.custom_css || '',
        background_image: config.background_image || '',
      });
    } else {
      setFormData({
        ...defaultFormData,
        title: `Welcome to ${step.name}`,
        content: 'We\'re excited to help you plan your perfect event! This booking process will guide you through all the details we need.',
      });
    }
  }, [config, step.name]);

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

    onUpdate({
      title: formData.title.trim(),
      content: formData.content.trim(),
      show_event_details: formData.show_event_details,
      show_pricing_overview: formData.show_pricing_overview,
      custom_css: formData.custom_css.trim(),
      background_image: formData.background_image?.trim() || undefined,
    });
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

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Introduction Step Configuration
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        The introduction step welcomes clients and sets expectations for the booking process.
      </Alert>

      <Stack spacing={3}>
        {/* Basic Content */}
        <Card variant="outlined">
          <CardContent>
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
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Display Options */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Display Options
            </Typography>
            
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.show_event_details}
                    onChange={handleSwitchChange('show_event_details')}
                  />
                }
                label="Show Event Details"
              />
              <Typography variant="caption" color="text.secondary">
                Display basic event information on the introduction step
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.show_pricing_overview}
                    onChange={handleSwitchChange('show_pricing_overview')}
                  />
                }
                label="Show Pricing Overview"
              />
              <Typography variant="caption" color="text.secondary">
                Display estimated pricing information upfront
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        {/* Customization */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Customization
            </Typography>
            
            <Stack spacing={2}>
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
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card variant="outlined">
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <PreviewIcon color="primary" />
              <Typography variant="subtitle1">
                Live Preview
              </Typography>
            </Box>
            
            <Box 
              sx={{ 
                p: 3, 
                border: 1, 
                borderColor: 'divider', 
                borderRadius: 1,
                backgroundColor: 'grey.50'
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
          </CardContent>
        </Card>

        {/* Actions */}
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Configuration'}
          </Button>
          
          <Button
            variant="outlined"
            onClick={() => setFormData(defaultFormData)}
          >
            Reset to Defaults
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};