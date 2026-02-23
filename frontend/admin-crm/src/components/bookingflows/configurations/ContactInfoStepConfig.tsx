// frontend/admin-crm/src/components/bookingflows/configurations/ContactInfoStepConfig.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  FormControlLabel,
  Switch,
  Typography,
  Stack,
  Alert,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';

import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Home as AddressIcon,
  Business as CompanyIcon,
  AccountCircle as AccountIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import type {
  BookingFlowStep,
  ContactInfoStepConfiguration,
} from '../../../types/bookingflows.types';
import { useBookingFlowStepConfiguration } from '../../../hooks/useBookingFlows';
import { useFormHandlers } from '../../../hooks/useFormHandlers';
import { ConfigSection } from '../../common';

interface ContactInfoStepConfigProps {
  step: BookingFlowStep;
  config?: ContactInfoStepConfiguration | null;
  onUpdate: (updatedStep: BookingFlowStep) => void;
  isLoading?: boolean;
}

interface ContactInfoConfigFormData {
  require_full_name: boolean;
  require_email: boolean;
  require_phone: boolean;
  require_address: boolean;
  require_company: boolean;
  custom_fields: CustomField[];
  offer_account_creation: boolean;
  require_account_creation: boolean;
}

interface CustomField {
  id: string;
  name: string;
  type: string;
  required: boolean;
  options?: string[];
}

const defaultFormData: ContactInfoConfigFormData = {
  require_full_name: true,
  require_email: true,
  require_phone: true,
  require_address: false,
  require_company: false,
  custom_fields: [],
  offer_account_creation: true,
  require_account_creation: false,
};

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'url', label: 'URL' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'checkbox', label: 'Checkbox' },
];

export const ContactInfoStepConfig: React.FC<ContactInfoStepConfigProps> = ({
  step,
  config,
  onUpdate,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<ContactInfoConfigFormData>(defaultFormData);
  const [customFieldDialogOpen, setCustomFieldDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Use centralized form handlers
  const { handleSwitchChange } = useFormHandlers(setFormData, errors, setErrors);

  const { updateConfiguration, isUpdatingConfiguration } = useBookingFlowStepConfiguration();

  useEffect(() => {
    if (config) {
      setFormData({
        require_full_name: config.require_full_name ?? true,
        require_email: config.require_email ?? true,
        require_phone: config.require_phone ?? true,
        require_address: config.require_address ?? false,
        require_company: config.require_company ?? false,
        custom_fields: (config.custom_fields || []).map(
          (
            field: { name: string; type: string; required: boolean; placeholder?: string } & {
              id?: string;
            },
          ) => ({ ...field, id: field.id || Date.now().toString() + Math.random() }),
        ),
        offer_account_creation: config.offer_account_creation ?? true,
        require_account_creation: config.require_account_creation ?? false,
      });
    }
  }, [config]);

  const handleAddCustomField = () => {
    setEditingField(null);
    setCustomFieldDialogOpen(true);
  };

  const handleEditCustomField = (field: CustomField) => {
    setEditingField(field);
    setCustomFieldDialogOpen(true);
  };

  const handleSaveCustomField = (field: CustomField) => {
    setFormData((prev) => ({
      ...prev,
      custom_fields: editingField
        ? prev.custom_fields.map((f) => (f.id === editingField.id ? field : f))
        : [...prev.custom_fields, { ...field, id: Date.now().toString() }],
    }));
    setCustomFieldDialogOpen(false);
    setEditingField(null);
  };

  const handleDeleteCustomField = (fieldId: string) => {
    setFormData((prev) => ({
      ...prev,
      custom_fields: prev.custom_fields.filter((f) => f.id !== fieldId),
    }));
  };

  const handleSave = () => {
    // Use the evolved hook to update step configuration
    updateConfiguration(
      {
        stepId: step.id,
        data: {
          require_full_name: formData.require_full_name,
          require_email: formData.require_email,
          require_phone: formData.require_phone,
          require_address: formData.require_address,
          require_company: formData.require_company,
          custom_fields: formData.custom_fields,
          offer_account_creation: formData.offer_account_creation,
          require_account_creation: formData.require_account_creation,
        },
      },
      {
        onSuccess: () => {
          // Return updated step to parent component (matches evolved pattern)
          const updatedStep: BookingFlowStep = {
            ...step,
            configuration_data: {
              ...config,
              require_full_name: formData.require_full_name,
              require_email: formData.require_email,
              require_phone: formData.require_phone,
              require_address: formData.require_address,
              require_company: formData.require_company,
              custom_fields: formData.custom_fields,
              offer_account_creation: formData.offer_account_creation,
              require_account_creation: formData.require_account_creation,
            } as ContactInfoStepConfiguration,
          };
          onUpdate(updatedStep);
        },
      },
    );
  };

  const getRequiredFieldsCount = () => {
    return (
      [
        formData.require_full_name,
        formData.require_email,
        formData.require_phone,
        formData.require_address,
        formData.require_company,
      ].filter(Boolean).length + formData.custom_fields.filter((f) => f.required).length
    );
  };

  const currentlyLoading = isLoading || isUpdatingConfiguration;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Contact Information Step Configuration
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Configure what contact information to collect from clients and whether to offer account
        creation.
      </Alert>

      <Stack spacing={3}>
        {/* Standard Fields */}
        <ConfigSection title="Standard Contact Fields">
          <Stack spacing={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <PersonIcon color="primary" />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.require_full_name}
                    onChange={handleSwitchChange('require_full_name')}
                    disabled={currentlyLoading}
                  />
                }
                label="Require Full Name"
              />
            </Box>

            <Box display="flex" alignItems="center" gap={1}>
              <EmailIcon color="primary" />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.require_email}
                    onChange={handleSwitchChange('require_email')}
                    disabled={currentlyLoading}
                  />
                }
                label="Require Email Address"
              />
            </Box>

            <Box display="flex" alignItems="center" gap={1}>
              <PhoneIcon color="primary" />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.require_phone}
                    onChange={handleSwitchChange('require_phone')}
                    disabled={currentlyLoading}
                  />
                }
                label="Require Phone Number"
              />
            </Box>

            <Box display="flex" alignItems="center" gap={1}>
              <AddressIcon color="action" />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.require_address}
                    onChange={handleSwitchChange('require_address')}
                    disabled={currentlyLoading}
                  />
                }
                label="Require Address"
              />
            </Box>

            <Box display="flex" alignItems="center" gap={1}>
              <CompanyIcon color="action" />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.require_company}
                    onChange={handleSwitchChange('require_company')}
                    disabled={currentlyLoading}
                  />
                }
                label="Require Company Information"
              />
            </Box>
          </Stack>
        </ConfigSection>

        {/* Custom Fields */}
        <ConfigSection title={`Custom Fields (${formData.custom_fields.length})`}>
          <Box display="flex" justifyContent="flex-end" mb={2}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddCustomField}
              size="small"
              disabled={currentlyLoading}
            >
              Add Custom Field
            </Button>
          </Box>

          {formData.custom_fields.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No custom fields added. Custom fields allow you to collect additional information
              specific to your business needs.
            </Typography>
          ) : (
            <List dense>
              {formData.custom_fields.map((field) => (
                <ListItem
                  key={field.id}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    backgroundColor: 'background.paper',
                  }}
                >
                  <ListItemText
                    primary={field.name}
                    secondary={
                      <Box display="flex" gap={1} mt={0.5}>
                        <Typography variant="caption" component="span">
                          Type: {FIELD_TYPES.find((t) => t.value === field.type)?.label}
                        </Typography>
                        {field.required && (
                          <Typography variant="caption" component="span" color="error">
                            Required
                          </Typography>
                        )}
                        {field.type === 'select' && field.options && field.options.length > 0 && (
                          <Typography variant="caption" component="span" color="info.main">
                            {field.options.length} options
                          </Typography>
                        )}
                      </Box>
                    }
                  />

                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => handleEditCustomField(field)}
                      size="small"
                      sx={{ mr: 1 }}
                      disabled={currentlyLoading}
                      aria-label={`Edit ${field.name}`}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleDeleteCustomField(field.id)}
                      size="small"
                      color="error"
                      disabled={currentlyLoading}
                      aria-label={`Delete ${field.name}`}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </ConfigSection>

        {/* Account Creation */}
        <ConfigSection title="Account Creation">
          <Stack spacing={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <AccountIcon color="primary" />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.offer_account_creation}
                    onChange={handleSwitchChange('offer_account_creation')}
                    disabled={currentlyLoading}
                  />
                }
                label="Offer Account Creation"
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              Give clients the option to create an account for easier future bookings
            </Typography>

            <Box display="flex" alignItems="center" gap={1}>
              <AccountIcon color="action" />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.require_account_creation}
                    onChange={handleSwitchChange('require_account_creation')}
                    disabled={!formData.offer_account_creation || currentlyLoading}
                  />
                }
                label="Require Account Creation"
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              Force all clients to create an account (only available if account creation is offered)
            </Typography>
          </Stack>
        </ConfigSection>

        {/* Configuration Summary */}
        <ConfigSection title="Configuration Summary">
          <Stack spacing={1}>
            <Typography variant="body2">
              <strong>Required Fields:</strong> {getRequiredFieldsCount()} total
            </Typography>

            <Typography variant="body2">
              <strong>Standard Fields:</strong>{' '}
              {[
                formData.require_full_name && 'Name',
                formData.require_email && 'Email',
                formData.require_phone && 'Phone',
                formData.require_address && 'Address',
                formData.require_company && 'Company',
              ]
                .filter(Boolean)
                .join(', ') || 'None required'}
            </Typography>

            {formData.custom_fields.length > 0 && (
              <Typography variant="body2">
                <strong>Custom Fields:</strong> {formData.custom_fields.length} added (
                {formData.custom_fields.filter((f) => f.required).length} required)
              </Typography>
            )}

            <Typography variant="body2">
              <strong>Account Creation:</strong>{' '}
              {formData.require_account_creation
                ? 'Required'
                : formData.offer_account_creation
                  ? 'Optional'
                  : 'Not offered'}
            </Typography>
          </Stack>
        </ConfigSection>

        {/* Actions */}
        <Box display="flex" gap={2}>
          <Button variant="contained" onClick={handleSave} disabled={currentlyLoading}>
            {currentlyLoading ? 'Saving...' : 'Save Configuration'}
          </Button>

          <Button
            variant="outlined"
            onClick={() => setFormData(defaultFormData)}
            disabled={currentlyLoading}
          >
            Reset to Defaults
          </Button>
        </Box>
      </Stack>

      {/* Custom Field Dialog */}
      <CustomFieldDialog
        open={customFieldDialogOpen}
        onClose={() => setCustomFieldDialogOpen(false)}
        editingField={editingField}
        onSave={handleSaveCustomField}
        disabled={currentlyLoading}
      />
    </Box>
  );
};

// Custom Field Dialog Component
interface CustomFieldDialogProps {
  open: boolean;
  onClose: () => void;
  editingField: CustomField | null;
  onSave: (field: CustomField) => void;
  disabled?: boolean;
}

const CustomFieldDialog: React.FC<CustomFieldDialogProps> = ({
  open,
  onClose,
  editingField,
  onSave,
  disabled = false,
}) => {
  const [fieldData, setFieldData] = useState<Omit<CustomField, 'id'>>({
    name: '',
    type: 'text',
    required: false,
    options: [],
  });
  const [newOption, setNewOption] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingField) {
      setFieldData({
        name: editingField.name,
        type: editingField.type,
        required: editingField.required,
        options: editingField.options || [],
      });
    } else {
      setFieldData({
        name: '',
        type: 'text',
        required: false,
        options: [],
      });
    }
    setErrors({});
  }, [editingField, open]);

  const validateField = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fieldData.name.trim()) {
      newErrors.name = 'Field name is required';
    }

    if (fieldData.type === 'select' && (!fieldData.options || fieldData.options.length === 0)) {
      newErrors.options = 'Select fields must have at least one option';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateField()) return;

    onSave({
      id: editingField?.id || '',
      name: fieldData.name.trim(),
      type: fieldData.type,
      required: fieldData.required,
      options: fieldData.type === 'select' ? fieldData.options : undefined,
    });
  };

  const handleAddOption = () => {
    if (newOption.trim() && !fieldData.options?.includes(newOption.trim())) {
      setFieldData((prev) => ({
        ...prev,
        options: [...(prev.options || []), newOption.trim()],
      }));
      setNewOption('');
      // Clear options error when user adds an option
      if (errors.options) {
        setErrors((prev) => ({ ...prev, options: '' }));
      }
    }
  };

  const handleRemoveOption = (optionToRemove: string) => {
    setFieldData((prev) => ({
      ...prev,
      options: prev.options?.filter((option) => option !== optionToRemove) || [],
    }));
  };

  const handleTypeChange = (newType: string) => {
    setFieldData((prev) => ({
      ...prev,
      type: newType,
      // Clear options if switching away from select
      options: newType === 'select' ? prev.options : [],
    }));
    // Clear errors when type changes
    setErrors({});
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth disableEscapeKeyDown={disabled}>
      <DialogTitle>{editingField ? 'Edit Custom Field' : 'Add Custom Field'}</DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            fullWidth
            label="Field Name"
            value={fieldData.name}
            onChange={(e) => {
              setFieldData((prev) => ({ ...prev, name: e.target.value }));
              if (errors.name) {
                setErrors((prev) => ({ ...prev, name: '' }));
              }
            }}
            error={!!errors.name}
            helperText={errors.name}
            required
            disabled={disabled}
          />

          <FormControl fullWidth disabled={disabled}>
            <InputLabel>Field Type</InputLabel>
            <Select
              value={fieldData.type}
              label="Field Type"
              onChange={(e) => handleTypeChange(e.target.value)}
            >
              {FIELD_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={fieldData.required}
                onChange={(e) => setFieldData((prev) => ({ ...prev, required: e.target.checked }))}
                disabled={disabled}
              />
            }
            label="Required Field"
          />

          {fieldData.type === 'select' && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Select Options
              </Typography>

              <Box display="flex" gap={1} mb={2}>
                <TextField
                  size="small"
                  placeholder="Add option..."
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddOption()}
                  sx={{ flex: 1 }}
                  disabled={disabled}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleAddOption}
                  disabled={!newOption.trim() || disabled}
                >
                  Add
                </Button>
              </Box>

              {errors.options && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {errors.options}
                </Alert>
              )}

              {fieldData.options && fieldData.options.length > 0 ? (
                <List dense>
                  {fieldData.options.map((option, index) => (
                    <ListItem
                      key={index}
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                        backgroundColor: 'background.paper',
                      }}
                    >
                      <ListItemText primary={option} />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => handleRemoveOption(option)}
                          size="small"
                          color="error"
                          disabled={disabled}
                          aria-label={`Remove option ${option}`}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  No options added
                </Typography>
              )}
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={disabled}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!fieldData.name.trim() || disabled}
        >
          {editingField ? 'Update' : 'Add'} Field
        </Button>
      </DialogActions>
    </Dialog>
  );
};
