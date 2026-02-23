// frontend/admin-crm/src/components/events/EventTypeFormDialog.tsx

import React, { useState, useEffect } from 'react';
import {
  TextField,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Stack,
  Divider,
} from '@mui/material';
import { ModernDialog, createDialogActions, ImageUploadField, GalleryUploadField } from '../common';
import {
  type EventTypeFormDialogProps,
  type EventTypeFormData,
  type CreateEventTypeData,
  type UpdateEventTypeData,
} from '../../types/events.types';
import { tokens } from '../../design-system';
import { glassInputStyles } from '../../design-system/utils/glassmorphism';

const defaultFormData: EventTypeFormData = {
  name: '',
  description: '',
  is_active: true,
  featured_image: null,
  gallery_images: [],
};

export const EventTypeFormDialog: React.FC<EventTypeFormDialogProps> = ({
  open,
  onClose,
  editingEventType,
  onSubmit,
  isLoading,
}) => {
  const [formData, setFormData] = useState<EventTypeFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (editingEventType) {
        setFormData({
          name: editingEventType.name || '',
          description: editingEventType.description || '',
          is_active: editingEventType.is_active ?? true,
          featured_image: editingEventType.featured_image || null,
          gallery_images: editingEventType.gallery_images || [],
        });
      } else {
        setFormData(defaultFormData);
      }
      setErrors({});
    }
  }, [editingEventType, open]);

  const handleInputChange =
    (field: keyof EventTypeFormData) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    (field: keyof EventTypeFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.checked,
      }));
    };

  const handleFeaturedImageChange = (file: File | null) => {
    setFormData((prev) => ({
      ...prev,
      featured_image: file,
    }));
  };

  const handleGalleryImagesChange = (files: (File | string)[]) => {
    setFormData((prev) => ({
      ...prev,
      gallery_images: files,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Event type name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const submitData: CreateEventTypeData | UpdateEventTypeData = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      is_active: formData.is_active,
    };

    // Check if we have any files to upload or if we're editing (to handle image removals)
    const hasNewFeaturedImage = formData.featured_image instanceof File;
    const hasNewGalleryImages = formData.gallery_images.some((img) => img instanceof File);
    const hasFiles = hasNewFeaturedImage || hasNewGalleryImages;

    // Always use FormData when editing to ensure image changes (including removals) are processed
    const shouldUseFormData = hasFiles || !!editingEventType;

    if (shouldUseFormData) {
      // Build FormData for image upload support
      const formDataObj = new FormData();
      formDataObj.append('name', formData.name.trim());
      if (formData.description.trim()) {
        formDataObj.append('description', formData.description.trim());
      }
      formDataObj.append('is_active', String(formData.is_active));

      // Featured image
      if (formData.featured_image instanceof File) {
        formDataObj.append('featured_image', formData.featured_image);
      } else if (formData.featured_image === null && editingEventType) {
        // Clear the image if it was removed
        formDataObj.append('featured_image', '');
      }

      // Gallery images - for new files, append them; for existing URLs, keep them as JSON
      const existingGalleryUrls: string[] = [];
      let newFileIndex = 0;
      formData.gallery_images.forEach((item) => {
        if (item instanceof File) {
          formDataObj.append(`gallery_image_${newFileIndex}`, item);
          newFileIndex++;
        } else if (typeof item === 'string') {
          existingGalleryUrls.push(item);
        }
      });
      // Always send existing_gallery_images (even if empty) so backend knows to update the field
      formDataObj.append('existing_gallery_images', JSON.stringify(existingGalleryUrls));

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

  const actions = createDialogActions(handleClose, handleSubmit, {
    cancelLabel: 'Cancel',
    confirmLabel: isLoading
      ? 'Saving...'
      : editingEventType
        ? 'Update Event Type'
        : 'Create Event Type',
    isLoading,
    confirmDisabled: isLoading,
  });

  return (
    <ModernDialog
      open={open}
      onClose={handleClose}
      title={editingEventType ? 'Edit Event Type' : 'Create New Event Type'}
      actions={actions}
      maxWidth="md"
      fullWidth
    >
      {open && (
        <Box component="form" noValidate>
          <Stack spacing={4}>
            <TextField
              fullWidth
              label="Event Type Name"
              value={formData.name}
              onChange={handleInputChange('name')}
              error={!!errors.name}
              helperText={errors.name}
              required
              placeholder="e.g., Wedding, Corporate Event, Birthday Party"
              sx={glassInputStyles}
            />

            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={handleInputChange('description')}
              error={!!errors.description}
              helperText={errors.description || 'Optional description of this event type'}
              multiline
              rows={4}
              placeholder="Describe this event type and what makes it unique..."
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
                    {formData.is_active ? 'Active Event Type' : 'Inactive Event Type'}
                  </Typography>
                }
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 4 }}>
                {formData.is_active
                  ? 'This event type is available for creating new events and will appear in booking forms'
                  : 'This event type is hidden from event creation and booking forms'}
              </Typography>
            </Box>

            {/* Images Section */}
            <Divider />

            <Box>
              <Typography variant="h6" gutterBottom>
                Images
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Upload images for this event type. These will be displayed in booking forms and
                event listings.
              </Typography>

              <Stack spacing={3}>
                <ImageUploadField
                  label="Featured Image"
                  value={formData.featured_image}
                  onChange={handleFeaturedImageChange}
                  helperText="Main image shown in listings and cards. Recommended: 800x600px"
                  maxSizeMB={5}
                  aspectRatio={4 / 3}
                  previewHeight={180}
                />

                <GalleryUploadField
                  label="Gallery Images"
                  value={formData.gallery_images}
                  onChange={handleGalleryImagesChange}
                  helperText="Additional images for event type detail page"
                  maxImages={10}
                  maxSizeMB={5}
                />
              </Stack>
            </Box>
          </Stack>
        </Box>
      )}
    </ModernDialog>
  );
};
