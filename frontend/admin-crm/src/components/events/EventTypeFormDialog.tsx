// frontend/admin-crm/src/components/events/EventTypeFormDialog.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  CircularProgress,
  Stack,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { 
  type EventTypeFormDialogProps,
  type EventTypeFormData,
  type CreateEventTypeData,
  type UpdateEventTypeData,
} from '../../types/events.types';

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

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      {open && (
        <>
          <DialogTitle>
            {editingEventType ? 'Edit Event Type' : 'Create New Event Type'}
          </DialogTitle>
      
          <DialogContent>
            <Box component="form" noValidate sx={{ mt: 1 }}>
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  label="Event Type Name"
                  value={formData.name}
                  onChange={handleInputChange('name')}
                  error={!!errors.name}
                  helperText={errors.name}
                  required
                  placeholder="e.g., Wedding, Corporate Event, Birthday Party"
                />
                
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={handleInputChange('description')}
                  error={!!errors.description}
                  helperText={errors.description || 'Optional description of this event type'}
                  multiline
                  rows={3}
                  placeholder="Describe this event type..."
                />

                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.is_active}
                        onChange={handleSwitchChange('is_active')}
                      />
                    }
                    label="Active"
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {formData.is_active 
                      ? 'This event type is available for new events'
                      : 'This event type is hidden from new event creation'
                    }
                  </Typography>
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
              startIcon={isLoading ? <CircularProgress size={20} /> : <SaveIcon />}
              sx={{ minWidth: 120 }}
            >
              {isLoading ? 'Saving...' : editingEventType ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};