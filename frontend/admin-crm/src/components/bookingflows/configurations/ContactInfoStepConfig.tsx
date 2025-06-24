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
  Card,
  CardContent,
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
  Divider,
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
} from '@mui/icons-material';
import type { 
  BookingFlowStep, 
  ContactInfoStepConfiguration 
} from '../../../types/bookingflows.types';

interface ContactInfoStepConfigProps {
  step: BookingFlowStep;
  config?: ContactInfoStepConfiguration | null;
  onUpdate: (data: Partial<ContactInfoStepConfiguration>) => void;
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

  useEffect(() => {
    if (config) {
      setFormData({
        require_full_name: config.require_full_name ?? true,
        require_email: config.require_email ?? true,
        require_phone: config.require_phone ?? true,
        require_address: config.require_address ?? false,
        require_company: config.require_company ?? false,
        custom_fields: config.custom_fields || [],
        offer_account_creation: config.offer_account_creation ?? true,
        require_account_creation: config.require_account_creation ?? false,
      });
    }
  }, [config]);

  const handleSwitchChange = (field: keyof ContactInfoConfigFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.checked,
    }));
  };

  const handleAddCustomField = () => {
    setEditingField(null);
    setCustomFieldDialogOpen(true);
  };

  const handleEditCustomField = (field: CustomField) => {
    setEditingField(field);
    setCustomFieldDialogOpen(true);
  };

  const handleSaveCustomField = (field: CustomField) => {
    setFormData(prev => ({
      ...prev,
      custom_fields: editingField
        ? prev.custom_fields.map(f => f.id === editingField.id ? field : f)
        : [...prev.custom_fields, { ...field, id: Date.now().toString() }]
    }));
    setCustomFieldDialogOpen(false);
    setEditingField(null);
  };

  const handleDeleteCustomField = (fieldId: string) => {
    setFormData(prev => ({
      ...prev,
      custom_fields: prev.custom_fields.filter(f => f.id !== fieldId)
    }));
  };

  const handleSave = () => {
    onUpdate({
      require_full_name: formData.require_full_name,
      require_email: formData.require_email,
      require_phone: formData.require_phone,
      require_address: formData.require_address,
      require_company: formData.require_company,
      custom_fields: formData.custom_fields,
      offer_account_creation: formData.offer_account_creation,
      require_account_creation: formData.require_account_creation,
    });
  };

  const getRequiredFieldsCount = () => {
    return [
      formData.require_full_name,
      formData.require_email,
      formData.require_phone,
      formData.require_address,
      formData.require_company,
    ].filter(Boolean).length + formData.custom_fields.filter(f => f.required).length;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Contact Information Step Configuration
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Configure what contact information to collect from clients and whether to offer account creation.
      </Alert>

      <Stack spacing={3}>
        {/* Standard Fields */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Standard Contact Fields
            </Typography>
            
            <Stack spacing={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <PersonIcon color="primary" />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.require_full_name}
                      onChange={handleSwitchChange('require_full_name')}
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
                    />
                  }
                  label="Require Company Information"
                />
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Custom Fields */}
        <Card variant="outlined">
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1">
                Custom Fields ({formData.custom_fields.length})
              </Typography>
              
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddCustomField}
                size="small"
              >
                Add Custom Field
              </Button>
            </Box>

            {formData.custom_fields.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                No custom fields added. Custom fields allow you to collect additional information specific to your business needs.
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
                      backgroundColor: 'background.paper'
                    }}
                  >
                    <ListItemText
                      primary={field.name}
                      secondary={
                        <Box display="flex" gap={1} mt={0.5}>
                          <Typography variant="caption" component="span">
                            Type: {FIELD_TYPES.find(t => t.value === field.type)?.label}
                          </Typography>
                          {field.required && (
                            <Typography variant="caption" component="span" color="error">
                              Required
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
                      >
                        <AddIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        onClick={() => handleDeleteCustomField(field.id)}
                        size="small"
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>

        {/* Account Creation */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Account Creation
            </Typography>
            
            <Stack spacing={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <AccountIcon color="primary" />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.offer_account_creation}
                      onChange={handleSwitchChange('offer_account_creation')}
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
                      disabled={!formData.offer_account_creation}
                    />
                  }
                  label="Require Account Creation"
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Force all clients to create an account (only available if account creation is offered)
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        {/* Configuration Summary */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Configuration Summary
            </Typography>
            
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
                  formData.require_company && 'Company'
                ].filter(Boolean).join(', ') || 'None required'}
              </Typography>
              
              {formData.custom_fields.length > 0 && (
                <Typography variant="body2">
                  <strong>Custom Fields:</strong> {formData.custom_fields.length} added 
                  ({formData.custom_fields.filter(f => f.required).length} required)
                </Typography>
              )}
              
              <Typography variant="body2">
                <strong>Account Creation:</strong>{' '}
                {formData.require_account_creation 
                  ? 'Required' 
                  : formData.offer_account_creation 
                    ? 'Optional' 
                    : 'Not offered'
                }
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        {/* Actions */}
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Configuration'}
          </Button>
          
          <Button
            variant="outlined"
            onClick={() => setFormData(defaultFormData)}
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
}

const CustomFieldDialog: React.FC<CustomFieldDialogProps> = ({
  open,
  onClose,
  editingField,
  onSave,
}) => {
  const [fieldData, setFieldData] = useState<Omit<CustomField, 'id'>>({
    name: '',
    type: 'text',
    required: false,
    options: [],
  });
  const [newOption, setNewOption] = useState('');

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
  }, [editingField, open]);

  const handleSave = () => {
    if (!fieldData.name.trim()) return;

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
      setFieldData(prev => ({
        ...prev,
        options: [...(prev.options || []), newOption.trim()],
      }));
      setNewOption('');
    }
  };

  const handleRemoveOption = (optionToRemove: string) => {
    setFieldData(prev => ({
      ...prev,
      options: prev.options?.filter(option => option !== optionToRemove) || [],
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {editingField ? 'Edit Custom Field' : 'Add Custom Field'}
      </DialogTitle>
      
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            fullWidth
            label="Field Name"
            value={fieldData.name}
            onChange={(e) => setFieldData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
          
          <FormControl fullWidth>
            <InputLabel>Field Type</InputLabel>
            <Select
              value={fieldData.type}
              label="Field Type"
              onChange={(e) => setFieldData(prev => ({ ...prev, type: e.target.value }))}
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
                onChange={(e) => setFieldData(prev => ({ ...prev, required: e.target.checked }))}
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
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleAddOption}
                  disabled={!newOption.trim()}
                >
                  Add
                </Button>
              </Box>

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
                        backgroundColor: 'background.paper'
                      }}
                    >
                      <ListItemText primary={option} />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => handleRemoveOption(option)}
                          size="small"
                          color="error"
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
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSave} 
          variant="contained"
          disabled={!fieldData.name.trim()}
        >
          {editingField ? 'Update' : 'Add'} Field
        </Button>
      </DialogActions>
    </Dialog>
  );
};