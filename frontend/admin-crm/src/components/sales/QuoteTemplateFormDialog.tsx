// frontend/admin-crm/src/components/sales/QuoteTemplateFormDialog.tsx

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
  Stack,
  CircularProgress,
  Alert,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Assignment as TemplateIcon,
} from '@mui/icons-material';
import { useEventTypes } from '../../hooks/useEvents';
import type {
  QuoteTemplate,
  CreateQuoteTemplateData,
  UpdateQuoteTemplateData,
  QuoteTemplateFormData,
} from '../../types/sales.types';
import { tokens } from '../../design-system';

interface QuoteTemplateFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingTemplate?: QuoteTemplate | null;
  onSubmit: (data: CreateQuoteTemplateData | UpdateQuoteTemplateData) => void;
  isLoading: boolean;
}

const initialFormData: QuoteTemplateFormData = {
  name: '',
  introduction: '',
  event_type: '',
  terms_and_conditions: '',
  is_active: true,
  default_validity_days: '30',
  has_multiple_options: false,
  default_tax_rate: '',
  workflow_template: '',
  products: [],
};

export const QuoteTemplateFormDialog: React.FC<QuoteTemplateFormDialogProps> = ({
  open,
  onClose,
  editingTemplate,
  onSubmit,
  isLoading,
}) => {
  const [formData, setFormData] = useState<QuoteTemplateFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<QuoteTemplateFormData>>({});

  // Hooks for dependent data
  const { eventTypes = [] } = useEventTypes();

  // Initialize form data when editing
  useEffect(() => {
    if (editingTemplate && open) {
      setFormData({
        name: editingTemplate.name,
        introduction: editingTemplate.introduction || '',
        event_type: editingTemplate.event_type?.toString() || '',
        terms_and_conditions: editingTemplate.terms_and_conditions || '',
        is_active: editingTemplate.is_active,
        default_validity_days: editingTemplate.default_validity_days.toString(),
        has_multiple_options: editingTemplate.has_multiple_options,
        default_tax_rate: editingTemplate.default_tax_rate?.toString() || '',
        workflow_template: editingTemplate.workflow_template?.toString() || '',
        products:
          editingTemplate.products?.map((p) => ({
            product: p.product.toString(),
            quantity: p.quantity.toString(),
            is_required: p.is_required,
          })) || [],
      });
    } else if (open && !editingTemplate) {
      setFormData(initialFormData);
    }
  }, [editingTemplate, open]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData(initialFormData);
      setErrors({});
    }
  }, [open]);

  const handleInputChange =
    (field: keyof QuoteTemplateFormData) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value =
        event.target.type === 'checkbox'
          ? (event.target as HTMLInputElement).checked
          : event.target.value;

      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Clear error for this field
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: undefined,
        }));
      }
    };

  const handleSelectChange =
    (field: keyof QuoteTemplateFormData) => (event: SelectChangeEvent<string>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.value as string,
      }));

      // Clear error for this field
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: undefined,
        }));
      }
    };

  const handleSwitchChange =
    (field: keyof QuoteTemplateFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.checked,
      }));
    };

  const validateForm = (): boolean => {
    const newErrors: Partial<QuoteTemplateFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    }

    if (!formData.default_validity_days || parseInt(formData.default_validity_days) <= 0) {
      newErrors.default_validity_days = 'Validity days must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    const submitData: CreateQuoteTemplateData | UpdateQuoteTemplateData = {
      name: formData.name.trim(),
      introduction: formData.introduction.trim() || undefined,
      event_type: formData.event_type ? parseInt(formData.event_type) : null,
      terms_and_conditions: formData.terms_and_conditions.trim() || undefined,
      is_active: formData.is_active,
      default_validity_days: parseInt(formData.default_validity_days),
      has_multiple_options: formData.has_multiple_options,
      default_tax_rate: formData.default_tax_rate ? parseInt(formData.default_tax_rate) : null,
      workflow_template: formData.workflow_template ? parseInt(formData.workflow_template) : null,
    };

    onSubmit(submitData);
  };

  const handleCancel = () => {
    onClose();
  };

  const title = editingTemplate ? 'Edit Quote Template' : 'Create Quote Template';

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: tokens.spacing.radius.lg,
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ pb: 1 }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <TemplateIcon sx={{ color: tokens.color.primary[600] }} />
            <Typography variant="h6" component="span">
              {title}
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={3}>
            {/* Basic Information */}
            <Box>
              <Typography variant="subtitle2" gutterBottom color="text.secondary">
                Basic Information
              </Typography>

              <Stack spacing={2.5}>
                <TextField
                  fullWidth
                  label="Template Name"
                  value={formData.name}
                  onChange={handleInputChange('name')}
                  error={!!errors.name}
                  helperText={errors.name}
                  required
                  disabled={isLoading}
                />

                <TextField
                  fullWidth
                  label="Introduction Text"
                  value={formData.introduction}
                  onChange={handleInputChange('introduction')}
                  multiline
                  rows={3}
                  placeholder="Optional introduction text to appear at the beginning of quotes..."
                  disabled={isLoading}
                />

                <FormControl fullWidth>
                  <InputLabel>Event Type</InputLabel>
                  <Select
                    value={formData.event_type}
                    onChange={handleSelectChange('event_type')}
                    label="Event Type"
                    disabled={isLoading}
                  >
                    <MenuItem value="">Any Event Type</MenuItem>
                    {eventTypes.map((eventType) => (
                      <MenuItem key={eventType.id} value={eventType.id.toString()}>
                        {eventType.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Box>

            <Divider />

            {/* Configuration */}
            <Box>
              <Typography variant="subtitle2" gutterBottom color="text.secondary">
                Configuration
              </Typography>

              <Stack spacing={2.5}>
                <TextField
                  fullWidth
                  label="Default Validity Days"
                  type="number"
                  value={formData.default_validity_days}
                  onChange={handleInputChange('default_validity_days')}
                  error={!!errors.default_validity_days}
                  helperText={
                    errors.default_validity_days || 'Number of days the quote remains valid'
                  }
                  required
                  disabled={isLoading}
                  inputProps={{ min: 1 }}
                />

                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.is_active}
                        onChange={handleSwitchChange('is_active')}
                        disabled={isLoading}
                        color="primary"
                      />
                    }
                    label="Active Template"
                  />
                  <Typography variant="caption" color="text.secondary" display="block">
                    Active templates are available for creating new quotes
                  </Typography>
                </Box>

                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.has_multiple_options}
                        onChange={handleSwitchChange('has_multiple_options')}
                        disabled={isLoading}
                        color="primary"
                      />
                    }
                    label="Multiple Options"
                  />
                  <Typography variant="caption" color="text.secondary" display="block">
                    Allow multiple package options within a single quote
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Divider />

            {/* Terms and Conditions */}
            <Box>
              <Typography variant="subtitle2" gutterBottom color="text.secondary">
                Terms and Conditions
              </Typography>

              <TextField
                fullWidth
                label="Terms and Conditions"
                value={formData.terms_and_conditions}
                onChange={handleInputChange('terms_and_conditions')}
                multiline
                rows={4}
                placeholder="Enter default terms and conditions for quotes created with this template..."
                disabled={isLoading}
              />
            </Box>

            {/* Info Alert */}
            <Alert severity="info" variant="outlined">
              Products and pricing can be configured after creating the template. This template will
              be available for creating standardized quotes.
            </Alert>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
            onClick={handleCancel}
            disabled={isLoading}
            startIcon={<CancelIcon />}
            sx={{ color: tokens.color.neutral[600] }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={16} /> : <SaveIcon />}
            sx={{
              background: `linear-gradient(135deg, ${tokens.color.primary[500]} 0%, ${tokens.color.primary[600]} 100%)`,
              px: 3,
            }}
          >
            {isLoading ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
