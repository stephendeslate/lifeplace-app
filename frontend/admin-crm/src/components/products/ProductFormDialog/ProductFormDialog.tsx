import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import type { ProductOption, CreateProductData, UpdateProductData } from '@/types/products.types';
import { useProductFormLogic } from './useProductFormLogic';
import { BasicInfoSection } from './BasicInfoSection';
import { PricingSection } from './PricingSection';
import { SettingsSection } from './SettingsSection';

interface ProductFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingProduct?: ProductOption | null;
  onSubmit: (data: CreateProductData | UpdateProductData, formData?: FormData) => void;
  isLoading: boolean;
}

export const ProductFormDialog: React.FC<ProductFormDialogProps> = ({
  open,
  onClose,
  editingProduct,
  onSubmit,
  isLoading,
}) => {
  const logic = useProductFormLogic(open, editingProduct, onSubmit);

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const handleFormDataChange = (data: Partial<typeof logic.formData>) => {
    logic.setFormData((prev) => ({ ...prev, ...data }));
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
          <DialogTitle>{editingProduct ? 'Edit Product' : 'Create New Product'}</DialogTitle>

          <DialogContent>
            <Box component="form" noValidate sx={{ mt: 1 }}>
              {/* Info Alert */}
              <Alert severity="info" sx={{ mb: 3 }}>
                Hours and excess pricing are now managed at the venue level. Edit venue settings to
                configure included hours and excess hour rates.
              </Alert>

              <BasicInfoSection
                formData={logic.formData}
                errors={logic.errors}
                categories={logic.categories}
                isLoadingCategories={logic.isLoadingCategories}
                onInputChange={logic.handleInputChange}
                onFormDataChange={handleFormDataChange}
              />

              <Divider sx={{ my: 3 }} />

              <PricingSection
                formData={logic.formData}
                errors={logic.errors}
                onInputChange={logic.handleInputChange}
                onSwitchChange={logic.handleSwitchChange}
              />

              <Divider sx={{ my: 3 }} />

              <SettingsSection
                formData={logic.formData}
                errors={logic.errors}
                editingProduct={editingProduct}
                eventTypes={logic.eventTypes}
                isLoadingEventTypes={logic.isLoadingEventTypes}
                onInputChange={logic.handleInputChange}
                onSwitchChange={logic.handleSwitchChange}
                onFormDataChange={handleFormDataChange}
                onEventTypesChange={logic.handleEventTypesChange}
                onFeaturedImageChange={logic.handleFeaturedImageChange}
                onGalleryImagesChange={logic.handleGalleryImagesChange}
              />
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={logic.handleSubmit}
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
