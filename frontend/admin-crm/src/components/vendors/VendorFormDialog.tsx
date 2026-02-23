// frontend/admin-crm/src/components/vendors/VendorFormDialog.tsx

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
  MenuItem,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { ModernDialog, createDialogActions } from '../common';
import type {
  VendorListItem,
  VendorDetail,
  CreateVendorData,
  UpdateVendorData,
  CreateOperatingRulesData,
  VendorServiceCategory,
} from '../../types/vendors.types';
import { VENDOR_SERVICE_CATEGORIES } from '../../types/vendors.types';

interface VendorFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingVendor?: VendorListItem | VendorDetail | null;
  onSubmit: (data: CreateVendorData | UpdateVendorData) => void;
  isLoading: boolean;
}

interface VendorFormData {
  // Basic info
  name: string;
  code: string;
  description: string;
  service_category: VendorServiceCategory;
  service_description: string;
  // Contact info
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  company_name: string;
  address: string;
  website: string;
  // Pricing
  pricing_notes: string;
  // Status
  is_active: boolean;
  is_bookable: boolean;
  // Display
  sort_order: string;
  // Operating rules
  operating_rules: OperatingRulesFormData;
}

interface OperatingRulesFormData {
  minimum_lead_days: string;
  minimum_service_hours: string;
  maximum_service_hours: string;
  setup_hours: string;
  teardown_hours: string;
}

const defaultOperatingRules: OperatingRulesFormData = {
  minimum_lead_days: '0',
  minimum_service_hours: '',
  maximum_service_hours: '',
  setup_hours: '0',
  teardown_hours: '0',
};

const defaultFormData: VendorFormData = {
  name: '',
  code: '',
  description: '',
  service_category: 'OTHER',
  service_description: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  company_name: '',
  address: '',
  website: '',
  pricing_notes: '',
  is_active: true,
  is_bookable: true,
  sort_order: '0',
  operating_rules: defaultOperatingRules,
};

export const VendorFormDialog: React.FC<VendorFormDialogProps> = ({
  open,
  onClose,
  editingVendor,
  onSubmit,
  isLoading,
}) => {
  const [formData, setFormData] = useState<VendorFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['basic']);

  useEffect(() => {
    if (open && !initialized) {
      if (editingVendor) {
        const vendor = editingVendor as VendorDetail;
        const rules = vendor.operating_rules;

        setFormData({
          name: vendor.name || '',
          code: vendor.code || '',
          description: vendor.description || '',
          service_category: vendor.service_category || 'OTHER',
          service_description: vendor.service_description || '',
          contact_name: vendor.contact_name || '',
          contact_email: vendor.contact_email || '',
          contact_phone: vendor.contact_phone || '',
          company_name: vendor.company_name || '',
          address: vendor.address || '',
          website: vendor.website || '',
          pricing_notes: vendor.pricing_notes || '',
          is_active: vendor.is_active ?? true,
          is_bookable: vendor.is_bookable ?? true,
          sort_order: vendor.sort_order?.toString() || '0',
          operating_rules: rules
            ? {
                minimum_lead_days: rules.minimum_lead_days?.toString() || '0',
                minimum_service_hours: rules.minimum_service_hours || '',
                maximum_service_hours: rules.maximum_service_hours || '',
                setup_hours: rules.setup_hours || '0',
                teardown_hours: rules.teardown_hours || '0',
              }
            : defaultOperatingRules,
        });
      } else {
        setFormData(defaultFormData);
      }
      setInitialized(true);
      setErrors({});
    }
  }, [open, editingVendor, initialized]);

  useEffect(() => {
    if (!open) {
      setInitialized(false);
    }
  }, [open]);

  const handleInputChange =
    (field: keyof VendorFormData) =>
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
    (field: keyof VendorFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.checked,
      }));
    };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section],
    );
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

    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      newErrors.contact_email = 'Invalid email format';
    }

    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = 'Website must start with http:// or https://';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const rules = formData.operating_rules;
    const hasOperatingRules =
      parseInt(rules.minimum_lead_days) > 0 ||
      rules.minimum_service_hours ||
      rules.maximum_service_hours ||
      parseFloat(rules.setup_hours) > 0 ||
      parseFloat(rules.teardown_hours) > 0;

    const operatingRulesData: CreateOperatingRulesData | undefined = hasOperatingRules
      ? {
          minimum_lead_days: parseInt(rules.minimum_lead_days) || 0,
          minimum_service_hours: rules.minimum_service_hours || null,
          maximum_service_hours: rules.maximum_service_hours || null,
          setup_hours: rules.setup_hours || '0',
          teardown_hours: rules.teardown_hours || '0',
        }
      : undefined;

    const submitData: CreateVendorData | UpdateVendorData = {
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      description: formData.description.trim(),
      service_category: formData.service_category,
      service_description: formData.service_description.trim(),
      contact_name: formData.contact_name.trim(),
      contact_email: formData.contact_email.trim(),
      contact_phone: formData.contact_phone.trim(),
      company_name: formData.company_name.trim(),
      address: formData.address.trim(),
      website: formData.website.trim(),
      pricing_notes: formData.pricing_notes.trim(),
      is_active: formData.is_active,
      is_bookable: formData.is_bookable,
      sort_order: parseInt(formData.sort_order) || 0,
      operating_rules: operatingRulesData,
    };

    onSubmit(submitData);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const actions = createDialogActions(handleClose, handleSubmit, {
    cancelLabel: 'Cancel',
    confirmLabel: editingVendor ? 'Update Vendor' : 'Create Vendor',
    isLoading,
    confirmDisabled: isLoading,
  });

  return (
    <ModernDialog
      open={open}
      onClose={handleClose}
      title={editingVendor ? 'Edit Vendor' : 'Create New Vendor'}
      actions={actions}
      maxWidth="md"
      fullWidth
      contentSx={{ minHeight: '60vh' }}
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
                    label="Vendor Name"
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
                    helperText={errors.code || 'Uppercase letters, numbers, and underscores'}
                    required
                  />
                </Box>

                <TextField
                  fullWidth
                  select
                  label="Service Category"
                  value={formData.service_category}
                  onChange={handleInputChange('service_category')}
                >
                  {VENDOR_SERVICE_CATEGORIES.map((cat) => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </MenuItem>
                  ))}
                </TextField>

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
                  label="Service Description"
                  value={formData.service_description}
                  onChange={handleInputChange('service_description')}
                  multiline
                  rows={2}
                  helperText="Detailed description of services offered"
                />

                <Divider />

                <Box display="flex" gap={2} flexWrap="wrap">
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

          {/* Contact Information */}
          <Accordion
            expanded={expandedSections.includes('contact')}
            onChange={() => toggleSection('contact')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Contact Information</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Box display="flex" gap={2}>
                  <TextField
                    fullWidth
                    label="Contact Name"
                    value={formData.contact_name}
                    onChange={handleInputChange('contact_name')}
                  />
                  <TextField
                    fullWidth
                    label="Company Name"
                    value={formData.company_name}
                    onChange={handleInputChange('company_name')}
                  />
                </Box>

                <Box display="flex" gap={2}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={formData.contact_email}
                    onChange={handleInputChange('contact_email')}
                    error={!!errors.contact_email}
                    helperText={errors.contact_email}
                  />
                  <TextField
                    fullWidth
                    label="Phone"
                    value={formData.contact_phone}
                    onChange={handleInputChange('contact_phone')}
                  />
                </Box>

                <TextField
                  fullWidth
                  label="Website"
                  value={formData.website}
                  onChange={handleInputChange('website')}
                  error={!!errors.website}
                  helperText={errors.website || 'Include http:// or https://'}
                />

                <TextField
                  fullWidth
                  label="Address"
                  value={formData.address}
                  onChange={handleInputChange('address')}
                  multiline
                  rows={2}
                />
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Pricing Notes */}
          <Accordion
            expanded={expandedSections.includes('pricing')}
            onChange={() => toggleSection('pricing')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Pricing Notes</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TextField
                fullWidth
                label="Pricing Notes"
                value={formData.pricing_notes}
                onChange={handleInputChange('pricing_notes')}
                multiline
                rows={4}
                helperText="Notes about pricing, rates, packages offered, etc."
              />
            </AccordionDetails>
          </Accordion>

          {/* Operating Rules */}
          <Accordion
            expanded={expandedSections.includes('rules')}
            onChange={() => toggleSection('rules')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Operating Rules (Optional)</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Configure operational constraints for this vendor. These are optional.
                </Typography>

                <TextField
                  label="Minimum Lead Days"
                  value={formData.operating_rules.minimum_lead_days}
                  onChange={handleRulesChange('minimum_lead_days')}
                  type="number"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">days</InputAdornment>,
                    inputProps: { min: 0 },
                  }}
                  helperText="Minimum advance notice required"
                  sx={{ width: 200 }}
                />

                <Divider />
                <Typography variant="subtitle2" color="text.secondary">
                  Service Duration
                </Typography>

                <Box display="flex" gap={2}>
                  <TextField
                    label="Minimum Hours"
                    value={formData.operating_rules.minimum_service_hours}
                    onChange={handleRulesChange('minimum_service_hours')}
                    type="number"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                      inputProps: { min: 0, step: 0.5 },
                    }}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Maximum Hours"
                    value={formData.operating_rules.maximum_service_hours}
                    onChange={handleRulesChange('maximum_service_hours')}
                    type="number"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                      inputProps: { min: 0, step: 0.5 },
                    }}
                    sx={{ flex: 1 }}
                  />
                </Box>

                <Divider />
                <Typography variant="subtitle2" color="text.secondary">
                  Setup/Teardown Time
                </Typography>

                <Box display="flex" gap={2}>
                  <TextField
                    label="Setup Time"
                    value={formData.operating_rules.setup_hours}
                    onChange={handleRulesChange('setup_hours')}
                    type="number"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                      inputProps: { min: 0, step: 0.5 },
                    }}
                    helperText="Time needed before service"
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Teardown Time"
                    value={formData.operating_rules.teardown_hours}
                    onChange={handleRulesChange('teardown_hours')}
                    type="number"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                      inputProps: { min: 0, step: 0.5 },
                    }}
                    helperText="Time needed after service"
                    sx={{ flex: 1 }}
                  />
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Box>
      )}
    </ModernDialog>
  );
};
