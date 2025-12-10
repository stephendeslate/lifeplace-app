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
import { glassPresets } from '../../design-system/utils/glassmorphism';

const defaultFormData: QuestionnaireFieldFormData = {
  id: '',
  name: '',
  type: 'text',
  required: false,
  order: 1,
  options: [],
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

    if ((formData.type === 'select' || formData.type === 'multi-select') && formData.options.length === 0) {
      newErrors.options = 'Options are required for select fields';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const submitData: CreateQuestionnaireFieldData | UpdateQuestionnaireFieldData = {
      name: formData.name.trim(),
      type: formData.type,
      required: formData.required,
      order: formData.order || 1,
      // Use empty array for non-select fields instead of null
      options: (formData.type === 'select' || formData.type === 'multi-select')
        ? formData.options.filter(opt => opt.trim())
        : [],
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

  const requiresOptions = (type: string) => type === 'select' || type === 'multi-select';

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
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
              fontSize: '1.25rem',
              textAlign: 'center',
              pb: 1,
            }}
          >
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

                {requiresOptions(formData.type) && (
                  <Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6">
                        Options
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={handleAddOption}
                      >
                        Add Option
                      </Button>
                    </Box>

                    {formData.options.length === 0 ? (
                      <Alert severity="warning">
                        At least one option is required for select fields.
                      </Alert>
                    ) : (
                      <Stack spacing={1}>
                        {formData.options.map((option, index) => (
                          <Box key={index} display="flex" gap={1}>
                            <TextField
                              size="small"
                              fullWidth
                              placeholder={`Option ${index + 1}`}
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
              </Stack>
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
              {isLoading ? 'Saving...' : editingField ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};