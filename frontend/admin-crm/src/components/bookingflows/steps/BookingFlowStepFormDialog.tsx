// frontend/admin-crm/src/components/bookingflows/steps/BookingFlowStepFormDialog.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Settings as ConfigIcon,
} from '@mui/icons-material';
import { 
  type BookingFlowStepFormDialogProps,
  type BookingFlowStepFormData,
  type CreateBookingFlowStepData,
  type UpdateBookingFlowStepData,
  type StepType,
  STEP_TYPES,
} from '../../../types/bookingflows.types';

const defaultFormData: BookingFlowStepFormData = {
  step_type: 'introduction',
  name: '',
  description: '',
  is_enabled: true,
  is_required: true,
  is_skippable: false,
  display_conditions: {},
  configuration: {},
  validation_rules: {},
};

export const BookingFlowStepFormDialog: React.FC<BookingFlowStepFormDialogProps> = ({
  open,
  onClose,
  editingStep,
  flowId,
  onSubmit,
  isLoading,
}) => {
  const [formData, setFormData] = useState<BookingFlowStepFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [conditionsExpanded, setConditionsExpanded] = useState(false);
  const [validationExpanded, setValidationExpanded] = useState(false);

  useEffect(() => {
    if (open) {
      if (editingStep) {
        setFormData({
          step_type: editingStep.step_type,
          name: editingStep.name || '',
          description: editingStep.description || '',
          is_enabled: editingStep.is_enabled ?? true,
          is_required: editingStep.is_required ?? true,
          is_skippable: editingStep.is_skippable ?? false,
          display_conditions: editingStep.display_conditions || {},
          configuration: editingStep.configuration || {},
          validation_rules: editingStep.validation_rules || {},
        });
      } else {
        setFormData(defaultFormData);
      }
      setErrors({});
      setConditionsExpanded(false);
      setValidationExpanded(false);
    }
  }, [editingStep, open]);

  const handleInputChange = (field: keyof BookingFlowStepFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | 
           { target: { value: unknown } }
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

  const handleSwitchChange = (field: keyof BookingFlowStepFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.checked,
    }));
  };

  const handleStepTypeChange = (stepType: StepType) => {
    setFormData(prev => ({
      ...prev,
      step_type: stepType,
      name: prev.name || getDefaultStepName(stepType),
    }));
  };

  const getDefaultStepName = (stepType: StepType): string => {
    const stepTypeObj = STEP_TYPES.find(type => type.value === stepType);
    return stepTypeObj?.label || stepType;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Step name is required';
    }

    if (!formData.step_type) {
      newErrors.step_type = 'Step type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const submitData: CreateBookingFlowStepData | UpdateBookingFlowStepData = {
      step_type: formData.step_type,
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      is_enabled: formData.is_enabled,
      is_required: formData.is_required,
      is_skippable: formData.is_skippable,
      display_conditions: formData.display_conditions,
      configuration: formData.configuration,
      validation_rules: formData.validation_rules,
    };

    // Add booking_flow for create operations (order will be auto-assigned by backend)
    if (!editingStep && flowId) {
      (submitData as CreateBookingFlowStepData).booking_flow = flowId;
    }

    onSubmit(submitData);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const getStepTypeIcon = (stepType: StepType) => {
    // Return appropriate icon based on step type
    return <ConfigIcon fontSize="small" />;
  };

  const getStepTypeDescription = (stepType: StepType) => {
    const descriptions = {
      introduction: 'Welcome message and flow overview',
      event_details: 'Collect basic event information',
      date_time: 'Date and time selection with availability',
      questionnaire: 'Custom questionnaires and forms',
      package_selection: 'Choose from available packages',
      addon_selection: 'Optional add-on services',
      availability_check: 'Real-time availability verification',
      pricing_summary: 'Display pricing breakdown',
      contact_info: 'Collect client contact details',
      payment_info: 'Payment method and processing',
      review_booking: 'Review all booking details',
      confirmation: 'Booking confirmation and next steps',
    };

    return descriptions[stepType] || 'Custom step configuration';
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      {open && (
        <>
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <ConfigIcon color="primary" />
              {editingStep ? 'Edit Booking Step' : 'Create New Step'}
            </Box>
          </DialogTitle>
      
          <DialogContent>
            <Box sx={{ mt: 1 }}>
              <Stack spacing={3}>
                {/* Step Type Selection */}
                <FormControl fullWidth required>
                  <InputLabel>Step Type</InputLabel>
                  <Select
                    value={formData.step_type}
                    onChange={(e) => handleStepTypeChange(e.target.value as StepType)}
                    label="Step Type"
                    error={!!errors.step_type}
                    disabled={!!editingStep} // Can't change type after creation
                  >
                    {STEP_TYPES.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        <Box display="flex" alignItems="center" gap={1}>
                          {getStepTypeIcon(type.value)}
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {type.label}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {getStepTypeDescription(type.value)}
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.step_type && (
                    <Typography variant="caption" color="error">
                      {errors.step_type}
                    </Typography>
                  )}
                </FormControl>

                {/* Basic Information */}
                <TextField
                  fullWidth
                  label="Step Name"
                  value={formData.name}
                  onChange={handleInputChange('name')}
                  error={!!errors.name}
                  helperText={errors.name || 'A descriptive name for this step'}
                  required
                />
                
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={handleInputChange('description')}
                  multiline
                  rows={2}
                  helperText="Optional description for this step"
                />

                {/* Order Information Notice */}
                <Alert severity="info">
                  Step order will be automatically assigned based on the current flow structure. 
                  You can reorder steps after creation using the step management interface.
                </Alert>

                {/* Step Configuration */}
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Step Configuration
                  </Typography>
                  
                  <Stack spacing={2}>
                    <Box display="flex" flexDirection="column" gap={1}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.is_enabled}
                            onChange={handleSwitchChange('is_enabled')}
                          />
                        }
                        label="Enabled"
                      />
                      <Typography variant="caption" color="text.secondary">
                        Only enabled steps are shown to clients
                      </Typography>
                    </Box>

                    <Box display="flex" flexDirection="column" gap={1}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.is_required}
                            onChange={handleSwitchChange('is_required')}
                          />
                        }
                        label="Required"
                      />
                      <Typography variant="caption" color="text.secondary">
                        Required steps must be completed to proceed
                      </Typography>
                    </Box>

                    <Box display="flex" flexDirection="column" gap={1}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.is_skippable}
                            onChange={handleSwitchChange('is_skippable')}
                          />
                        }
                        label="Skippable"
                      />
                      <Typography variant="caption" color="text.secondary">
                        Allow clients to skip this step
                      </Typography>
                    </Box>
                  </Stack>
                </Box>

                {/* Advanced Configuration */}
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Advanced Configuration
                  </Typography>

                  {/* Display Conditions */}
                  <Accordion 
                    expanded={conditionsExpanded} 
                    onChange={(_, expanded) => setConditionsExpanded(expanded)}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle2">Display Conditions</Typography>
                        {Object.keys(formData.display_conditions).length > 0 && (
                          <Chip label="Configured" size="small" color="info" />
                        )}
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Alert severity="info" sx={{ mb: 2 }}>
                        Display conditions control when this step is shown based on previous step data.
                        Leave empty to always show this step.
                      </Alert>
                      <TextField
                        fullWidth
                        label="Conditions (JSON)"
                        value={JSON.stringify(formData.display_conditions, null, 2)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            setFormData(prev => ({
                              ...prev,
                              display_conditions: parsed,
                            }));
                          } catch {
                            // Invalid JSON, ignore
                          }
                        }}
                        multiline
                        rows={4}
                        helperText="JSON object defining display conditions"
                      />
                    </AccordionDetails>
                  </Accordion>

                  {/* Validation Rules */}
                  <Accordion 
                    expanded={validationExpanded} 
                    onChange={(_, expanded) => setValidationExpanded(expanded)}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle2">Validation Rules</Typography>
                        {Object.keys(formData.validation_rules).length > 0 && (
                          <Chip label="Configured" size="small" color="warning" />
                        )}
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Alert severity="info" sx={{ mb: 2 }}>
                        Validation rules ensure data quality and completeness for this step.
                      </Alert>
                      <TextField
                        fullWidth
                        label="Validation Rules (JSON)"
                        value={JSON.stringify(formData.validation_rules, null, 2)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            setFormData(prev => ({
                              ...prev,
                              validation_rules: parsed,
                            }));
                          } catch {
                            // Invalid JSON, ignore
                          }
                        }}
                        multiline
                        rows={4}
                        helperText="JSON object defining validation rules"
                      />
                    </AccordionDetails>
                  </Accordion>
                </Box>
              </Stack>
            </Box>
          </DialogContent>
          
          <DialogActions sx={{ p: 3 }}>
            <Button 
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              variant="contained"
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : undefined}
            >
              {isLoading ? 'Saving...' : editingStep ? 'Update Step' : 'Create Step'}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};