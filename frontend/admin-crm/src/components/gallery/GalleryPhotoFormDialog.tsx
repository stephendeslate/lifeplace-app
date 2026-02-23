// frontend/admin-crm/src/components/gallery/GalleryPhotoFormDialog.tsx

import React, { useState, useEffect } from 'react';
import {
  TextField,
  FormControlLabel,
  Switch,
  Box,
  Stack,
  Typography,
  MenuItem,
} from '@mui/material';
import { ModernDialog, createDialogActions, ImageUploadField } from '../common';
import type { GalleryPhoto, GalleryPhotoFormData } from '../../types/gallery.types';
import { GALLERY_CATEGORIES } from '../../types/gallery.types';
import { tokens } from '../../design-system';
import { glassInputStyles } from '../../design-system/utils/glassmorphism';

interface GalleryPhotoFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingPhoto?: GalleryPhoto | null;
  onSubmit: (formData: FormData) => void;
  isLoading: boolean;
}

const defaultFormData: GalleryPhotoFormData = {
  image: null,
  title: '',
  description: '',
  category: 'GENERAL',
  venue: null,
  event_type: null,
  is_featured: false,
  is_active: true,
  sort_order: 0,
};

export const GalleryPhotoFormDialog: React.FC<GalleryPhotoFormDialogProps> = ({
  open,
  onClose,
  editingPhoto,
  onSubmit,
  isLoading,
}) => {
  const [formData, setFormData] = useState<GalleryPhotoFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (editingPhoto) {
        setFormData({
          image: editingPhoto.image || null,
          title: editingPhoto.title || '',
          description: editingPhoto.description || '',
          category: editingPhoto.category || 'GENERAL',
          venue: editingPhoto.venue,
          event_type: editingPhoto.event_type,
          is_featured: editingPhoto.is_featured ?? false,
          is_active: editingPhoto.is_active ?? true,
          sort_order: editingPhoto.sort_order ?? 0,
        });
      } else {
        setFormData(defaultFormData);
      }
      setErrors({});
    }
  }, [editingPhoto, open]);

  const handleInputChange =
    (field: keyof GalleryPhotoFormData) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: '',
        }));
      }
    };

  const handleSwitchChange =
    (field: keyof GalleryPhotoFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.checked,
      }));
    };

  const handleImageChange = (file: File | null) => {
    setFormData((prev) => ({
      ...prev,
      image: file,
    }));
    if (errors.image) {
      setErrors((prev) => ({ ...prev, image: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.image && !editingPhoto) {
      newErrors.image = 'Photo is required';
    }

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const formDataObj = new FormData();

    // Image
    if (formData.image instanceof File) {
      formDataObj.append('image', formData.image);
    }

    formDataObj.append('title', formData.title.trim());
    formDataObj.append('description', formData.description.trim());
    formDataObj.append('category', formData.category);
    formDataObj.append('is_featured', String(formData.is_featured));
    formDataObj.append('is_active', String(formData.is_active));
    formDataObj.append('sort_order', String(formData.sort_order));

    if (formData.venue !== null) {
      formDataObj.append('venue', String(formData.venue));
    }
    if (formData.event_type !== null) {
      formDataObj.append('event_type', String(formData.event_type));
    }

    onSubmit(formDataObj);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const actions = createDialogActions(handleClose, handleSubmit, {
    cancelLabel: 'Cancel',
    confirmLabel: isLoading ? 'Saving...' : editingPhoto ? 'Update Photo' : 'Add Photo',
    isLoading,
    confirmDisabled: isLoading,
  });

  return (
    <ModernDialog
      open={open}
      onClose={handleClose}
      title={editingPhoto ? 'Edit Gallery Photo' : 'Add Gallery Photo'}
      actions={actions}
      maxWidth="sm"
      fullWidth
    >
      {open && (
        <Box component="form" noValidate>
          <Stack spacing={3}>
            <ImageUploadField
              label="Photo"
              value={formData.image}
              onChange={handleImageChange}
              helperText="Upload a photo for the gallery. Recommended: 1200x800px"
              error={errors.image}
              maxSizeMB={10}
              aspectRatio={3 / 2}
              previewHeight={200}
            />

            <TextField
              fullWidth
              label="Title"
              value={formData.title}
              onChange={handleInputChange('title')}
              error={!!errors.title}
              helperText={errors.title}
              required
              placeholder="e.g., Garden Wedding Setup"
              sx={glassInputStyles}
            />

            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={handleInputChange('description')}
              multiline
              rows={3}
              placeholder="Describe this photo..."
              helperText="Optional description for this gallery photo"
              sx={glassInputStyles}
            />

            <TextField
              fullWidth
              select
              label="Category"
              value={formData.category}
              onChange={handleInputChange('category')}
              sx={glassInputStyles}
            >
              {GALLERY_CATEGORIES.map((cat) => (
                <MenuItem key={cat.value} value={cat.value}>
                  {cat.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              label="Sort Order"
              value={formData.sort_order}
              onChange={handleInputChange('sort_order')}
              type="number"
              helperText="Lower numbers appear first"
              InputProps={{ inputProps: { min: 0 } }}
              sx={glassInputStyles}
            />

            <Box
              sx={{
                p: 3,
                borderRadius: tokens.spacing.radius.lg,
                border: `1px solid ${tokens.color.borders.glass}`,
                backgroundColor: tokens.color.neutral[50],
              }}
            >
              <Stack spacing={1}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_featured}
                      onChange={handleSwitchChange('is_featured')}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: tokens.color.success[500],
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: tokens.color.success[500],
                        },
                      }}
                    />
                  }
                  label={
                    <Typography variant="subtitle2" fontWeight="600">
                      Featured Photo
                    </Typography>
                  }
                />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 6 }}>
                  Featured photos are highlighted in the gallery and may appear on the homepage
                </Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_active}
                      onChange={handleSwitchChange('is_active')}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: tokens.color.success[500],
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: tokens.color.success[500],
                        },
                      }}
                    />
                  }
                  label={
                    <Typography variant="subtitle2" fontWeight="600">
                      {formData.is_active ? 'Active' : 'Inactive'}
                    </Typography>
                  }
                />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 6 }}>
                  {formData.is_active
                    ? 'This photo is visible in the public gallery'
                    : 'This photo is hidden from the public gallery'}
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </Box>
      )}
    </ModernDialog>
  );
};
