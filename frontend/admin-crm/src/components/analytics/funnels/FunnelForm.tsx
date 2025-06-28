// frontend/admin-crm/src/components/analytics/funnels/FunnelForm.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  FormControlLabel,
  Switch,
  IconButton,
  Divider,
  Alert,
  Chip,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  PlayArrow as StartIcon,
  CheckCircle as CompleteIcon,
} from '@mui/icons-material';
import type { 
  ConversionFunnel, 
  CreateConversionFunnelData, 
  UpdateConversionFunnelData,
  FunnelStep 
} from '../../../types/analytics.types';

interface StepEditorProps {
  steps: FunnelStep[];
  onChange: (steps: FunnelStep[]) => void;
}

const StepEditor: React.FC<StepEditorProps> = ({ steps, onChange }) => {
  const addStep = () => {
    const newStep: FunnelStep = {
      event_name: '',
      name: '',
      description: '',
      order: steps.length,
    };
    onChange([...steps, newStep]);
  };

  const updateStep = (index: number, updatedStep: Partial<FunnelStep>) => {
    const newSteps = steps.map((step, i) => 
      i === index ? { ...step, ...updatedStep } : step
    );
    onChange(newSteps);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    // Reorder remaining steps
    const reorderedSteps = newSteps.map((step, i) => ({ ...step, order: i }));
    onChange(reorderedSteps);
  };

  const moveStep = (fromIndex: number, toIndex: number) => {
    const newSteps = [...steps];
    const [movedStep] = newSteps.splice(fromIndex, 1);
    newSteps.splice(toIndex, 0, movedStep);
    // Reorder all steps
    const reorderedSteps = newSteps.map((step, i) => ({ ...step, order: i }));
    onChange(reorderedSteps);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Funnel Steps
        </Typography>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={addStep}
          size="small"
        >
          Add Step
        </Button>
      </Box>

      {steps.length === 0 ? (
        <Alert severity="info">
          Add at least 2 steps to create a conversion funnel. Steps represent events that users complete in sequence.
        </Alert>
      ) : (
        <Stack spacing={2}>
          {steps.map((step, index) => (
            <Box
              key={index}
              sx={{
                p: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'background.paper',
              }}
            >
              <Box display="flex" alignItems="flex-start" gap={2}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: index === 0 ? 'success.main' : index === steps.length - 1 ? 'primary.main' : 'grey.300',
                    color: 'white',
                    flexShrink: 0,
                    mt: 1,
                  }}
                >
                  {index === 0 ? (
                    <StartIcon fontSize="small" />
                  ) : index === steps.length - 1 ? (
                    <CompleteIcon fontSize="small" />
                  ) : (
                    <Typography variant="body2" fontWeight="bold">
                      {index + 1}
                    </Typography>
                  )}
                </Box>

                <Box flex={1}>
                  <Box display="flex" gap={2} mb={2}>
                    <TextField
                      label="Step Name"
                      value={step.name}
                      onChange={(e) => updateStep(index, { name: e.target.value })}
                      size="small"
                      fullWidth
                      required
                      error={!step.name}
                      helperText={!step.name ? 'Step name is required' : ''}
                    />
                    <TextField
                      label="Event Name"
                      value={step.event_name}
                      onChange={(e) => updateStep(index, { event_name: e.target.value })}
                      size="small"
                      fullWidth
                      required
                      error={!step.event_name}
                      helperText={!step.event_name ? 'Event name is required' : 'Analytics event to track'}
                    />
                  </Box>

                  <TextField
                    label="Description (Optional)"
                    value={step.description || ''}
                    onChange={(e) => updateStep(index, { description: e.target.value })}
                    size="small"
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="Describe what happens in this step..."
                  />
                </Box>

                <Box display="flex" flexDirection="column" gap={1}>
                  <IconButton
                    size="small"
                    onClick={() => moveStep(index, Math.max(0, index - 1))}
                    disabled={index === 0}
                    title="Move up"
                  >
                    <DragIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => removeStep(index)}
                    disabled={steps.length <= 1}
                    color="error"
                    title="Remove step"
                  >
                    <DeleteIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => moveStep(index, Math.min(steps.length - 1, index + 1))}
                    disabled={index === steps.length - 1}
                    title="Move down"
                  >
                    <DragIcon />
                  </IconButton>
                </Box>
              </Box>

              {/* Step preview */}
              <Box mt={2}>
                <Typography variant="caption" color="text.secondary">
                  Step {index + 1}: {step.name || 'Unnamed Step'}
                  {step.event_name && ` (tracks: ${step.event_name})`}
                </Typography>
              </Box>
            </Box>
          ))}
        </Stack>
      )}

      {steps.length > 0 && (
        <Box mt={2}>
          <Typography variant="body2" color="text.secondary">
            <strong>Preview:</strong> Users will progress through {steps.length} steps: {' '}
            {steps.map((step, index) => (
              <React.Fragment key={index}>
                <Chip 
                  label={step.name || `Step ${index + 1}`} 
                  size="small" 
                  variant="outlined"
                />
                {index < steps.length - 1 && ' → '}
              </React.Fragment>
            ))}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

interface FunnelFormProps {
  open: boolean;
  onClose: () => void;
  editingFunnel?: ConversionFunnel | null;
  onSubmit: (data: CreateConversionFunnelData | UpdateConversionFunnelData) => void;
  isLoading: boolean;
}

export const FunnelForm: React.FC<FunnelFormProps> = ({
  open,
  onClose,
  editingFunnel,
  onSubmit,
  isLoading,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    steps: [] as FunnelStep[],
    time_window_hours: 24,
    is_active: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingFunnel) {
      setFormData({
        name: editingFunnel.name,
        description: editingFunnel.description || '',
        steps: editingFunnel.steps || [],
        time_window_hours: editingFunnel.time_window_hours,
        is_active: editingFunnel.is_active,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        steps: [],
        time_window_hours: 24,
        is_active: true,
      });
    }
    setErrors({});
  }, [editingFunnel, open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Funnel name is required';
    }

    if (formData.steps.length < 2) {
      newErrors.steps = 'At least 2 steps are required';
    }

    // Validate each step
    // @ts-ignore
    const stepErrors = formData.steps.some((step, index) => {
      if (!step.name.trim()) {
        newErrors[`step_${index}_name`] = `Step ${index + 1} name is required`;
        return true;
      }
      if (!step.event_name.trim()) {
        newErrors[`step_${index}_event`] = `Step ${index + 1} event name is required`;
        return true;
      }
      return false;
    });

    if (formData.time_window_hours <= 0) {
      newErrors.time_window_hours = 'Time window must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    const submitData = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      steps: formData.steps.map((step, index) => ({
        ...step,
        name: step.name.trim(),
        event_name: step.event_name.trim(),
        description: step.description?.trim() || undefined,
        order: index,
      })),
      time_window_hours: formData.time_window_hours,
      is_active: formData.is_active,
    };

    onSubmit(submitData);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle>
        {editingFunnel ? 'Edit Conversion Funnel' : 'Create New Conversion Funnel'}
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {/* Basic Information */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
            
            <Stack spacing={2}>
              <TextField
                label="Funnel Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                fullWidth
                required
                error={!!errors.name}
                helperText={errors.name || 'Give your funnel a descriptive name'}
                disabled={isLoading}
              />

              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                fullWidth
                multiline
                rows={3}
                placeholder="Describe what this funnel tracks..."
                disabled={isLoading}
              />
            </Stack>
          </Box>

          <Divider />

          {/* Configuration */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Configuration
            </Typography>
            
            <Stack spacing={2}>
              <TextField
                label="Time Window (Hours)"
                type="number"
                value={formData.time_window_hours}
                onChange={(e) => setFormData({ ...formData, time_window_hours: parseInt(e.target.value) || 24 })}
                inputProps={{ min: 1, max: 168 }} // 1 hour to 1 week
                error={!!errors.time_window_hours}
                helperText={errors.time_window_hours || 'Maximum time allowed between first and last step'}
                disabled={isLoading}
                sx={{ maxWidth: 200 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    disabled={isLoading}
                  />
                }
                label="Active"
              />
            </Stack>
          </Box>

          <Divider />

          {/* Steps Configuration */}
          <Box>
            <StepEditor
              steps={formData.steps}
              onChange={(steps) => setFormData({ ...formData, steps })}
            />
            {errors.steps && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {errors.steps}
              </Alert>
            )}
          </Box>

          {/* Validation Summary */}
          {Object.keys(errors).length > 0 && (
            <Alert severity="error">
              <Typography variant="body2" gutterBottom>
                Please fix the following issues:
              </Typography>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {Object.values(errors).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button 
          onClick={handleClose}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isLoading || formData.steps.length < 2 || !formData.name.trim()}
        >
          {isLoading ? 'Saving...' : editingFunnel ? 'Update Funnel' : 'Create Funnel'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};