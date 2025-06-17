// frontend/admin-crm/src/components/questionnaires/QuestionnaireFormDialog.tsx

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
  IconButton,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import { 
  type QuestionnaireFormDialogProps,
  type QuestionnaireFormData,
  type QuestionnaireFieldFormData,
  type QuestionnaireFieldType,
  type CreateQuestionnaireData,
  type UpdateQuestionnaireData,
  QUESTIONNAIRE_FIELD_TYPES,
} from '../../types/questionnaires.types';

const defaultFormData: QuestionnaireFormData = {
  name: '',
  event_type: '',
  is_active: true,
  order: '1',
  fields: [],
};

const defaultFieldData: QuestionnaireFieldFormData = {
  name: '',
  type: 'text',
  required: false,
  order: '1',
  options: [],
};

export const QuestionnaireFormDialog: React.FC<QuestionnaireFormDialogProps> = ({
  open,
  onClose,
  editingQuestionnaire,
  onSubmit,
  isLoading,
}) => {
  const [formData, setFormData] = useState<QuestionnaireFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'basic' | 'fields'>('basic');

  useEffect(() => {
    if (open) {
      if (editingQuestionnaire) {
        setFormData({
          name: editingQuestionnaire.name || '',
          event_type: editingQuestionnaire.event_type?.toString() || '',
          is_active: editingQuestionnaire.is_active ?? true,
          order: editingQuestionnaire.order?.toString() || '1',
          fields: editingQuestionnaire.fields?.map((field, index) => ({
            name: field.name,
            type: field.type,
            required: field.required,
            order: (field.order || index + 1).toString(),
            options: field.options || [],
          })) || [],
        });
      } else {
        setFormData(defaultFormData);
      }
      setErrors({});
      setActiveTab('basic');
    }
  }, [editingQuestionnaire, open]);

  const handleInputChange = (field: keyof QuestionnaireFormData) => (
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

  const handleSwitchChange = (field: keyof QuestionnaireFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.checked,
    }));
  };

  const handleFieldChange = (index: number, field: keyof QuestionnaireFieldFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map((f, i) => 
        i === index ? { ...f, [field]: value } : f
      ),
    }));
    
    // Clear field-specific errors
    const errorKey = `field_${index}_${field}`;
    if (errors[errorKey]) {
      setErrors(prev => ({
        ...prev,
        [errorKey]: '',
      }));
    }
  };

  const handleAddField = () => {
    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, {
        ...defaultFieldData,
        order: (prev.fields.length + 1).toString(),
      }],
    }));
  };

  const handleRemoveField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
  };

  const handleOptionChange = (fieldIndex: number, optionIndex: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map((field, i) => 
        i === fieldIndex 
          ? {
              ...field,
              options: field.options.map((opt, oi) => 
                oi === optionIndex ? value : opt
              )
            }
          : field
      ),
    }));
  };

  const handleAddOption = (fieldIndex: number) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map((field, i) => 
        i === fieldIndex 
          ? { ...field, options: [...field.options, ''] }
          : field
      ),
    }));
  };

  const handleRemoveOption = (fieldIndex: number, optionIndex: number) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map((field, i) => 
        i === fieldIndex 
          ? { 
              ...field, 
              options: field.options.filter((_, oi) => oi !== optionIndex)
            }
          : field
      ),
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.order || parseInt(formData.order) < 1) {
      newErrors.order = 'Order must be a positive number';
    }

    // Validate fields
    formData.fields.forEach((field, index) => {
      if (!field.name.trim()) {
        newErrors[`field_${index}_name`] = 'Field name is required';
      }

      if ((field.type === 'select' || field.type === 'multi-select') && field.options.length === 0) {
        newErrors[`field_${index}_options`] = 'Options are required for select fields';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const submitData: CreateQuestionnaireData | UpdateQuestionnaireData = {
      name: formData.name.trim(),
      event_type: formData.event_type ? parseInt(formData.event_type) : null,
      is_active: formData.is_active,
      order: parseInt(formData.order) || 1,
      fields: formData.fields.map((field, index) => ({
        name: field.name.trim(),
        type: field.type,
        required: field.required,
        order: index + 1,
        options: (field.type === 'select' || field.type === 'multi-select') 
          ? field.options.filter(opt => opt.trim()) 
          : null,
      })),
    };

    onSubmit(submitData);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const requiresOptions = (type: QuestionnaireFieldType) => 
    type === 'select' || type === 'multi-select';

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
      {open && (
        <>
          <DialogTitle>
            {editingQuestionnaire ? 'Edit Questionnaire' : 'Create New Questionnaire'}
          </DialogTitle>
      
          <DialogContent>
            <Box sx={{ mt: 1 }}>
              {/* Tab Navigation */}
              <Box display="flex" gap={1} mb={3}>
                <Button
                  variant={activeTab === 'basic' ? 'contained' : 'outlined'}
                  onClick={() => setActiveTab('basic')}
                  size="small"
                >
                  Basic Information
                </Button>
                <Button
                  variant={activeTab === 'fields' ? 'contained' : 'outlined'}
                  onClick={() => setActiveTab('fields')}
                  size="small"
                >
                  Fields ({formData.fields.length})
                </Button>
              </Box>

              {activeTab === 'basic' && (
                <Box display="flex" flexDirection="column" gap={3}>
                  {/* Basic Information */}
                  <TextField
                    fullWidth
                    label="Questionnaire Name"
                    value={formData.name}
                    onChange={handleInputChange('name')}
                    error={!!errors.name}
                    helperText={errors.name}
                    required
                  />
                  
                  <FormControl fullWidth>
                    <InputLabel>Event Type (Optional)</InputLabel>
                    <Select
                      value={formData.event_type}
                      onChange={handleInputChange('event_type')}
                      label="Event Type (Optional)"
                    >
                      <MenuItem value="">
                        <em>Any Event Type</em>
                      </MenuItem>
                      {/* TODO: Add event types from API */}
                    </Select>
                  </FormControl>
                  
                  <Box display="flex" gap={2}>
                    <TextField
                      label="Display Order"
                      value={formData.order}
                      onChange={handleInputChange('order')}
                      error={!!errors.order}
                      helperText={errors.order || 'Lower numbers appear first'}
                      type="number"
                      sx={{ flex: 1 }}
                    />
                    
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.is_active}
                            onChange={handleSwitchChange('is_active')}
                          />
                        }
                        label="Active"
                      />
                    </Box>
                  </Box>
                </Box>
              )}

              {activeTab === 'fields' && (
                <Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                      Questionnaire Fields
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={handleAddField}
                    >
                      Add Field
                    </Button>
                  </Box>

                  {formData.fields.length === 0 ? (
                    <Alert severity="info">
                      No fields added yet. Click "Add Field" to create your first question.
                    </Alert>
                  ) : (
                    <Stack spacing={3}>
                      {formData.fields.map((field, index) => (
                        <Box key={index} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <DragIcon color="action" />
                              <Typography variant="subtitle2">
                                Field #{index + 1}
                              </Typography>
                            </Box>
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleRemoveField(index)}
                            >
                              <RemoveIcon />
                            </IconButton>
                          </Box>

                          <Stack spacing={2}>
                            <TextField
                              fullWidth
                              label="Field Name"
                              value={field.name}
                              onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                              error={!!errors[`field_${index}_name`]}
                              helperText={errors[`field_${index}_name`]}
                              required
                            />

                            <Box display="flex" gap={2}>
                              <FormControl sx={{ flex: 1 }}>
                                <InputLabel>Field Type</InputLabel>
                                <Select
                                  value={field.type}
                                  onChange={(e) => handleFieldChange(index, 'type', e.target.value)}
                                  label="Field Type"
                                >
                                  {QUESTIONNAIRE_FIELD_TYPES.map((type) => (
                                    <MenuItem key={type.value} value={type.value}>
                                      {type.label}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>

                              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={field.required}
                                      onChange={(e) => handleFieldChange(index, 'required', e.target.checked)}
                                    />
                                  }
                                  label="Required"
                                />
                              </Box>
                            </Box>

                            {requiresOptions(field.type) && (
                              <Box>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                  <Typography variant="subtitle2">
                                    Options
                                  </Typography>
                                  <Button
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={() => handleAddOption(index)}
                                  >
                                    Add Option
                                  </Button>
                                </Box>

                                {field.options.length === 0 ? (
                                  <Alert severity="warning" sx={{ mb: 1 }}>
                                    At least one option is required for select fields.
                                  </Alert>
                                ) : (
                                  <Stack spacing={1}>
                                    {field.options.map((option, optionIndex) => (
                                      <Box key={optionIndex} display="flex" gap={1}>
                                        <TextField
                                          size="small"
                                          fullWidth
                                          placeholder={`Option ${optionIndex + 1}`}
                                          value={option}
                                          onChange={(e) => handleOptionChange(index, optionIndex, e.target.value)}
                                        />
                                        <IconButton
                                          size="small"
                                          color="error"
                                          onClick={() => handleRemoveOption(index, optionIndex)}
                                        >
                                          <RemoveIcon />
                                        </IconButton>
                                      </Box>
                                    ))}
                                  </Stack>
                                )}

                                {errors[`field_${index}_options`] && (
                                  <Typography variant="caption" color="error">
                                    {errors[`field_${index}_options`]}
                                  </Typography>
                                )}
                              </Box>
                            )}
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Box>
              )}
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
              {isLoading ? 'Saving...' : editingQuestionnaire ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};