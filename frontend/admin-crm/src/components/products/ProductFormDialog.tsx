// frontend/admin-crm/src/components/products/ProductFormDialog.tsx

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
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import { useProductCategories } from '../../hooks/useProducts';
import type { 
  ProductOption, 
  CreateProductData, 
  UpdateProductData, 
  ProductFormData,
} from '../../types/products.types';

interface ProductFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingProduct?: ProductOption | null;
  onSubmit: (data: CreateProductData | UpdateProductData) => void;
  isLoading: boolean;
}

const defaultFormData: ProductFormData = {
  name: '',
  description: '',
  category: '',
  pricing_model: 'FIXED',
  base_price: '',
  currency: 'PHP',
  tax_rate: '12.00',
  type: 'PRODUCT',
  is_active: true,
  is_featured: false,
  allow_multiple: false,
  requires_approval: false,
  has_excess_hours: false,
  included_hours: '',
  excess_hour_price: '',
  minimum_hours: '',
  maximum_hours: '',
  advance_booking_days: '7',
  maximum_booking_days: '',
  sku: '',
  sort_order: '0',
};

export const ProductFormDialog: React.FC<ProductFormDialogProps> = ({
  open,
  onClose,
  editingProduct,
  onSubmit,
  isLoading,
}) => {
  const [formData, setFormData] = useState<ProductFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { categories, isLoadingCategories } = useProductCategories({ is_active: true });

  useEffect(() => {
    if (open) {
      if (editingProduct) {
        setFormData({
          name: editingProduct.name || '',
          description: editingProduct.description || '',
          category: editingProduct.category?.toString() || '',
          pricing_model: editingProduct.pricing_model || 'FIXED',
          base_price: editingProduct.base_price || '',
          currency: editingProduct.currency || 'PHP',
          tax_rate: editingProduct.tax_rate || '12.00',
          type: editingProduct.type || 'PRODUCT',
          is_active: editingProduct.is_active ?? true,
          is_featured: editingProduct.is_featured ?? false,
          allow_multiple: editingProduct.allow_multiple ?? false,
          requires_approval: editingProduct.requires_approval ?? false,
          has_excess_hours: editingProduct.has_excess_hours ?? false,
          included_hours: editingProduct.included_hours?.toString() || '',
          excess_hour_price: editingProduct.excess_hour_price || '',
          minimum_hours: editingProduct.minimum_hours?.toString() || '',
          maximum_hours: editingProduct.maximum_hours?.toString() || '',
          advance_booking_days: editingProduct.advance_booking_days?.toString() || '7',
          maximum_booking_days: editingProduct.maximum_booking_days?.toString() || '',
          sku: editingProduct.sku || '',
          sort_order: editingProduct.sort_order?.toString() || '0',
        });
      } else {
        setFormData(defaultFormData);
      }
      setErrors({});
    }
  }, [editingProduct, open]);

  const handleInputChange = (field: keyof ProductFormData) => (
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

  const handleSwitchChange = (field: keyof ProductFormData) => (
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

    if (!formData.category || formData.category === '') {
      newErrors.category = 'Category is required';
    }

    if (!formData.base_price || parseFloat(formData.base_price) <= 0) {
      newErrors.base_price = 'Valid price is required';
    }

    if (formData.has_excess_hours) {
      if (!formData.included_hours || parseInt(formData.included_hours) <= 0) {
        newErrors.included_hours = 'Included hours required when excess hours enabled';
      }
      if (!formData.excess_hour_price || parseFloat(formData.excess_hour_price) <= 0) {
        newErrors.excess_hour_price = 'Excess hour price required when excess hours enabled';
      }
    }

    if (formData.minimum_hours && formData.maximum_hours) {
      const min = parseInt(formData.minimum_hours);
      const max = parseInt(formData.maximum_hours);
      if (min > max) {
        newErrors.maximum_hours = 'Maximum hours must be greater than minimum hours';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const submitData: CreateProductData | UpdateProductData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      category: formData.category ? parseInt(formData.category.toString()) : 0,
      pricing_model: formData.pricing_model,
      base_price: formData.base_price,
      currency: formData.currency,
      tax_rate: formData.tax_rate,
      type: formData.type,
      is_active: formData.is_active,
      is_featured: formData.is_featured,
      allow_multiple: formData.allow_multiple,
      requires_approval: formData.requires_approval,
      has_excess_hours: formData.has_excess_hours,
      included_hours: formData.included_hours ? parseInt(formData.included_hours) : null,
      excess_hour_price: formData.excess_hour_price || null,
      minimum_hours: formData.minimum_hours ? parseInt(formData.minimum_hours) : null,
      maximum_hours: formData.maximum_hours ? parseInt(formData.maximum_hours) : null,
      advance_booking_days: parseInt(formData.advance_booking_days) || 7,
      maximum_booking_days: formData.maximum_booking_days ? parseInt(formData.maximum_booking_days) : null,
      sku: formData.sku || null,
      sort_order: parseInt(formData.sort_order) || 0,
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
      {open && (
        <>
          <DialogTitle>
            {editingProduct ? 'Edit Product' : 'Create New Product'}
          </DialogTitle>
      
          <DialogContent>
            <Box component="form" noValidate sx={{ mt: 1 }}>
              {/* Basic Information */}
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              
              <Box display="flex" flexDirection="column" gap={2}>
                <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                  <Box flex={2}>
                    <TextField
                      fullWidth
                      label="Product Name"
                      value={formData.name}
                      onChange={handleInputChange('name')}
                      error={!!errors.name}
                      helperText={errors.name}
                      required
                    />
                  </Box>
                  <Box flex={1}>
                    <FormControl fullWidth error={!!errors.type}>
                      <InputLabel>Type</InputLabel>
                      <Select
                        value={formData.type}
                        onChange={handleInputChange('type')}
                        label="Type"
                      >
                        <MenuItem value="PRODUCT">Product</MenuItem>
                        <MenuItem value="PACKAGE">Package</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>
                
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
                
                <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                  <Box flex={1}>
                    <FormControl fullWidth error={!!errors.category}>
                      <InputLabel>Category</InputLabel>
                      <Select
                        value={formData.category}
                        onChange={handleInputChange('category')}
                        label="Category"
                        disabled={isLoadingCategories}
                      >
                        {categories.map((category) => (
                          <MenuItem key={category.id} value={category.id}>
                            {category.full_path}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.category && (
                        <Typography variant="caption" color="error">
                          {errors.category}
                        </Typography>
                      )}
                    </FormControl>
                  </Box>
                  
                  <Box flex={1}>
                    <TextField
                      fullWidth
                      label="SKU (Optional)"
                      value={formData.sku}
                      onChange={handleInputChange('sku')}
                      placeholder="Auto-generated if empty"
                    />
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Pricing */}
              <Typography variant="h6" gutterBottom>
                Pricing
              </Typography>
              
              <Box display="flex" flexDirection="column" gap={2}>
                <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                  <Box flex={1}>
                    <FormControl fullWidth>
                      <InputLabel>Pricing Model</InputLabel>
                      <Select
                        value={formData.pricing_model}
                        onChange={handleInputChange('pricing_model')}
                        label="Pricing Model"
                      >
                        <MenuItem value="FIXED">Fixed Price</MenuItem>
                        <MenuItem value="HOURLY">Hourly Rate</MenuItem>
                        <MenuItem value="TIERED">Tiered Pricing</MenuItem>
                        <MenuItem value="CUSTOM">Custom Quote</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  
                  <Box flex={1}>
                    <TextField
                      fullWidth
                      label="Base Price"
                      value={formData.base_price}
                      onChange={handleInputChange('base_price')}
                      error={!!errors.base_price}
                      helperText={errors.base_price}
                      type="number"
                      InputProps={{
                        startAdornment: <InputAdornment position="start">{formData.currency}</InputAdornment>,
                      }}
                      disabled={formData.pricing_model === 'CUSTOM'}
                      required
                    />
                  </Box>
                  
                  <Box flex={1}>
                    <TextField
                      fullWidth
                      label="Tax Rate (%)"
                      value={formData.tax_rate}
                      onChange={handleInputChange('tax_rate')}
                      type="number"
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                    />
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Time Configuration */}
              <Typography variant="h6" gutterBottom>
                Time Configuration
              </Typography>
              
              <Box display="flex" flexDirection="column" gap={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.has_excess_hours}
                      onChange={handleSwitchChange('has_excess_hours')}
                    />
                  }
                  label="Enable excess hours pricing"
                />
                
                {formData.has_excess_hours && (
                  <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                    <Box flex={1}>
                      <TextField
                        fullWidth
                        label="Included Hours"
                        value={formData.included_hours}
                        onChange={handleInputChange('included_hours')}
                        error={!!errors.included_hours}
                        helperText={errors.included_hours}
                        type="number"
                      />
                    </Box>
                    <Box flex={1}>
                      <TextField
                        fullWidth
                        label="Excess Hour Price"
                        value={formData.excess_hour_price}
                        onChange={handleInputChange('excess_hour_price')}
                        error={!!errors.excess_hour_price}
                        helperText={errors.excess_hour_price}
                        type="number"
                        InputProps={{
                          startAdornment: <InputAdornment position="start">{formData.currency}</InputAdornment>,
                        }}
                      />
                    </Box>
                  </Box>
                )}
                
                <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                  <Box flex={1}>
                    <TextField
                      fullWidth
                      label="Minimum Hours (Optional)"
                      value={formData.minimum_hours}
                      onChange={handleInputChange('minimum_hours')}
                      type="number"
                    />
                  </Box>
                  <Box flex={1}>
                    <TextField
                      fullWidth
                      label="Maximum Hours (Optional)"
                      value={formData.maximum_hours}
                      onChange={handleInputChange('maximum_hours')}
                      error={!!errors.maximum_hours}
                      helperText={errors.maximum_hours}
                      type="number"
                    />
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Booking Configuration */}
              <Typography variant="h6" gutterBottom>
                Booking Configuration
              </Typography>
              
              <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                <Box flex={1}>
                  <TextField
                    fullWidth
                    label="Advance Booking Days"
                    value={formData.advance_booking_days}
                    onChange={handleInputChange('advance_booking_days')}
                    type="number"
                    helperText="Minimum days in advance for booking"
                  />
                </Box>
                <Box flex={1}>
                  <TextField
                    fullWidth
                    label="Maximum Booking Days (Optional)"
                    value={formData.maximum_booking_days}
                    onChange={handleInputChange('maximum_booking_days')}
                    type="number"
                    helperText="Maximum days in advance for booking"
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Settings */}
              <Typography variant="h6" gutterBottom>
                Settings
              </Typography>
              
              <Box display="flex" flexDirection="column" gap={2}>
                <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                  <Box flex={1}>
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
                  <Box flex={1}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.is_featured}
                          onChange={handleSwitchChange('is_featured')}
                        />
                      }
                      label="Featured"
                    />
                  </Box>
                </Box>
                <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                  <Box flex={1}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.allow_multiple}
                          onChange={handleSwitchChange('allow_multiple')}
                        />
                      }
                      label="Allow Multiple Quantities"
                    />
                  </Box>
                  <Box flex={1}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.requires_approval}
                          onChange={handleSwitchChange('requires_approval')}
                        />
                      }
                      label="Requires Admin Approval"
                    />
                  </Box>
                </Box>
                <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                  <Box flex={1}>
                    <TextField
                      fullWidth
                      label="Sort Order"
                      value={formData.sort_order}
                      onChange={handleInputChange('sort_order')}
                      type="number"
                      helperText="Lower numbers appear first"
                    />
                  </Box>
                  <Box flex={1}>
                    {/* Empty box for alignment */}
                  </Box>
                </Box>
              </Box>
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
              {isLoading ? 'Saving...' : editingProduct ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};