// frontend/admin-crm/src/components/venues/VenueFormDialog.tsx

import React, { useState, useEffect } from 'react';
import {
  TextField,
  FormControlLabel,
  Switch,
  Box,
  Stack,
  Typography,
  Divider,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { ModernDialog, createDialogActions, ImageUploadField, GalleryUploadField } from '../common';
import type {
  VenueListItem,
  VenueDetail,
  CreateVenueData,
  UpdateVenueData,
  CreateOperatingRulesData,
} from '../../types/venues.types';

interface VenueFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingVenue?: VenueListItem | VenueDetail | null;
  onSubmit: (data: CreateVenueData | UpdateVenueData, formData?: FormData) => void;
  isLoading: boolean;
}

interface VenueFormData {
  // Basic info
  name: string;
  code: string;
  description: string;
  is_overnight: boolean;
  // Capacity
  minimum_capacity: string;
  maximum_capacity: string;
  recommended_capacity: string;
  // Status
  is_active: boolean;
  is_bookable: boolean;
  is_featured: boolean;
  // Display
  location_description: string;
  sort_order: string;
  // Images
  featured_image: File | string | null;
  gallery_images: (File | string)[];
  // Standalone pricing (for custom package curation)
  is_rentable_standalone: boolean;
  standalone_base_price: string;
  standalone_included_hours: string;
  standalone_excess_hour_price: string;
  // Operating rules
  operating_rules: OperatingRulesFormData;
}

interface OperatingRulesFormData {
  // Check-in/Checkout
  default_check_in_time: string;
  default_checkout_time: string;
  checkout_next_day: boolean;
  // Program Duration
  minimum_program_hours: string;
  maximum_program_hours: string;
  default_program_hours: string;
  is_fixed_duration: boolean;
  // Ingress/Egress
  ingress_hours: string;
  egress_hours: string;
  allow_custom_ingress: boolean;
  allow_custom_egress: boolean;
  min_ingress_hours: string;
  max_ingress_hours: string;
  min_egress_hours: string;
  max_egress_hours: string;
  // Time Constraints
  earliest_start_time: string;
  latest_end_time: string;
  hard_cutoff_time: string;
  hard_cutoff_next_day: boolean;
  early_access_minutes: string;
  // Early Check-in
  early_checkin_allowed: boolean;
  early_checkin_fee_per_hour: string;
  earliest_checkin_time: string;
  // Late Checkout
  late_checkout_allowed: boolean;
  late_checkout_fee_per_hour: string;
  late_checkout_max_hours: string;
  latest_checkout_time: string;
}

const defaultOperatingRules: OperatingRulesFormData = {
  default_check_in_time: '14:00',
  default_checkout_time: '12:00',
  checkout_next_day: false,
  minimum_program_hours: '1',
  maximum_program_hours: '8',
  default_program_hours: '3',
  is_fixed_duration: false,
  ingress_hours: '1',
  egress_hours: '1',
  allow_custom_ingress: false,
  allow_custom_egress: false,
  min_ingress_hours: '0.5',
  max_ingress_hours: '6',
  min_egress_hours: '0.5',
  max_egress_hours: '3',
  earliest_start_time: '06:00',
  latest_end_time: '22:00',
  hard_cutoff_time: '02:00',
  hard_cutoff_next_day: true,
  early_access_minutes: '60',
  early_checkin_allowed: false,
  early_checkin_fee_per_hour: '300',
  earliest_checkin_time: '10:00',
  late_checkout_allowed: false,
  late_checkout_fee_per_hour: '300',
  late_checkout_max_hours: '4',
  latest_checkout_time: '16:00',
};

const defaultFormData: VenueFormData = {
  name: '',
  code: '',
  description: '',
  is_overnight: false,
  minimum_capacity: '1',
  maximum_capacity: '100',
  recommended_capacity: '',
  is_active: true,
  is_bookable: true,
  is_featured: false,
  location_description: '',
  sort_order: '0',
  // Images
  featured_image: null,
  gallery_images: [],
  // Standalone pricing defaults
  is_rentable_standalone: false,
  standalone_base_price: '',
  standalone_included_hours: '',
  standalone_excess_hour_price: '',
  operating_rules: defaultOperatingRules,
};

export const VenueFormDialog: React.FC<VenueFormDialogProps> = ({
  open,
  onClose,
  editingVenue,
  onSubmit,
  isLoading,
}) => {
  const [formData, setFormData] = useState<VenueFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['basic', 'rules-timing']);

  useEffect(() => {
    if (open && !initialized) {
      if (editingVenue) {
        const venue = editingVenue as VenueDetail;
        const rules = venue.operating_rules;

        setFormData({
          name: venue.name || '',
          code: venue.code || '',
          description: venue.description || '',
          is_overnight: venue.is_overnight ?? false,
          minimum_capacity: venue.minimum_capacity?.toString() || '1',
          maximum_capacity: venue.maximum_capacity?.toString() || '100',
          recommended_capacity: venue.recommended_capacity?.toString() || '',
          is_active: venue.is_active ?? true,
          is_bookable: venue.is_bookable ?? true,
          is_featured: venue.is_featured ?? false,
          location_description: venue.location_description || '',
          sort_order: venue.sort_order?.toString() || '0',
          // Images
          featured_image: venue.featured_image || null,
          gallery_images: venue.gallery_images || [],
          // Standalone pricing
          is_rentable_standalone: venue.is_rentable_standalone ?? false,
          standalone_base_price: venue.standalone_base_price?.toString() || '',
          standalone_included_hours: venue.standalone_included_hours?.toString() || '',
          standalone_excess_hour_price: venue.standalone_excess_hour_price?.toString() || '',
          operating_rules: rules
            ? {
                default_check_in_time: rules.default_check_in_time || '14:00',
                default_checkout_time: rules.default_checkout_time || '12:00',
                checkout_next_day: rules.checkout_next_day ?? false,
                minimum_program_hours: rules.minimum_program_hours || '1',
                maximum_program_hours: rules.maximum_program_hours || '8',
                default_program_hours: rules.default_program_hours || '3',
                is_fixed_duration: rules.is_fixed_duration ?? false,
                ingress_hours: rules.ingress_hours || '1',
                egress_hours: rules.egress_hours || '1',
                allow_custom_ingress: rules.allow_custom_ingress ?? false,
                allow_custom_egress: rules.allow_custom_egress ?? false,
                min_ingress_hours: rules.min_ingress_hours || '0.5',
                max_ingress_hours: rules.max_ingress_hours || '6',
                min_egress_hours: rules.min_egress_hours || '0.5',
                max_egress_hours: rules.max_egress_hours || '3',
                earliest_start_time: rules.earliest_start_time || '06:00',
                latest_end_time: rules.latest_end_time || '22:00',
                hard_cutoff_time: rules.hard_cutoff_time || '02:00',
                hard_cutoff_next_day: rules.hard_cutoff_next_day ?? true,
                early_access_minutes: rules.early_access_minutes?.toString() || '60',
                early_checkin_allowed: rules.early_checkin_allowed ?? false,
                early_checkin_fee_per_hour: rules.early_checkin_fee_per_hour || '300',
                earliest_checkin_time: rules.earliest_checkin_time || '10:00',
                late_checkout_allowed: rules.late_checkout_allowed ?? false,
                late_checkout_fee_per_hour: rules.late_checkout_fee_per_hour || '300',
                late_checkout_max_hours: rules.late_checkout_max_hours?.toString() || '4',
                latest_checkout_time: rules.latest_checkout_time || '16:00',
              }
            : defaultOperatingRules,
        });
      } else {
        setFormData(defaultFormData);
      }
      setInitialized(true);
      setErrors({});
    }
  }, [open, editingVenue, initialized]);

  useEffect(() => {
    if (!open) {
      setInitialized(false);
    }
  }, [open]);

  const handleInputChange =
    (field: keyof VenueFormData) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: '' }));
      }
    };

  const handleRulesChange =
    (field: keyof OperatingRulesFormData) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setFormData((prev) => ({
        ...prev,
        operating_rules: {
          ...prev.operating_rules,
          [field]: value,
        },
      }));
    };

  const handleSwitchChange =
    (field: keyof VenueFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.checked,
      }));
    };

  const handleRulesSwitchChange =
    (field: keyof OperatingRulesFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        operating_rules: {
          ...prev.operating_rules,
          [field]: event.target.checked,
        },
      }));
    };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section],
    );
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
      newErrors.name = 'Name is required';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Code is required';
    } else if (!/^[A-Z0-9_]+$/.test(formData.code)) {
      newErrors.code = 'Code must be uppercase letters, numbers, and underscores only';
    }

    if (!formData.maximum_capacity || parseInt(formData.maximum_capacity) <= 0) {
      newErrors.maximum_capacity = 'Maximum capacity is required and must be greater than 0';
    }

    if (parseInt(formData.minimum_capacity) > parseInt(formData.maximum_capacity)) {
      newErrors.minimum_capacity = 'Minimum capacity cannot exceed maximum';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const rules = formData.operating_rules;
    const operatingRulesData: CreateOperatingRulesData = {
      default_check_in_time: rules.default_check_in_time,
      default_checkout_time: rules.default_checkout_time,
      checkout_next_day: rules.checkout_next_day,
      minimum_program_hours: rules.minimum_program_hours,
      maximum_program_hours: rules.maximum_program_hours || null,
      default_program_hours: rules.default_program_hours,
      is_fixed_duration: rules.is_fixed_duration,
      ingress_hours: rules.ingress_hours,
      egress_hours: rules.egress_hours,
      allow_custom_ingress: rules.allow_custom_ingress,
      allow_custom_egress: rules.allow_custom_egress,
      min_ingress_hours: rules.min_ingress_hours,
      max_ingress_hours: rules.max_ingress_hours,
      min_egress_hours: rules.min_egress_hours,
      max_egress_hours: rules.max_egress_hours,
      earliest_start_time: rules.earliest_start_time || null,
      latest_end_time: rules.latest_end_time || null,
      hard_cutoff_time: rules.hard_cutoff_time || null,
      hard_cutoff_next_day: rules.hard_cutoff_next_day,
      early_access_minutes: parseInt(rules.early_access_minutes) || 60,
      early_checkin_allowed: rules.early_checkin_allowed,
      early_checkin_fee_per_hour: rules.early_checkin_allowed
        ? rules.early_checkin_fee_per_hour
        : null,
      earliest_checkin_time: rules.early_checkin_allowed ? rules.earliest_checkin_time : null,
      late_checkout_allowed: rules.late_checkout_allowed,
      late_checkout_fee_per_hour: rules.late_checkout_allowed
        ? rules.late_checkout_fee_per_hour
        : null,
      late_checkout_max_hours: rules.late_checkout_allowed
        ? parseInt(rules.late_checkout_max_hours)
        : undefined,
      latest_checkout_time: rules.late_checkout_allowed ? rules.latest_checkout_time : null,
    };

    // Build FormData for image upload support
    const formDataObj = new FormData();
    formDataObj.append('name', formData.name.trim());
    formDataObj.append('code', formData.code.trim().toUpperCase());
    formDataObj.append('description', formData.description.trim());
    formDataObj.append('is_overnight', String(formData.is_overnight));
    formDataObj.append('minimum_capacity', String(parseInt(formData.minimum_capacity) || 1));
    formDataObj.append('maximum_capacity', String(parseInt(formData.maximum_capacity)));
    if (formData.recommended_capacity) {
      formDataObj.append('recommended_capacity', String(parseInt(formData.recommended_capacity)));
    }
    formDataObj.append('is_active', String(formData.is_active));
    formDataObj.append('is_bookable', String(formData.is_bookable));
    formDataObj.append('is_featured', String(formData.is_featured));
    formDataObj.append('location_description', formData.location_description.trim());
    formDataObj.append('sort_order', String(parseInt(formData.sort_order) || 0));

    // Featured image
    if (formData.featured_image instanceof File) {
      formDataObj.append('featured_image', formData.featured_image);
    } else if (formData.featured_image === null && editingVenue) {
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

    // Standalone pricing
    formDataObj.append('is_rentable_standalone', String(formData.is_rentable_standalone));
    if (formData.standalone_base_price) {
      formDataObj.append('standalone_base_price', formData.standalone_base_price);
    }
    if (formData.standalone_included_hours) {
      formDataObj.append('standalone_included_hours', formData.standalone_included_hours);
    }
    if (formData.standalone_excess_hour_price) {
      formDataObj.append('standalone_excess_hour_price', formData.standalone_excess_hour_price);
    }

    // Operating rules as JSON
    formDataObj.append('operating_rules', JSON.stringify(operatingRulesData));

    // Also create the standard JSON data for backward compatibility
    const submitData: CreateVenueData | UpdateVenueData = {
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      description: formData.description.trim(),
      is_overnight: formData.is_overnight,
      minimum_capacity: parseInt(formData.minimum_capacity) || 1,
      maximum_capacity: parseInt(formData.maximum_capacity),
      recommended_capacity: formData.recommended_capacity
        ? parseInt(formData.recommended_capacity)
        : null,
      is_active: formData.is_active,
      is_bookable: formData.is_bookable,
      is_featured: formData.is_featured,
      location_description: formData.location_description.trim(),
      sort_order: parseInt(formData.sort_order) || 0,
      // Standalone pricing
      is_rentable_standalone: formData.is_rentable_standalone,
      standalone_base_price: formData.standalone_base_price
        ? parseFloat(formData.standalone_base_price)
        : null,
      standalone_included_hours: formData.standalone_included_hours
        ? parseFloat(formData.standalone_included_hours)
        : null,
      standalone_excess_hour_price: formData.standalone_excess_hour_price
        ? parseFloat(formData.standalone_excess_hour_price)
        : null,
      operating_rules: operatingRulesData,
    };

    // Check if we have any files to upload or if we're editing (to handle image removals)
    const hasFiles =
      formData.featured_image instanceof File ||
      formData.gallery_images.some((item) => item instanceof File);

    // Always use FormData when editing to ensure image changes (including removals) are processed
    const shouldUseFormData = hasFiles || !!editingVenue;

    // Pass both the FormData and the regular data - let the API decide which to use
    onSubmit(submitData, shouldUseFormData ? formDataObj : undefined);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const actions = createDialogActions(handleClose, handleSubmit, {
    cancelLabel: 'Cancel',
    confirmLabel: editingVenue ? 'Update Venue' : 'Create Venue',
    isLoading,
    confirmDisabled: isLoading,
  });

  return (
    <ModernDialog
      open={open}
      onClose={handleClose}
      title={editingVenue ? 'Edit Venue' : 'Create New Venue'}
      actions={actions}
      maxWidth="md"
      fullWidth
      contentSx={{ minHeight: '70vh' }}
    >
      {open && (
        <Box component="form" noValidate sx={{ mt: 1 }}>
          {/* Basic Information */}
          <Accordion
            expanded={expandedSections.includes('basic')}
            onChange={() => toggleSection('basic')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Basic Information</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Box display="flex" gap={2}>
                  <TextField
                    fullWidth
                    label="Venue Name"
                    value={formData.name}
                    onChange={handleInputChange('name')}
                    error={!!errors.name}
                    helperText={errors.name}
                    required
                  />
                  <TextField
                    fullWidth
                    label="Code"
                    value={formData.code}
                    onChange={handleInputChange('code')}
                    error={!!errors.code}
                    helperText={
                      errors.code || 'Uppercase letters, numbers, and underscores (e.g., CABANA_3)'
                    }
                    required
                  />
                </Box>

                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={handleInputChange('description')}
                  multiline
                  rows={2}
                />

                <TextField
                  fullWidth
                  label="Location Description"
                  value={formData.location_description}
                  onChange={handleInputChange('location_description')}
                  helperText="Physical location within the property"
                />

                <Divider />

                <Typography variant="subtitle2" color="text.secondary">
                  Capacity
                </Typography>
                <Box display="flex" gap={2}>
                  <TextField
                    label="Minimum"
                    value={formData.minimum_capacity}
                    onChange={handleInputChange('minimum_capacity')}
                    error={!!errors.minimum_capacity}
                    helperText={errors.minimum_capacity}
                    type="number"
                    InputProps={{ inputProps: { min: 1 } }}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Maximum"
                    value={formData.maximum_capacity}
                    onChange={handleInputChange('maximum_capacity')}
                    error={!!errors.maximum_capacity}
                    helperText={errors.maximum_capacity}
                    type="number"
                    required
                    InputProps={{ inputProps: { min: 1 } }}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Recommended"
                    value={formData.recommended_capacity}
                    onChange={handleInputChange('recommended_capacity')}
                    type="number"
                    InputProps={{ inputProps: { min: 1 } }}
                    sx={{ flex: 1 }}
                  />
                </Box>

                <Divider />

                <Box display="flex" gap={2} flexWrap="wrap">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.is_overnight}
                        onChange={handleSwitchChange('is_overnight')}
                      />
                    }
                    label="Overnight Venue"
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
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.is_bookable}
                        onChange={handleSwitchChange('is_bookable')}
                      />
                    }
                    label="Bookable"
                  />
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

                <TextField
                  label="Sort Order"
                  value={formData.sort_order}
                  onChange={handleInputChange('sort_order')}
                  type="number"
                  helperText="Lower numbers appear first"
                  sx={{ width: 150 }}
                />
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Images */}
          <Accordion
            expanded={expandedSections.includes('images')}
            onChange={() => toggleSection('images')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Images</Typography>
            </AccordionSummary>
            <AccordionDetails>
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
                  helperText="Additional images for venue detail page"
                  maxImages={10}
                  maxSizeMB={5}
                />
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Standalone Pricing (for custom package curation) */}
          <Accordion
            expanded={expandedSections.includes('standalone-pricing')}
            onChange={() => toggleSection('standalone-pricing')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Standalone Pricing</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Alert severity="info" sx={{ mb: 1 }}>
                  Enable standalone pricing to allow this venue to be rented independently or
                  included in custom package bundles.
                </Alert>

                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_rentable_standalone}
                      onChange={handleSwitchChange('is_rentable_standalone')}
                    />
                  }
                  label="Available for Standalone Rental"
                />

                {formData.is_rentable_standalone && (
                  <Box display="flex" gap={2} flexWrap="wrap">
                    <TextField
                      label="Base Price"
                      value={formData.standalone_base_price}
                      onChange={handleInputChange('standalone_base_price')}
                      type="number"
                      InputProps={{
                        startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                        inputProps: { min: 0, step: 0.01 },
                      }}
                      helperText="Price when rented as standalone"
                      sx={{ flex: 1, minWidth: 200 }}
                    />
                    <TextField
                      label="Included Hours"
                      value={formData.standalone_included_hours}
                      onChange={handleInputChange('standalone_included_hours')}
                      type="number"
                      InputProps={{
                        endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                        inputProps: { min: 0, step: 0.5 },
                      }}
                      helperText="Hours included in base price"
                      sx={{ flex: 1, minWidth: 150 }}
                    />
                    <TextField
                      label="Excess Hour Rate"
                      value={formData.standalone_excess_hour_price}
                      onChange={handleInputChange('standalone_excess_hour_price')}
                      type="number"
                      InputProps={{
                        startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                        inputProps: { min: 0, step: 0.01 },
                      }}
                      helperText="Per hour beyond included"
                      sx={{ flex: 1, minWidth: 200 }}
                    />
                  </Box>
                )}
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Check-in/Checkout & Duration */}
          <Accordion
            expanded={expandedSections.includes('rules-timing')}
            onChange={() => toggleSection('rules-timing')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Check-in/Checkout & Duration</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Alert severity="info" sx={{ mb: 1 }}>
                  These rules define the default timing behavior for events at this venue.
                </Alert>

                <Typography variant="subtitle2" color="text.secondary">
                  Default Times
                </Typography>
                <Box display="flex" gap={2}>
                  <TextField
                    label="Check-in Time"
                    type="time"
                    value={formData.operating_rules.default_check_in_time}
                    onChange={handleRulesChange('default_check_in_time')}
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Checkout Time"
                    type="time"
                    value={formData.operating_rules.default_checkout_time}
                    onChange={handleRulesChange('default_checkout_time')}
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1 }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.operating_rules.checkout_next_day}
                        onChange={handleRulesSwitchChange('checkout_next_day')}
                      />
                    }
                    label="Checkout Next Day"
                    sx={{ ml: 2 }}
                  />
                </Box>

                <Divider />

                <Typography variant="subtitle2" color="text.secondary">
                  Program Duration
                </Typography>
                <Box display="flex" gap={2}>
                  <TextField
                    label="Minimum Hours"
                    value={formData.operating_rules.minimum_program_hours}
                    onChange={handleRulesChange('minimum_program_hours')}
                    type="number"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                      inputProps: { min: 0, step: 0.5 },
                    }}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Maximum Hours"
                    value={formData.operating_rules.maximum_program_hours}
                    onChange={handleRulesChange('maximum_program_hours')}
                    type="number"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                      inputProps: { min: 0, step: 0.5 },
                    }}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Default Hours"
                    value={formData.operating_rules.default_program_hours}
                    onChange={handleRulesChange('default_program_hours')}
                    type="number"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                      inputProps: { min: 0, step: 0.5 },
                    }}
                    sx={{ flex: 1 }}
                  />
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.operating_rules.is_fixed_duration}
                      onChange={handleRulesSwitchChange('is_fixed_duration')}
                    />
                  }
                  label="Fixed Duration (user cannot adjust)"
                />
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Ingress/Egress */}
          <Accordion
            expanded={expandedSections.includes('rules-ingress')}
            onChange={() => toggleSection('rules-ingress')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Ingress & Egress (Setup/Teardown)</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Alert severity="info" sx={{ mb: 1 }}>
                  Ingress is setup time before the program. Egress is teardown time after.
                </Alert>

                <Box display="flex" gap={2}>
                  <TextField
                    label="Default Ingress"
                    value={formData.operating_rules.ingress_hours}
                    onChange={handleRulesChange('ingress_hours')}
                    type="number"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                      inputProps: { min: 0, step: 0.5 },
                    }}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Default Egress"
                    value={formData.operating_rules.egress_hours}
                    onChange={handleRulesChange('egress_hours')}
                    type="number"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                      inputProps: { min: 0, step: 0.5 },
                    }}
                    sx={{ flex: 1 }}
                  />
                </Box>

                <Box display="flex" gap={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.operating_rules.allow_custom_ingress}
                        onChange={handleRulesSwitchChange('allow_custom_ingress')}
                      />
                    }
                    label="Allow Custom Ingress"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.operating_rules.allow_custom_egress}
                        onChange={handleRulesSwitchChange('allow_custom_egress')}
                      />
                    }
                    label="Allow Custom Egress"
                  />
                </Box>

                {formData.operating_rules.allow_custom_ingress && (
                  <Box display="flex" gap={2}>
                    <TextField
                      label="Min Ingress"
                      value={formData.operating_rules.min_ingress_hours}
                      onChange={handleRulesChange('min_ingress_hours')}
                      type="number"
                      InputProps={{
                        endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                        inputProps: { min: 0, step: 0.5 },
                      }}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="Max Ingress"
                      value={formData.operating_rules.max_ingress_hours}
                      onChange={handleRulesChange('max_ingress_hours')}
                      type="number"
                      InputProps={{
                        endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                        inputProps: { min: 0, step: 0.5 },
                      }}
                      sx={{ flex: 1 }}
                    />
                  </Box>
                )}

                {formData.operating_rules.allow_custom_egress && (
                  <Box display="flex" gap={2}>
                    <TextField
                      label="Min Egress"
                      value={formData.operating_rules.min_egress_hours}
                      onChange={handleRulesChange('min_egress_hours')}
                      type="number"
                      InputProps={{
                        endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                        inputProps: { min: 0, step: 0.5 },
                      }}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="Max Egress"
                      value={formData.operating_rules.max_egress_hours}
                      onChange={handleRulesChange('max_egress_hours')}
                      type="number"
                      InputProps={{
                        endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                        inputProps: { min: 0, step: 0.5 },
                      }}
                      sx={{ flex: 1 }}
                    />
                  </Box>
                )}
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Time Constraints */}
          <Accordion
            expanded={expandedSections.includes('rules-constraints')}
            onChange={() => toggleSection('rules-constraints')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Time Constraints</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Box display="flex" gap={2}>
                  <TextField
                    label="Earliest Start Time"
                    type="time"
                    value={formData.operating_rules.earliest_start_time}
                    onChange={handleRulesChange('earliest_start_time')}
                    InputLabelProps={{ shrink: true }}
                    helperText="Earliest program can start"
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Latest End Time"
                    type="time"
                    value={formData.operating_rules.latest_end_time}
                    onChange={handleRulesChange('latest_end_time')}
                    InputLabelProps={{ shrink: true }}
                    helperText="Music curfew / latest end"
                    sx={{ flex: 1 }}
                  />
                </Box>

                <Box display="flex" gap={2} alignItems="center">
                  <TextField
                    label="Hard Cutoff Time"
                    type="time"
                    value={formData.operating_rules.hard_cutoff_time}
                    onChange={handleRulesChange('hard_cutoff_time')}
                    InputLabelProps={{ shrink: true }}
                    helperText="Absolute latest (all activities must end)"
                    sx={{ flex: 1 }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.operating_rules.hard_cutoff_next_day}
                        onChange={handleRulesSwitchChange('hard_cutoff_next_day')}
                      />
                    }
                    label="Cutoff Next Day"
                  />
                </Box>

                <TextField
                  label="Early Access Minutes"
                  value={formData.operating_rules.early_access_minutes}
                  onChange={handleRulesChange('early_access_minutes')}
                  type="number"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">min</InputAdornment>,
                    inputProps: { min: 0 },
                  }}
                  helperText="Minutes before booked time guests can arrive"
                  sx={{ width: 200 }}
                />
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Early Check-in & Late Checkout */}
          <Accordion
            expanded={expandedSections.includes('rules-fees')}
            onChange={() => toggleSection('rules-fees')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Early Check-in & Late Checkout</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={3}>
                {/* Early Check-in */}
                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.operating_rules.early_checkin_allowed}
                        onChange={handleRulesSwitchChange('early_checkin_allowed')}
                      />
                    }
                    label="Allow Early Check-in"
                  />
                  {formData.operating_rules.early_checkin_allowed && (
                    <Box display="flex" gap={2} mt={1}>
                      <TextField
                        label="Fee per Hour"
                        value={formData.operating_rules.early_checkin_fee_per_hour}
                        onChange={handleRulesChange('early_checkin_fee_per_hour')}
                        type="number"
                        InputProps={{
                          startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                          inputProps: { min: 0 },
                        }}
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        label="Earliest Allowed"
                        type="time"
                        value={formData.operating_rules.earliest_checkin_time}
                        onChange={handleRulesChange('earliest_checkin_time')}
                        InputLabelProps={{ shrink: true }}
                        sx={{ flex: 1 }}
                      />
                    </Box>
                  )}
                </Box>

                <Divider />

                {/* Late Checkout */}
                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.operating_rules.late_checkout_allowed}
                        onChange={handleRulesSwitchChange('late_checkout_allowed')}
                      />
                    }
                    label="Allow Late Checkout"
                  />
                  {formData.operating_rules.late_checkout_allowed && (
                    <Box display="flex" gap={2} mt={1}>
                      <TextField
                        label="Fee per Hour"
                        value={formData.operating_rules.late_checkout_fee_per_hour}
                        onChange={handleRulesChange('late_checkout_fee_per_hour')}
                        type="number"
                        InputProps={{
                          startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                          inputProps: { min: 0 },
                        }}
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        label="Max Hours"
                        value={formData.operating_rules.late_checkout_max_hours}
                        onChange={handleRulesChange('late_checkout_max_hours')}
                        type="number"
                        InputProps={{
                          endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                          inputProps: { min: 1 },
                        }}
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        label="Latest Allowed"
                        type="time"
                        value={formData.operating_rules.latest_checkout_time}
                        onChange={handleRulesChange('latest_checkout_time')}
                        InputLabelProps={{ shrink: true }}
                        sx={{ flex: 1 }}
                      />
                    </Box>
                  )}
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Box>
      )}
    </ModernDialog>
  );
};
