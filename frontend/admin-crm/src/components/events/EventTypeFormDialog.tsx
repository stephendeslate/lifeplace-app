// frontend/admin-crm/src/components/events/EventTypeFormDialog.tsx

import React, { useState, useEffect } from 'react';
import {
  TextField,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Stack,
} from '@mui/material';
import { ModernDialog, createDialogActions } from '../common';
import { 
  type EventTypeFormDialogProps,
  type EventTypeFormData,
  type CreateEventTypeData,
  type UpdateEventTypeData,
} from '../../types/events.types';
import { tokens } from '../../design-system';
import { glassInputStyles } from '../../design-system/utils/glassmorphism';

const defaultFormData: EventTypeFormData = {
  name: '',
  description: '',
  is_active: true,
};

export const EventTypeFormDialog: React.FC<EventTypeFormDialogProps> = ({
  open,
  onClose,
  editingEventType,
  onSubmit,
  isLoading,
}) => {
  const [formData, setFormData] = useState<EventTypeFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (editingEventType) {
        setFormData({
          name: editingEventType.name || '',
          description: editingEventType.description || '',
          is_active: editingEventType.is_active ?? true,
        });
      } else {
        setFormData(defaultFormData);
      }
      setErrors({});
    }
  }, [editingEventType, open]);

  const handleInputChange = (field: keyof EventTypeFormData) => (
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

  const handleSwitchChange = (field: keyof EventTypeFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.checked,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Event type name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const submitData: CreateEventTypeData | UpdateEventTypeData = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      is_active: formData.is_active,
    };

    onSubmit(submitData);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const actions = createDialogActions(
    handleClose,
    handleSubmit,
    {
      cancelLabel: 'Cancel',
      confirmLabel: isLoading 
        ? 'Saving...' 
        : editingEventType 
          ? 'Update Event Type' 
          : 'Create Event Type',
      isLoading,
      confirmDisabled: isLoading,
    }
  );

  return (
    <ModernDialog
      open={open}
      onClose={handleClose}
      title={editingEventType ? 'Edit Event Type' : 'Create New Event Type'}
      actions={actions}
      maxWidth="sm"
      fullWidth
    >
      {open && (
            <Box component="form" noValidate>
              <Stack spacing={4}>
                <TextField
                  fullWidth
                  label="Event Type Name"
                  value={formData.name}
                  onChange={handleInputChange('name')}
                  error={!!errors.name}
                  helperText={errors.name}
                  required
                  placeholder="e.g., Wedding, Corporate Event, Birthday Party"
                  sx={glassInputStyles}
                />
                
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={handleInputChange('description')}
                  error={!!errors.description}
                  helperText={errors.description || 'Optional description of this event type'}
                  multiline
                  rows={4}
                  placeholder="Describe this event type and what makes it unique..."
                  sx={glassInputStyles}
                />

                <Box
                  sx={{
                    p: 3,
                    borderRadius: tokens.spacing.radius.lg,
                    border: `1px solid ${tokens.color.borders.glass}`,
                    backgroundColor: tokens.color.neutral[50],
                  }}
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.is_active}
                        onChange={handleSwitchChange('is_active')}
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: tokens.color.success[500],
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: tokens.color.success[500],
                          },
                        }}
                      />
                    }
                    label={
                      <Typography variant="subtitle2" fontWeight="600">
                        {formData.is_active ? 'Active Event Type' : 'Inactive Event Type'}
                      </Typography>
                    }
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 4 }}>
                    {formData.is_active 
                      ? 'This event type is available for creating new events and will appear in booking forms'
                      : 'This event type is hidden from event creation and booking forms'
                    }
                  </Typography>
                </Box>
              </Stack>
            </Box>
      )}
    </ModernDialog>
  );
};