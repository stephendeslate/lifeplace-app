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
} from '@mui/icons-material';
import { DraggableList } from '../common/DraggableList';
import { 
  type QuestionnaireFormDialogProps,
  type QuestionnaireFormData,
  type QuestionnaireFieldFormData,
  type QuestionnaireFieldType,
  type CreateQuestionnaireData,
  type UpdateQuestionnaireData,
  QUESTIONNAIRE_FIELD_TYPES,
} from '../../types/questionnaires.types';
import { useEventTypes } from '../../hooks/useEvents';
import { tokens } from '../../design-system';
import { glassPresets } from '../../design-system/utils/glassmorphism';

const defaultFormData: QuestionnaireFormData = {
  name: '',
  event_type: '',
  is_active: true,
  order: '1',
  fields: [],
};

const defaultFieldData: QuestionnaireFieldFormData = {
  id: '',
  name: '',
  type: 'text',
  required: false,
  order: 1,
  options: [],
  description: '',
  placeholder: '',
  is_guest_count: false,
  show_conditions: {},
  max_file_size_mb: 10,
  allowed_file_types: [],
  max_files: 1,
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

  // Fetch event types for the dropdown
  const { useActiveEventTypes } = useEventTypes();
  const { 
    data: eventTypes = [], 
    isLoading: isLoadingEventTypes,
    error: eventTypesError 
  } = useActiveEventTypes();

  useEffect(() => {
    if (open) {
      if (editingQuestionnaire) {
        setFormData({
          name: editingQuestionnaire.name || '',
          event_type: editingQuestionnaire.event_type?.toString() || '',
          is_active: editingQuestionnaire.is_active ?? true,
          order: editingQuestionnaire.order?.toString() || '1',
          fields: editingQuestionnaire.fields?.map((field, index) => ({
            id: field.id.toString(),
            name: field.name,
            type: field.type,
            required: field.required,
            order: field.order || index + 1,
            options: field.options || [],
            description: field.description || '',
            placeholder: field.placeholder || '',
            is_guest_count: field.is_guest_count || false,
            show_conditions: field.show_conditions || {},
            max_file_size_mb: field.max_file_size_mb || 10,
            allowed_file_types: field.allowed_file_types || [],
            max_files: field.max_files || 1,
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

  const handleFieldChange = (index: number, field: keyof QuestionnaireFieldFormData, value: unknown) => {
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
        id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        order: prev.fields.length + 1,
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

  const handleFieldReorder = (reorderedFields: QuestionnaireFieldFormData[]) => {
    // Update the order property of each field
    const fieldsWithUpdatedOrder = reorderedFields.map((field, index) => ({
      ...field,
      order: index + 1,
    }));
    
    setFormData(prev => ({
      ...prev,
      fields: fieldsWithUpdatedOrder,
    }));
  };

  const renderFieldItem = (field: QuestionnaireFieldFormData) => {
    const fieldIndex = formData.fields.findIndex(f => f === field);
    
    return (
      <Box>
        <Stack spacing={2}>
          <TextField
            fullWidth
            label="Field Name"
            value={field.name}
            onChange={(e) => handleFieldChange(fieldIndex, 'name', e.target.value)}
            error={!!errors[`field_${fieldIndex}_name`]}
            helperText={errors[`field_${fieldIndex}_name`]}
            required
            size="small"
          />

          <Box display="flex" gap={2}>
            <FormControl sx={{ flex: 1 }} size="small">
              <InputLabel>Field Type</InputLabel>
              <Select
                value={field.type}
                onChange={(e) => handleFieldChange(fieldIndex, 'type', e.target.value)}
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
                    onChange={(e) => handleFieldChange(fieldIndex, 'required', e.target.checked)}
                  />
                }
                label="Required"
              />
            </Box>

            <IconButton 
              size="small" 
              color="error"
              onClick={() => handleRemoveField(fieldIndex)}
              sx={{ alignSelf: 'center' }}
            >
              <RemoveIcon />
            </IconButton>
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
                  onClick={() => handleAddOption(fieldIndex)}
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
                        onChange={(e) => handleOptionChange(fieldIndex, optionIndex, e.target.value)}
                      />
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveOption(fieldIndex, optionIndex)}
                      >
                        <RemoveIcon />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              )}

              {errors[`field_${fieldIndex}_options`] && (
                <Typography variant="caption" color="error">
                  {errors[`field_${fieldIndex}_options`]}
                </Typography>
              )}
            </Box>
          )}
        </Stack>
      </Box>
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { 
          minHeight: '80vh',
          ...glassPresets.light,
          borderRadius: tokens.spacing.radius.xxl,
          border: `1px solid ${tokens.color.borders.glass}`,
          background: `linear-gradient(135deg, ${tokens.color.neutral[50]} 0%, ${tokens.color.neutral[100]} 100%)`,
          boxShadow: `0 25px 80px ${tokens.color.neutral[900]}20`,
        }
      }}
    >
      {open && (
        <>
          <DialogTitle 
            sx={{
              background: `linear-gradient(135deg, ${tokens.color.primary[600]} 0%, ${tokens.color.primary[500]} 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              fontWeight: 700,
              fontSize: '1.5rem',
              textAlign: 'center',
              pb: 1,
            }}
          >
            {editingQuestionnaire ? 'Edit Questionnaire' : 'Create New Questionnaire'}
          </DialogTitle>
      
          <DialogContent>
            <Box sx={{ mt: 1 }}>
              {/* Tab Navigation */}
              <Box 
                display="flex" 
                gap={2} 
                mb={4}
                sx={{
                  ...glassPresets.light,
                  borderRadius: tokens.spacing.radius.full,
                  p: 1,
                  border: `1px solid ${tokens.color.borders.glass}`,
                }}
              >
                <Button
                  variant={activeTab === 'basic' ? 'contained' : 'outlined'}
                  onClick={() => setActiveTab('basic')}
                  size="small"
                  sx={{
                    flex: 1,
                    borderRadius: tokens.spacing.radius.full,
                    fontWeight: 600,
                    ...(activeTab === 'basic' ? {
                      background: `linear-gradient(135deg, ${tokens.color.primary[500]} 0%, ${tokens.color.primary[600]} 100%)`,
                      boxShadow: `0 4px 20px ${tokens.color.primary[500]}25`,
                    } : {
                      ...glassPresets.light,
                      border: 'none',
                      '&:hover': {
                        background: `linear-gradient(135deg, ${tokens.color.primary[50]} 0%, ${tokens.color.primary[100]} 100%)`,
                      },
                    }),
                  }}
                >
                  Basic Information
                </Button>
                <Button
                  variant={activeTab === 'fields' ? 'contained' : 'outlined'}
                  onClick={() => setActiveTab('fields')}
                  size="small"
                  sx={{
                    flex: 1,
                    borderRadius: tokens.spacing.radius.full,
                    fontWeight: 600,
                    ...(activeTab === 'fields' ? {
                      background: `linear-gradient(135deg, ${tokens.color.primary[500]} 0%, ${tokens.color.primary[600]} 100%)`,
                      boxShadow: `0 4px 20px ${tokens.color.primary[500]}25`,
                    } : {
                      ...glassPresets.light,
                      border: 'none',
                      '&:hover': {
                        background: `linear-gradient(135deg, ${tokens.color.primary[50]} 0%, ${tokens.color.primary[100]} 100%)`,
                      },
                    }),
                  }}
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
                  
                  <FormControl fullWidth error={!!eventTypesError}>
                    <InputLabel>Event Type (Optional)</InputLabel>
                    <Select
                      value={formData.event_type}
                      onChange={handleInputChange('event_type')}
                      label="Event Type (Optional)"
                      disabled={isLoadingEventTypes}
                    >
                      <MenuItem value="">
                        <em>Any Event Type</em>
                      </MenuItem>
                      {eventTypes.map((eventType) => (
                        <MenuItem key={eventType.id} value={eventType.id.toString()}>
                          <Box>
                            <Typography variant="body2">{eventType.name}</Typography>
                            {eventType.description && (
                              <Typography variant="caption" color="text.secondary">
                                {eventType.description}
                              </Typography>
                            )}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    {isLoadingEventTypes && (
                      <Box display="flex" alignItems="center" gap={1} mt={1}>
                        <CircularProgress size={16} />
                        <Typography variant="caption" color="text.secondary">
                          Loading event types...
                        </Typography>
                      </Box>
                    )}
                    {eventTypesError && (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        Failed to load event types. You can still create the questionnaire without specifying an event type.
                      </Alert>
                    )}
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
                    <DraggableList
                      items={formData.fields}
                      onReorder={handleFieldReorder}
                      renderItem={renderFieldItem}
                      keyExtractor={(field) => field.id}
                      showSaveButton={false}
                      enableKeyboardReorder={true}
                      emptyMessage="No fields added yet."
                    />
                  )}
                </Box>
              )}
            </Box>
          </DialogContent>
          
          <DialogActions 
            sx={{ 
              p: 3,
              background: `linear-gradient(135deg, ${tokens.color.neutral[50]} 0%, ${tokens.color.neutral[100]} 100%)`,
              borderTop: `1px solid ${tokens.color.borders.glass}`,
              gap: 2,
            }}
          >
            <Button 
              onClick={handleClose}
              disabled={isLoading}
              sx={{
                ...glassPresets.light,
                border: `1px solid ${tokens.color.neutral[300]}`,
                borderRadius: tokens.spacing.radius.full,
                px: 3,
                py: 1,
                fontWeight: 600,
                '&:hover': {
                  ...glassPresets.medium,
                  border: `1px solid ${tokens.color.neutral[400]}`,
                },
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              variant="contained"
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : undefined}
              sx={{
                background: `linear-gradient(135deg, ${tokens.color.primary[500]} 0%, ${tokens.color.primary[600]} 100%)`,
                borderRadius: tokens.spacing.radius.full,
                px: 4,
                py: 1,
                fontWeight: 600,
                boxShadow: `0 8px 32px ${tokens.color.primary[500]}25`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${tokens.color.primary[600]} 0%, ${tokens.color.primary[700]} 100%)`,
                  boxShadow: `0 12px 40px ${tokens.color.primary[500]}35`,
                },
                '&:disabled': {
                  background: tokens.color.neutral[300],
                  boxShadow: 'none',
                },
              }}
            >
              {isLoading ? 'Saving...' : editingQuestionnaire ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};