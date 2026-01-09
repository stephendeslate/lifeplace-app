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
  Alert,
} from '@mui/material';
import { useProductCategories } from '../../hooks/useProducts';
import { ImageUploadField, GalleryUploadField } from '../common';
import type {
  ProductOption,
  CreateProductData,
  UpdateProductData,
  ProductFormData,
} from '../../types/products.types';
import { PackageVenuesSection } from './PackageVenuesSection';

interface ProductFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingProduct?: ProductOption | null;
  onSubmit: (data: CreateProductData | UpdateProductData, formData?: FormData) => void;
  isLoading: boolean;
}

const defaultFormData: ProductFormData = {
  name: '',
  description: '',
  category: '',
  pricing_model: 'FIXED',
  base_price: '',
  currency: 'PHP',
  is_tax_inclusive: false,
  type: 'PRODUCT',
  is_active: true,
  is_featured: false,
  allow_multiple: false,
  requires_approval: false,
  minimum_hours: '',
  maximum_hours: '',
  advance_booking_days: '7',
  maximum_booking_days: '',
  event_days: '',
  sku: '',
  sort_order: '0',
  // Images
  featured_image: null,
  gallery_images: [],
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
          is_tax_inclusive: editingProduct.is_tax_inclusive ?? false,
          type: editingProduct.type || 'PRODUCT',
          is_active: editingProduct.is_active ?? true,
          is_featured: editingProduct.is_featured ?? false,
          allow_multiple: editingProduct.allow_multiple ?? false,
          requires_approval: editingProduct.requires_approval ?? false,
          minimum_hours: editingProduct.minimum_hours?.toString() || '',
          maximum_hours: editingProduct.maximum_hours?.toString() || '',
          advance_booking_days: editingProduct.advance_booking_days?.toString() || '7',
          maximum_booking_days: editingProduct.maximum_booking_days?.toString() || '',
          event_days: editingProduct.event_days?.toString() || '',
          sku: editingProduct.sku || '',
          sort_order: editingProduct.sort_order?.toString() || '0',
          // Images
          featured_image: editingProduct.featured_image || null,
          gallery_images: editingProduct.gallery_images || [],
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

  const handleFeaturedImageChange = (file: File | null) => {
    setFormData(prev => ({
      ...prev,
      featured_image: file,
    }));
  };

  const handleGalleryImagesChange = (files: (File | string)[]) => {
    setFormData(prev => ({
      ...prev,
      gallery_images: files,
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
      is_tax_inclusive: formData.is_tax_inclusive,
      type: formData.type,
      is_active: formData.is_active,
      is_featured: formData.is_featured,
      allow_multiple: formData.allow_multiple,
      requires_approval: formData.requires_approval,
      minimum_hours: formData.minimum_hours ? parseInt(formData.minimum_hours) : null,
      maximum_hours: formData.maximum_hours ? parseInt(formData.maximum_hours) : null,
      advance_booking_days: parseInt(formData.advance_booking_days) || 7,
      maximum_booking_days: formData.maximum_booking_days ? parseInt(formData.maximum_booking_days) : null,
      event_days: formData.event_days ? parseInt(formData.event_days) : null,
      sku: formData.sku || null,
      sort_order: parseInt(formData.sort_order) || 0,
    };

    // Check if we need to send FormData (for image uploads)
    const hasNewFeaturedImage = formData.featured_image instanceof File;
    const hasNewGalleryImages = formData.gallery_images.some(img => img instanceof File);

    if (hasNewFeaturedImage || hasNewGalleryImages) {
      // Build FormData for image uploads
      const formDataObj = new FormData();

      // Add all text fields
      Object.entries(submitData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formDataObj.append(key, String(value));
        }
      });

      // Add featured image if it's a new file
      if (hasNewFeaturedImage && formData.featured_image instanceof File) {
        formDataObj.append('featured_image', formData.featured_image);
      }

      // Add gallery images - new files get uploaded, existing URLs are preserved
      const existingUrls = formData.gallery_images
        .filter((img): img is string => typeof img === 'string');
      if (existingUrls.length > 0) {
        formDataObj.append('gallery_images', JSON.stringify(existingUrls));
      }

      // Add new gallery image files
      formData.gallery_images
        .filter((img): img is File => img instanceof File)
        .forEach((file) => {
          formDataObj.append('gallery_image_files', file);
        });

      onSubmit(submitData, formDataObj);
    } else {
      onSubmit(submitData);
    }
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
              {/* Info Alert */}
              <Alert severity="info" sx={{ mb: 3 }}>
                Hours and excess pricing are now managed at the venue level.
                Edit venue settings to configure included hours and excess hour rates.
              </Alert>

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
                  
                  <Box flex={1} display="flex" alignItems="center">
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.is_tax_inclusive}
                          onChange={handleSwitchChange('is_tax_inclusive')}
                        />
                      }
                      label="Tax Inclusive"
                    />
                  </Box>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  If enabled, the base price already includes tax and no additional tax will be applied.
                  Tax rate is configured globally in Currency & Taxes settings.
                </Typography>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Duration Constraints */}
              <Typography variant="h6" gutterBottom>
                Duration Constraints
              </Typography>

              <Box display="flex" flexDirection="column" gap={2}>
                <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                  <Box flex={1}>
                    <TextField
                      fullWidth
                      label="Minimum Hours (Optional)"
                      value={formData.minimum_hours}
                      onChange={handleInputChange('minimum_hours')}
                      type="number"
                      helperText="Minimum booking duration for this product"
                    />
                  </Box>
                  <Box flex={1}>
                    <TextField
                      fullWidth
                      label="Maximum Hours (Optional)"
                      value={formData.maximum_hours}
                      onChange={handleInputChange('maximum_hours')}
                      error={!!errors.maximum_hours}
                      helperText={errors.maximum_hours || 'Maximum booking duration for this product'}
                      type="number"
                    />
                  </Box>
                </Box>
              </Box>

              {/* Event Duration - Only show for PACKAGE type */}
              {formData.type === 'PACKAGE' && (
                <>
                  <Divider sx={{ my: 3 }} />

                  <Typography variant="h6" gutterBottom>
                    Event Duration
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    For multi-day packages (camps, retreats). Leave blank for hourly packages.
                  </Typography>

                  <TextField
                    fullWidth
                    label="Event Days"
                    value={formData.event_days}
                    onChange={handleInputChange('event_days')}
                    type="number"
                    helperText="e.g., 2 for 2D1N, 3 for 3D2N, 5 for 5D4N"
                    InputProps={{
                      inputProps: { min: 1 }
                    }}
                    sx={{ maxWidth: 300 }}
                  />
                </>
              )}

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

              {/* Included Venues (only for existing packages) */}
              {formData.type === 'PACKAGE' && (
                <>
                  {editingProduct?.id ? (
                    <PackageVenuesSection packageId={editingProduct.id} />
                  ) : (
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Included Venues
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Save this package first to assign venues.
                      </Typography>
                    </Box>
                  )}
                  <Divider sx={{ my: 3 }} />
                </>
              )}

              {/* Images */}
              <Typography variant="h6" gutterBottom>
                Images
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Upload images for this product/package. If not set, images from assigned venues will be used.
              </Typography>

              <Box display="flex" flexDirection="column" gap={3}>
                <ImageUploadField
                  label="Featured Image"
                  value={formData.featured_image}
                  onChange={handleFeaturedImageChange}
                  helperText="Main image shown in listings and cards. Recommended: 800x600px"
                  maxSizeMB={5}
                  aspectRatio={4/3}
                  previewHeight={180}
                />

                <GalleryUploadField
                  label="Gallery Images"
                  value={formData.gallery_images}
                  onChange={handleGalleryImagesChange}
                  helperText="Additional images for product detail page"
                  maxImages={10}
                  maxSizeMB={5}
                />
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