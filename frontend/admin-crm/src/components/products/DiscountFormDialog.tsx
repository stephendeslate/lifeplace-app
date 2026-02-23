// frontend/admin-crm/src/components/products/DiscountFormDialog.tsx

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
  Divider,
  CircularProgress,
  InputAdornment,
  Chip,
  Autocomplete,
  Alert,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useProducts, useProductCategories } from '../../hooks/useProducts';
import type {
  Discount,
  CreateDiscountData,
  UpdateDiscountData,
  DiscountFormData,
} from '../../types/products.types';

interface DiscountFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingDiscount?: Discount | null;
  onSubmit: (data: CreateDiscountData | UpdateDiscountData) => void;
  isLoading: boolean;
}

const defaultFormData: DiscountFormData = {
  name: '',
  code: '',
  description: '',
  discount_type: 'PERCENTAGE',
  application_type: 'CODE_REQUIRED',
  value: '',
  is_active: true,
  valid_from: new Date().toISOString().split('T')[0],
  valid_until: '',
  max_uses: '',
  max_uses_per_client: '',
  minimum_order_amount: '',
  minimum_hours: '',
  applicable_products: [],
  applicable_categories: [],
};

export const DiscountFormDialog: React.FC<DiscountFormDialogProps> = ({
  open,
  onClose,
  editingDiscount,
  onSubmit,
  isLoading,
}) => {
  const [formData, setFormData] = useState<DiscountFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { products, isLoadingProducts } = useProducts({ is_active: true });
  const { categories, isLoadingCategories } = useProductCategories({ is_active: true });

  useEffect(() => {
    if (open) {
      if (editingDiscount) {
        setFormData({
          name: editingDiscount.name || '',
          code: editingDiscount.code || '',
          description: editingDiscount.description || '',
          discount_type: editingDiscount.discount_type || 'PERCENTAGE',
          application_type: editingDiscount.application_type || 'CODE_REQUIRED',
          value: editingDiscount.value?.toString() || '',
          is_active: editingDiscount.is_active ?? true,
          valid_from: editingDiscount.valid_from || new Date().toISOString().split('T')[0],
          valid_until: editingDiscount.valid_until || '',
          max_uses: editingDiscount.max_uses?.toString() || '',
          max_uses_per_client: editingDiscount.max_uses_per_client?.toString() || '',
          minimum_order_amount: editingDiscount.minimum_order_amount?.toString() || '',
          minimum_hours: editingDiscount.minimum_hours?.toString() || '',
          applicable_products: editingDiscount.applicable_products || [],
          applicable_categories: editingDiscount.applicable_categories || [],
        });
      } else {
        setFormData(defaultFormData);
      }
      setErrors({});
    }
  }, [editingDiscount, open]);

  const handleInputChange =
    (field: keyof DiscountFormData) =>
    (
      event:
        | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
        | { target: { value: unknown } },
    ) => {
      const value = event.target.value;
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: '',
        }));
      }
    };

  const handleSwitchChange =
    (field: keyof DiscountFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.checked,
      }));
    };

  const handleDateChange = (field: 'valid_from' | 'valid_until') => (date: Date | null) => {
    if (date) {
      setFormData((prev) => ({
        ...prev,
        [field]: date.toISOString().split('T')[0],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleProductsChange = (_event: React.SyntheticEvent, newValue: number[]) => {
    setFormData((prev) => ({
      ...prev,
      applicable_products: newValue,
    }));
  };

  const handleCategoriesChange = (_event: React.SyntheticEvent, newValue: number[]) => {
    setFormData((prev) => ({
      ...prev,
      applicable_categories: newValue,
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

    if (formData.application_type === 'CODE_REQUIRED' && !formData.code.trim()) {
      newErrors.code = 'Code is required for code-based discounts';
    }

    if (!formData.value || parseFloat(formData.value) <= 0) {
      newErrors.value = 'Valid discount value is required';
    }

    if (formData.discount_type === 'PERCENTAGE') {
      const percentage = parseFloat(formData.value);
      if (percentage > 100) {
        newErrors.value = 'Percentage cannot exceed 100%';
      }
    }

    if (!formData.valid_from) {
      newErrors.valid_from = 'Valid from date is required';
    }

    if (formData.valid_from && formData.valid_until && formData.valid_until < formData.valid_from) {
      newErrors.valid_until = 'Valid until date must be after valid from date';
    }

    if (formData.max_uses && parseInt(formData.max_uses) <= 0) {
      newErrors.max_uses = 'Max uses must be greater than 0';
    }

    if (formData.max_uses_per_client && parseInt(formData.max_uses_per_client) <= 0) {
      newErrors.max_uses_per_client = 'Max uses per client must be greater than 0';
    }

    if (formData.minimum_order_amount && parseFloat(formData.minimum_order_amount) <= 0) {
      newErrors.minimum_order_amount = 'Minimum order amount must be greater than 0';
    }

    if (formData.minimum_hours && parseInt(formData.minimum_hours) <= 0) {
      newErrors.minimum_hours = 'Minimum hours must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const submitData: CreateDiscountData | UpdateDiscountData = {
      name: formData.name.trim(),
      code: formData.application_type === 'CODE_REQUIRED' ? formData.code.trim() : null,
      description: formData.description.trim(),
      discount_type: formData.discount_type,
      application_type: formData.application_type,
      value: formData.value,
      is_active: formData.is_active,
      valid_from: formData.valid_from,
      valid_until: formData.valid_until || null,
      max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
      max_uses_per_client: formData.max_uses_per_client
        ? parseInt(formData.max_uses_per_client)
        : null,
      minimum_order_amount: formData.minimum_order_amount || null,
      minimum_hours: formData.minimum_hours ? parseInt(formData.minimum_hours) : null,
      applicable_products:
        formData.applicable_products.length > 0 ? formData.applicable_products : undefined,
      applicable_categories:
        formData.applicable_categories.length > 0 ? formData.applicable_categories : undefined,
    };

    onSubmit(submitData);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const getValueLabel = () => {
    switch (formData.discount_type) {
      case 'PERCENTAGE':
        return 'Percentage (%)';
      case 'FIXED':
        return 'Fixed Amount';
      case 'FREE_HOURS':
        return 'Free Hours';
      default:
        return 'Value';
    }
  };

  const getValueAdornment = () => {
    switch (formData.discount_type) {
      case 'PERCENTAGE':
        return '%';
      case 'FIXED':
        return 'PHP';
      case 'FREE_HOURS':
        return 'hrs';
      default:
        return '';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' },
      }}
    >
      {open && (
        <>
          <DialogTitle>{editingDiscount ? 'Edit Discount' : 'Create New Discount'}</DialogTitle>

          <DialogContent>
            <Box component="form" noValidate sx={{ mt: 1 }}>
              {/* Basic Information */}
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Discount Name"
                    value={formData.name}
                    onChange={handleInputChange('name')}
                    error={!!errors.name}
                    helperText={errors.name}
                    required
                    sx={{ flex: 2 }}
                  />
                  <FormControl sx={{ flex: 1 }}>
                    <InputLabel>Application Type</InputLabel>
                    <Select
                      value={formData.application_type}
                      onChange={handleInputChange('application_type')}
                      label="Application Type"
                    >
                      <MenuItem value="CODE_REQUIRED">Code Required</MenuItem>
                      <MenuItem value="AUTOMATIC">Automatic</MenuItem>
                      <MenuItem value="ADMIN_ONLY">Admin Only</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={handleInputChange('description')}
                  error={!!errors.description}
                  helperText={errors.description}
                  multiline
                  rows={2}
                  required
                />

                {formData.application_type === 'CODE_REQUIRED' && (
                  <TextField
                    label="Discount Code"
                    value={formData.code}
                    onChange={handleInputChange('code')}
                    error={!!errors.code}
                    helperText={errors.code}
                    required
                    sx={{ maxWidth: 300 }}
                  />
                )}
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Discount Configuration */}
              <Typography variant="h6" gutterBottom>
                Discount Configuration
              </Typography>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl sx={{ flex: 1 }}>
                  <InputLabel>Discount Type</InputLabel>
                  <Select
                    value={formData.discount_type}
                    onChange={handleInputChange('discount_type')}
                    label="Discount Type"
                  >
                    <MenuItem value="PERCENTAGE">Percentage</MenuItem>
                    <MenuItem value="FIXED">Fixed Amount</MenuItem>
                    <MenuItem value="FREE_HOURS">Free Hours</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label={getValueLabel()}
                  value={formData.value}
                  onChange={handleInputChange('value')}
                  error={!!errors.value}
                  helperText={errors.value}
                  type="number"
                  InputProps={{
                    endAdornment: getValueAdornment() ? (
                      <InputAdornment position="end">{getValueAdornment()}</InputAdornment>
                    ) : undefined,
                  }}
                  required
                  sx={{ flex: 1 }}
                />
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Validity Period */}
              <Typography variant="h6" gutterBottom>
                Validity Period
              </Typography>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <DatePicker
                  label="Valid From"
                  value={formData.valid_from ? new Date(formData.valid_from) : null}
                  onChange={handleDateChange('valid_from')}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!errors.valid_from,
                      helperText: errors.valid_from,
                      required: true,
                      sx: { flex: 1 },
                    },
                  }}
                />
                <DatePicker
                  label="Valid Until (Optional)"
                  value={formData.valid_until ? new Date(formData.valid_until) : null}
                  onChange={handleDateChange('valid_until')}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!errors.valid_until,
                      helperText: errors.valid_until || 'Leave empty for no expiration',
                      sx: { flex: 1 },
                    },
                  }}
                />
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Usage Limits */}
              <Typography variant="h6" gutterBottom>
                Usage Limits
              </Typography>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Max Total Uses (Optional)"
                  value={formData.max_uses}
                  onChange={handleInputChange('max_uses')}
                  error={!!errors.max_uses}
                  helperText={errors.max_uses || 'Leave empty for unlimited'}
                  type="number"
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Max Uses Per Client (Optional)"
                  value={formData.max_uses_per_client}
                  onChange={handleInputChange('max_uses_per_client')}
                  error={!!errors.max_uses_per_client}
                  helperText={errors.max_uses_per_client || 'Leave empty for unlimited'}
                  type="number"
                  sx={{ flex: 1 }}
                />
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Requirements */}
              <Typography variant="h6" gutterBottom>
                Minimum Requirements
              </Typography>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Minimum Order Amount (Optional)"
                  value={formData.minimum_order_amount}
                  onChange={handleInputChange('minimum_order_amount')}
                  error={!!errors.minimum_order_amount}
                  helperText={errors.minimum_order_amount}
                  type="number"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">PHP</InputAdornment>,
                  }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Minimum Hours (Optional)"
                  value={formData.minimum_hours}
                  onChange={handleInputChange('minimum_hours')}
                  error={!!errors.minimum_hours}
                  helperText={errors.minimum_hours}
                  type="number"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                  }}
                  sx={{ flex: 1 }}
                />
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Applicable Items */}
              <Typography variant="h6" gutterBottom>
                Applicable Items
              </Typography>

              <Alert severity="info" sx={{ mb: 2 }}>
                Leave both fields empty to apply the discount to all products and categories
              </Alert>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Autocomplete
                  multiple
                  options={products.map((p) => p.id)}
                  getOptionLabel={(option) => {
                    const product = products.find((p) => p.id === option);
                    return product ? `${product.name} (${product.category_name})` : '';
                  }}
                  value={formData.applicable_products}
                  onChange={handleProductsChange}
                  loading={isLoadingProducts}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      const product = products.find((p) => p.id === option);
                      return (
                        <Chip
                          variant="outlined"
                          label={product?.name || ''}
                          {...getTagProps({ index })}
                          key={option}
                        />
                      );
                    })
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Applicable Products (Optional)"
                      placeholder="Select products..."
                    />
                  )}
                />

                <Autocomplete
                  multiple
                  options={categories.map((c) => c.id)}
                  getOptionLabel={(option) => {
                    const category = categories.find((c) => c.id === option);
                    return category ? category.full_path : '';
                  }}
                  value={formData.applicable_categories}
                  onChange={handleCategoriesChange}
                  loading={isLoadingCategories}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      const category = categories.find((c) => c.id === option);
                      return (
                        <Chip
                          variant="outlined"
                          label={category?.name || ''}
                          {...getTagProps({ index })}
                          key={option}
                        />
                      );
                    })
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Applicable Categories (Optional)"
                      placeholder="Select categories..."
                    />
                  )}
                />
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Settings */}
              <Typography variant="h6" gutterBottom>
                Settings
              </Typography>

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
              </Box>
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : undefined}
            >
              {isLoading ? 'Saving...' : editingDiscount ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};
