// frontend/admin-crm/src/components/questionnaires/FieldFormDialog.tsx

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
import { 
  type FieldFormDialogProps,
  type QuestionnaireFieldFormData,
  type CreateQuestionnaireFieldData,
  type UpdateQuestionnaireFieldData,
  QUESTIONNAIRE_FIELD_TYPES,
} from '../../types/questionnaires.types';
import { tokens } from '../../design-system';

const defaultFormData: QuestionnaireFieldFormData = {
  id: '',
  name: '',
  type: 'text',
  required: false,
  order: 1,
  options: [],
  // Phase 1.1
  description: '',
  placeholder: '',
  // Phase 1.3 (deprecated)
  is_guest_count: false,
  // Phase 2.1
  show_conditions: {},
  // Phase 4.1
  max_file_size_mb: 10,
  allowed_file_types: [],
  max_files: 1,
};

export const FieldFormDialog: React.FC<FieldFormDialogProps> = ({
  open,
  onClose,
  editingField,
  questionnaireId,
  onSubmit,
  isLoading,
}) => {
  const [formData, setFormData] = useState<QuestionnaireFieldFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (editingField) {
        setFormData({
          id: editingField.id?.toString() || '',
          name: editingField.name || '',
          type: editingField.type || 'text',
          required: editingField.required ?? false,
          order: editingField.order || 1,
          options: editingField.options || [],
          // Phase 1.1
          description: editingField.description || '',
          placeholder: editingField.placeholder || '',
          // Phase 1.3
          is_guest_count: editingField.is_guest_count ?? false,
          // Phase 2.1
          show_conditions: editingField.show_conditions || {},
          // Phase 4.1
          max_file_size_mb: editingField.max_file_size_mb || 10,
          allowed_file_types: editingField.allowed_file_types || [],
          max_files: editingField.max_files || 1,
        });
      } else {
        setFormData(defaultFormData);
      }
      setErrors({});
    }
  }, [editingField, open]);

  const handleInputChange = (field: keyof QuestionnaireFieldFormData) => (
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

  const handleSwitchChange = (field: keyof QuestionnaireFieldFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.checked,
    }));
  };

  const handleOptionChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt),
    }));
  };

  const handleAddOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, ''],
    }));
  };

  const handleRemoveOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Field name is required';
    }

    if (!formData.order || formData.order < 1) {
      newErrors.order = 'Order must be a positive number';
    }

    // Options required for select/multi-select but NOT for guests (categories are optional)
    if ((formData.type === 'select' || formData.type === 'multi-select') && formData.options.length === 0) {
      newErrors.options = 'Options are required for select fields';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    // Determine if options are needed based on type
    const needsOptions = formData.type === 'select' || formData.type === 'multi-select' || formData.type === 'guests';

    const submitData: CreateQuestionnaireFieldData | UpdateQuestionnaireFieldData = {
      name: formData.name.trim(),
      type: formData.type,
      required: formData.required,
      order: formData.order || 1,
      // Options for select, multi-select, and guests (categories)
      options: needsOptions
        ? formData.options.filter(opt => opt.trim())
        : [],
      // Phase 1.1: Description and placeholder
      description: formData.description.trim(),
      placeholder: formData.placeholder.trim(),
      // Phase 1.3: Only include is_guest_count for number fields (deprecated)
      is_guest_count: formData.type === 'number' ? formData.is_guest_count : false,
      // Phase 2.1: Conditional display (skip if empty)
      ...(Object.keys(formData.show_conditions).length > 0 && {
        show_conditions: formData.show_conditions,
      }),
      // Phase 4.1: File upload settings (only for file type)
      ...(formData.type === 'file' && {
        max_file_size_mb: formData.max_file_size_mb,
        allowed_file_types: formData.allowed_file_types,
        max_files: formData.max_files,
      }),
    };

    if (questionnaireId && !editingField) {
      (submitData as CreateQuestionnaireFieldData).questionnaire = questionnaireId;
    }

    onSubmit(submitData);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const requiresOptions = (type: string) => type === 'select' || type === 'multi-select' || type === 'guests';
  const isFileType = (type: string) => type === 'file';
  const isGuestsType = (type: string) => type === 'guests';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: tokens.spacing.radius.xxl,
          border: `1px solid ${tokens.color.borders.glass}`,
        }
      }}
    >
      {open && (
        <>
          <DialogTitle sx={{ fontWeight: 700, textAlign: 'center' }}>
            {editingField ? 'Edit Field' : 'Create New Field'}
          </DialogTitle>
      
          <DialogContent>
            <Box component="form" noValidate sx={{ mt: 1 }}>
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  label="Field Name"
                  value={formData.name}
                  onChange={handleInputChange('name')}
                  error={!!errors.name}
                  helperText={errors.name}
                  required
                />

                <FormControl fullWidth>
                  <InputLabel>Field Type</InputLabel>
                  <Select
                    value={formData.type}
                    onChange={handleInputChange('type')}
                    label="Field Type"
                  >
                    {QUESTIONNAIRE_FIELD_TYPES.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Phase 1.1: Description field */}
                <TextField
                  fullWidth
                  label="Description (Helper Text)"
                  value={formData.description}
                  onChange={handleInputChange('description')}
                  multiline
                  rows={2}
                  placeholder="Optional: Provide guidance or instructions for this field"
                  helperText="Shown below the field to help users understand what to enter"
                />

                {/* Phase 1.1: Placeholder field (for text-like inputs) */}
                {['text', 'number', 'email', 'phone'].includes(formData.type) && (
                  <TextField
                    fullWidth
                    label="Placeholder Text"
                    value={formData.placeholder}
                    onChange={handleInputChange('placeholder')}
                    placeholder="e.g., Enter your answer here..."
                    helperText="Shown inside the input field when empty"
                  />
                )}

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
                          checked={formData.required}
                          onChange={handleSwitchChange('required')}
                        />
                      }
                      label="Required Field"
                    />
                  </Box>
                </Box>

                {formData.type === 'number' && (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: tokens.spacing.radius.lg,
                      border: `1px solid ${tokens.color.borders.glass}`,
                      background: formData.is_guest_count
                        ? `linear-gradient(135deg, ${tokens.color.primary[50]} 0%, ${tokens.color.primary[100]} 100%)`
                        : 'transparent',
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.is_guest_count}
                          onChange={handleSwitchChange('is_guest_count')}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            Guest Count Field
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            This field captures the number of guests/participants
                          </Typography>
                        </Box>
                      }
                    />
                  </Box>
                )}

                {requiresOptions(formData.type) && (
                  <Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6">
                        {isGuestsType(formData.type) ? 'Guest Categories' : 'Options'}
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={handleAddOption}
                      >
                        {isGuestsType(formData.type) ? 'Add Category' : 'Add Option'}
                      </Button>
                    </Box>

                    {isGuestsType(formData.type) && (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        Define guest categories (e.g., Adults, Children, Infants). Leave empty for a simple total count.
                      </Alert>
                    )}

                    {formData.options.length === 0 ? (
                      <Alert severity={isGuestsType(formData.type) ? 'info' : 'warning'}>
                        {isGuestsType(formData.type)
                          ? 'No categories defined. Users will enter a single total guest count.'
                          : 'At least one option is required for select fields.'}
                      </Alert>
                    ) : (
                      <Stack spacing={1}>
                        {formData.options.map((option, index) => (
                          <Box key={index} display="flex" gap={1}>
                            <TextField
                              size="small"
                              fullWidth
                              placeholder={isGuestsType(formData.type)
                                ? `Category ${index + 1} (e.g., Adults)`
                                : `Option ${index + 1}`}
                              value={option}
                              onChange={(e) => handleOptionChange(index, e.target.value)}
                            />
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoveOption(index)}
                            >
                              <RemoveIcon />
                            </IconButton>
                          </Box>
                        ))}
                      </Stack>
                    )}

                    {errors.options && (
                      <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                        {errors.options}
                      </Typography>
                    )}
                  </Box>
                )}

                {/* Phase 4.1: File upload settings */}
                {isFileType(formData.type) && (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: tokens.spacing.radius.lg,
                      border: `1px solid ${tokens.color.borders.glass}`,
                      background: `linear-gradient(135deg, ${tokens.color.neutral[50]} 0%, ${tokens.color.neutral[100]} 100%)`,
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={600} mb={2}>
                      File Upload Settings
                    </Typography>
                    <Stack spacing={2}>
                      <Box display="flex" gap={2}>
                        <TextField
                          label="Max File Size (MB)"
                          type="number"
                          value={formData.max_file_size_mb}
                          onChange={handleInputChange('max_file_size_mb')}
                          inputProps={{ min: 1, max: 100 }}
                          size="small"
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          label="Max Files"
                          type="number"
                          value={formData.max_files}
                          onChange={handleInputChange('max_files')}
                          inputProps={{ min: 1, max: 10 }}
                          size="small"
                          sx={{ flex: 1 }}
                        />
                      </Box>
                      <TextField
                        label="Allowed File Types"
                        value={formData.allowed_file_types.join(', ')}
                        onChange={(e) => {
                          const types = e.target.value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
                          setFormData(prev => ({ ...prev, allowed_file_types: types }));
                        }}
                        placeholder="pdf, jpg, png, doc"
                        helperText="Comma-separated list of allowed extensions (leave empty for all types)"
                        size="small"
                      />
                    </Stack>
                  </Box>
                )}
              </Stack>
            </Box>
          </DialogContent>
          
          <DialogActions sx={{ p: 3, borderTop: `1px solid ${tokens.color.borders.glass}`, gap: 2 }}>
            <Button
              onClick={handleClose}
              disabled={isLoading}
              variant="outlined"
              sx={{ borderRadius: tokens.spacing.radius.full, px: 3, py: 1, fontWeight: 600 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : undefined}
              sx={{ borderRadius: tokens.spacing.radius.full, px: 4, py: 1, fontWeight: 600 }}
            >
              {isLoading ? 'Saving...' : editingField ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};