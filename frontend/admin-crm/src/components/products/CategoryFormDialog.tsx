// frontend/admin-crm/src/components/products/CategoryFormDialog.tsx

import React, { useState, useEffect } from 'react';
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Stack,
  Typography,
  Divider,
  InputAdornment,
} from '@mui/material';
import { ModernDialog, createDialogActions } from '../common';
import { useProductCategories } from '../../hooks/useProducts';
import type { 
  ProductCategory, 
  CreateCategoryData, 
  UpdateCategoryData, 
  CategoryFormData 
} from '../../types/products.types';

interface CategoryFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingCategory?: ProductCategory | null;
  onSubmit: (data: CreateCategoryData | UpdateCategoryData) => void;
  isLoading: boolean;
}

const defaultFormData: CategoryFormData = {
  name: '',
  description: '',
  parent: '',
  is_active: true,
  sort_order: '0',
  requires_venue: false,
  typical_duration_hours: '',
};

export const CategoryFormDialog: React.FC<CategoryFormDialogProps> = ({
  open,
  onClose,
  editingCategory,
  onSubmit,
  isLoading,
}) => {
  const [formData, setFormData] = useState<CategoryFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  const { categories, isLoadingCategories } = useProductCategories({ is_active: true });

  // Filter out the current category and its children to prevent circular references
  const availableParents = React.useMemo(() => {
    return editingCategory
      ? categories.filter(cat => 
          cat.id !== editingCategory.id && 
          !cat.full_path.includes(editingCategory.name)
        )
      : categories;
  }, [categories, editingCategory]);

  // Check if the current parent value is valid
  const isValidParent = React.useCallback((parentId: string) => {
    if (!parentId) return true; // Empty is always valid
    return availableParents.some(cat => cat.id.toString() === parentId);
  }, [availableParents]);

  useEffect(() => {
    if (open && !initialized) {
      if (editingCategory) {
        const initialParent = editingCategory.parent?.toString() || '';
        console.log('Editing category:', editingCategory);
        
        setFormData({
          name: editingCategory.name || '',
          description: editingCategory.description || '',
          parent: isValidParent(initialParent) ? initialParent : '',
          is_active: editingCategory.is_active ?? true,
          sort_order: editingCategory.sort_order?.toString() || '0',
          requires_venue: editingCategory.requires_venue ?? false,
          typical_duration_hours: editingCategory.typical_duration_hours?.toString() || '',
        });
      } else {
        setFormData(defaultFormData);
      }
      setInitialized(true);
      setErrors({});
    }
  }, [open, editingCategory, initialized, isValidParent]);

  useEffect(() => {
    if (!open) {
      setInitialized(false);
    }
  }, [open]);

  const handleInputChange = (field: keyof CategoryFormData) => (
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

  const handleSwitchChange = (field: keyof CategoryFormData) => (
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
      newErrors.name = 'Name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.typical_duration_hours && parseInt(formData.typical_duration_hours) <= 0) {
      newErrors.typical_duration_hours = 'Duration must be greater than 0';
    }

    if (formData.parent && !isValidParent(formData.parent)) {
      newErrors.parent = 'Selected parent category is no longer available';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const submitData: CreateCategoryData | UpdateCategoryData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      parent: formData.parent ? parseInt(formData.parent) : null,
      is_active: formData.is_active,
      sort_order: parseInt(formData.sort_order) || 0,
      requires_venue: formData.requires_venue,
      typical_duration_hours: formData.typical_duration_hours ? parseInt(formData.typical_duration_hours) : null,
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
      confirmLabel: editingCategory ? 'Update Category' : 'Create Category',
      isLoading,
      confirmDisabled: isLoading,
    }
  );

  return (
    <ModernDialog
      open={open}
      onClose={handleClose}
      title={editingCategory ? 'Edit Category' : 'Create New Category'}
      actions={actions}
      maxWidth="sm"
      fullWidth
      contentSx={{ minHeight: '60vh' }}
    >
      {open && (
            <Box component="form" noValidate sx={{ mt: 1 }}>
              {/* Basic Information */}
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Category Name"
                  value={formData.name}
                  onChange={handleInputChange('name')}
                  error={!!errors.name}
                  helperText={errors.name}
                  required
                />
                
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={handleInputChange('description')}
                  error={!!errors.description}
                  helperText={errors.description}
                  multiline
                  rows={3}
                  required
                />
                
                <FormControl fullWidth error={!!errors.parent}>
                  <InputLabel>Parent Category (Optional)</InputLabel>
                  <Select
                    value={isValidParent(formData.parent) ? formData.parent : ''}
                    onChange={handleInputChange('parent')}
                    label="Parent Category (Optional)"
                    disabled={isLoadingCategories}
                  >
                    <MenuItem value="">
                      <em>None (Root Category)</em>
                    </MenuItem>
                    {availableParents.map((category) => (
                      <MenuItem key={category.id} value={category.id.toString()}>
                        {category.full_path}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.parent && (
                    <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                      {errors.parent}
                    </Typography>
                  )}
                </FormControl>
              </Stack>

              <Divider sx={{ my: 3 }} />

              {/* Configuration */}
              <Typography variant="h6" gutterBottom>
                Configuration
              </Typography>
              
              <Stack spacing={2}>
                <Box display="flex" gap={2}>
                  <TextField
                    label="Typical Duration (Hours)"
                    value={formData.typical_duration_hours}
                    onChange={handleInputChange('typical_duration_hours')}
                    error={!!errors.typical_duration_hours}
                    helperText={errors.typical_duration_hours || 'Average event duration for this category'}
                    type="number"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">hours</InputAdornment>,
                    }}
                    sx={{ flex: 1 }}
                  />
                  
                  <TextField
                    label="Sort Order"
                    value={formData.sort_order}
                    onChange={handleInputChange('sort_order')}
                    type="number"
                    helperText="Lower numbers appear first"
                    sx={{ flex: 1 }}
                  />
                </Box>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.requires_venue}
                      onChange={handleSwitchChange('requires_venue')}
                    />
                  }
                  label="Requires Venue Specification"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_active}
                      onChange={handleSwitchChange('is_active')}
                    />
                  }
                  label="Active"
                />
              </Stack>
            </Box>
      )}
    </ModernDialog>
  );
};