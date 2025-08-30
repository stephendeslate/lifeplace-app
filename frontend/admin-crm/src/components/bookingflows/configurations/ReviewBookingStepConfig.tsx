// frontend/admin-crm/src/components/bookingflows/configurations/ReviewBookingStepConfig.tsx

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

// Modern Design System imports
import { ModernCard } from '../../common/ModernCard';
import {
  RateReview as ReviewIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Visibility as PreviewIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import type { BookingFlowStep } from '../../../types/bookingflows.types';
import { useBookingFlowStepConfiguration } from '../../../hooks/useBookingFlows';

interface ReviewBookingStepConfigProps {
  step: BookingFlowStep;
  config?: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => void;
  isLoading?: boolean;
}

interface ReviewBookingConfigFormData {
  allow_editing: boolean;
  show_summary: boolean;
  show_terms_and_conditions: boolean;
  require_agreement: boolean;
  custom_message: string;
  edit_button_text: string;
  continue_button_text: string;
  terms_text: string;
}

const defaultFormData: ReviewBookingConfigFormData = {
  allow_editing: true,
  show_summary: true,
  show_terms_and_conditions: false,
  require_agreement: false,
  custom_message: 'Please review your booking details below.',
  edit_button_text: 'Edit',
  continue_button_text: 'Continue to Payment',
  terms_text: '',
};

export const ReviewBookingStepConfig: React.FC<ReviewBookingStepConfigProps> = ({
  step,
  config,
  onUpdate,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<ReviewBookingConfigFormData>(defaultFormData);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    updateConfiguration,
  } = useBookingFlowStepConfiguration();

  // Initialize form data from config
  useEffect(() => {
    if (config) {
      setFormData({
        allow_editing: typeof config.allow_editing === 'boolean' ? config.allow_editing : defaultFormData.allow_editing,
        show_summary: typeof config.show_summary === 'boolean' ? config.show_summary : defaultFormData.show_summary,
        show_terms_and_conditions: typeof config.show_terms_and_conditions === 'boolean' ? config.show_terms_and_conditions : defaultFormData.show_terms_and_conditions,
        require_agreement: typeof config.require_agreement === 'boolean' ? config.require_agreement : defaultFormData.require_agreement,
        custom_message: typeof config.custom_message === 'string' ? config.custom_message : defaultFormData.custom_message,
        edit_button_text: typeof config.edit_button_text === 'string' ? config.edit_button_text : defaultFormData.edit_button_text,
        continue_button_text: typeof config.continue_button_text === 'string' ? config.continue_button_text : defaultFormData.continue_button_text,
        terms_text: typeof config.terms_text === 'string' ? config.terms_text : defaultFormData.terms_text,
      });
      setHasUnsavedChanges(false);
    } else {
      setFormData(defaultFormData);
      setHasUnsavedChanges(false);
    }
  }, [config]);

  const handleFormChange = (field: keyof ReviewBookingConfigFormData, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasUnsavedChanges(true);
    setSaveError(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    
    try {
      await updateConfiguration({
        stepId: step.id,
        data: { ...formData } as Record<string, unknown>
      });
      
      setHasUnsavedChanges(false);
      
      // Call parent callback
      onUpdate({ ...formData } as Record<string, unknown>);
    } catch (error) {
      console.error('Failed to save review booking configuration:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (config) {
      setFormData({
        allow_editing: typeof config.allow_editing === 'boolean' ? config.allow_editing : defaultFormData.allow_editing,
        show_summary: typeof config.show_summary === 'boolean' ? config.show_summary : defaultFormData.show_summary,
        show_terms_and_conditions: typeof config.show_terms_and_conditions === 'boolean' ? config.show_terms_and_conditions : defaultFormData.show_terms_and_conditions,
        require_agreement: typeof config.require_agreement === 'boolean' ? config.require_agreement : defaultFormData.require_agreement,
        custom_message: typeof config.custom_message === 'string' ? config.custom_message : defaultFormData.custom_message,
        edit_button_text: typeof config.edit_button_text === 'string' ? config.edit_button_text : defaultFormData.edit_button_text,
        continue_button_text: typeof config.continue_button_text === 'string' ? config.continue_button_text : defaultFormData.continue_button_text,
        terms_text: typeof config.terms_text === 'string' ? config.terms_text : defaultFormData.terms_text,
      });
    } else {
      setFormData(defaultFormData);
    }
    setHasUnsavedChanges(false);
    setSaveError(null);
  };

  if (isLoading) {
    return (
      <ModernCard variant="glass" size="medium" animation="none">
        <Box sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Skeleton variant="text" width="60%" height={32} />
            <Skeleton variant="rectangular" height={120} />
            <Skeleton variant="rectangular" height={60} />
          </Stack>
        </Box>
      </ModernCard>
    );
  }

  return (
    <Box>
      <Stack spacing={3}>
        {/* Header */}
        <Box display="flex" alignItems="center" gap={2}>
          <ReviewIcon color="primary" />
          <Typography variant="h6" component="h2">
            Review Booking Configuration
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary">
          Configure the review step where customers can see and edit their booking details before proceeding.
        </Typography>

        {/* Error Display */}
        {saveError && (
          <Alert severity="error">
            {saveError}
          </Alert>
        )}

        {/* Display Options */}
        <ModernCard variant="glass" size="medium" animation="none">
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PreviewIcon />
              Display Options
            </Typography>
            
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.show_summary}
                    onChange={(e) => handleFormChange('show_summary', e.target.checked)}
                    disabled={isSaving}
                  />
                }
                label="Show Booking Summary"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.allow_editing}
                    onChange={(e) => handleFormChange('allow_editing', e.target.checked)}
                    disabled={isSaving}
                  />
                }
                label="Allow Customers to Edit Details"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.show_terms_and_conditions}
                    onChange={(e) => handleFormChange('show_terms_and_conditions', e.target.checked)}
                    disabled={isSaving}
                  />
                }
                label="Show Terms and Conditions"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.require_agreement}
                    onChange={(e) => handleFormChange('require_agreement', e.target.checked)}
                    disabled={isSaving}
                  />
                }
                label="Require Agreement to Terms"
              />
            </Stack>
          </Box>
        </ModernCard>

        {/* Custom Messages */}
        <ModernCard variant="glass" size="medium" animation="none">
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EditIcon />
              Custom Messages
            </Typography>
            
            <Stack spacing={2}>
              <TextField
                label="Custom Message"
                value={formData.custom_message}
                onChange={(e) => handleFormChange('custom_message', e.target.value)}
                disabled={isSaving}
                fullWidth
                multiline
                rows={2}
                placeholder="Please review your booking details below."
                helperText="Message shown at the top of the review step"
              />
              
              <TextField
                label="Edit Button Text"
                value={formData.edit_button_text}
                onChange={(e) => handleFormChange('edit_button_text', e.target.value)}
                disabled={isSaving}
                fullWidth
                placeholder="Edit"
                helperText="Text for buttons that allow editing previous steps"
              />
              
              <TextField
                label="Continue Button Text"
                value={formData.continue_button_text}
                onChange={(e) => handleFormChange('continue_button_text', e.target.value)}
                disabled={isSaving}
                fullWidth
                placeholder="Continue to Payment"
                helperText="Text for the button to proceed to the next step"
              />
              
              {formData.show_terms_and_conditions && (
                <TextField
                  label="Terms and Conditions Text"
                  value={formData.terms_text}
                  onChange={(e) => handleFormChange('terms_text', e.target.value)}
                  disabled={isSaving}
                  fullWidth
                  multiline
                  rows={4}
                  placeholder="Enter your terms and conditions here..."
                  helperText="Terms that customers must agree to"
                />
              )}
            </Stack>
          </Box>
        </ModernCard>

        {/* Actions */}
        <Box display="flex" gap={2} justifyContent="flex-end">
          <Button
            variant="outlined"
            onClick={handleReset}
            disabled={!hasUnsavedChanges || isSaving}
            startIcon={<RefreshIcon />}
          >
            Reset
          </Button>
          
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
            startIcon={<SaveIcon />}
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </Box>

        {hasUnsavedChanges && (
          <Alert severity="info">
            You have unsaved changes. Click "Save Configuration" to apply them.
          </Alert>
        )}
      </Stack>
    </Box>
  );
};