// frontend/admin-crm/src/components/analytics/dashboards/DashboardForm.tsx

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
  FormHelperText,
  Stack,
  Chip,
  Box,
  Typography,
  Alert,
  Autocomplete,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Save as SaveIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import type { 
  Dashboard, 
  CreateDashboardData, 
  UpdateDashboardData,
  DashboardType,
} from '../../../types/analytics.types';

interface DashboardFormProps {
  open: boolean;
  onClose: () => void;
  editingDashboard?: Dashboard | null;
  onSubmit: (data: CreateDashboardData | UpdateDashboardData) => void;
  isLoading: boolean;
}

interface FormData {
  name: string;
  description: string;
  dashboard_type: DashboardType;
  is_public: boolean;
  allowed_roles: string[];
  auto_refresh_interval: string;
  is_active: boolean;
  is_default: boolean;
}

const AVAILABLE_ROLES = [
  { value: 'admin', label: 'Administrator' },
  { value: 'manager', label: 'Manager' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'analyst', label: 'Analyst' },
  { value: 'executive', label: 'Executive' },
];

const DASHBOARD_TYPE_OPTIONS: Array<{ value: DashboardType; label: string }> = [
  { value: 'EXECUTIVE', label: 'Executive Dashboard' },
  { value: 'OPERATIONAL', label: 'Operational Dashboard' },
  { value: 'CLIENT', label: 'Client Dashboard' },
  { value: 'FINANCIAL', label: 'Financial Dashboard' },
  { value: 'MARKETING', label: 'Marketing Dashboard' },
  { value: 'CUSTOM', label: 'Custom Dashboard' },
];

const REFRESH_INTERVALS = [
  { value: '0', label: 'No Auto-refresh' },
  { value: '30', label: 'Every 30 seconds' },
  { value: '60', label: 'Every minute' },
  { value: '300', label: 'Every 5 minutes' },
  { value: '600', label: 'Every 10 minutes' },
  { value: '1800', label: 'Every 30 minutes' },
  { value: '3600', label: 'Every hour' },
];

export const DashboardForm: React.FC<DashboardFormProps> = ({
  open,
  onClose,
  editingDashboard,
  onSubmit,
  isLoading,
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    dashboard_type: 'OPERATIONAL',
    is_public: false,
    allowed_roles: [],
    auto_refresh_interval: '300',
    is_active: true,
    is_default: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingDashboard) {
      setFormData({
        name: editingDashboard.name,
        description: editingDashboard.description || '',
        dashboard_type: editingDashboard.dashboard_type,
        is_public: editingDashboard.is_public,
        allowed_roles: editingDashboard.allowed_roles || [],
        auto_refresh_interval: editingDashboard.auto_refresh_interval.toString(),
        is_active: editingDashboard.is_active,
        is_default: editingDashboard.is_default,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        dashboard_type: 'OPERATIONAL',
        is_public: false,
        allowed_roles: [],
        auto_refresh_interval: '300',
        is_active: true,
        is_default: false,
      });
    }
    setErrors({});
  }, [editingDashboard, open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Dashboard name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Dashboard name must be 100 characters or less';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less';
    }

    const refreshInterval = parseInt(formData.auto_refresh_interval);
    if (isNaN(refreshInterval) || refreshInterval < 0) {
      newErrors.auto_refresh_interval = 'Refresh interval must be a valid number';
    }

    if (!formData.is_public && formData.allowed_roles.length === 0) {
      newErrors.allowed_roles = 'Private dashboards must specify allowed roles';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData: CreateDashboardData | UpdateDashboardData = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      dashboard_type: formData.dashboard_type,
      is_public: formData.is_public,
      allowed_roles: formData.is_public ? [] : formData.allowed_roles,
      auto_refresh_interval: parseInt(formData.auto_refresh_interval),
      is_active: formData.is_active,
      is_default: formData.is_default,
      layout_config: {},
    };

    onSubmit(submitData);
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      dashboard_type: 'OPERATIONAL',
      is_public: false,
      allowed_roles: [],
      auto_refresh_interval: '300',
      is_active: true,
      is_default: false,
    });
    setErrors({});
    onClose();
  };

  const handleFieldChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Handle dependent field logic
    if (field === 'is_public' && value === true) {
      setFormData(prev => ({ ...prev, allowed_roles: [] }));
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md" 
      fullWidth
      PaperProps={{
        component: 'form',
        onSubmit: handleSubmit,
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <DashboardIcon />
          {editingDashboard ? 'Edit Dashboard' : 'Create Dashboard'}
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {/* Basic Information */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
            
            <Stack spacing={2}>
              <TextField
                label="Dashboard Name"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                error={!!errors.name}
                helperText={errors.name}
                required
                fullWidth
                placeholder="Enter dashboard name"
              />

              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                error={!!errors.description}
                helperText={errors.description}
                multiline
                rows={3}
                fullWidth
                placeholder="Describe the purpose and content of this dashboard"
              />

              <FormControl fullWidth>
                <InputLabel>Dashboard Type</InputLabel>
                <Select
                  value={formData.dashboard_type}
                  label="Dashboard Type"
                  onChange={(e) => handleFieldChange('dashboard_type', e.target.value)}
                >
                  {DASHBOARD_TYPE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Box>

          {/* Access & Permissions */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Access & Permissions
            </Typography>
            
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_public}
                    onChange={(e) => handleFieldChange('is_public', e.target.checked)}
                  />
                }
                label="Public Dashboard"
              />
              
              {!formData.is_public && (
                <FormControl error={!!errors.allowed_roles}>
                  <Autocomplete
                    multiple
                    options={AVAILABLE_ROLES}
                    getOptionLabel={(option) => option.label}
                    value={AVAILABLE_ROLES.filter(role => formData.allowed_roles.includes(role.value))}
                    onChange={(_, newValue) => 
                      handleFieldChange('allowed_roles', newValue.map(role => role.value))
                    }
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          variant="outlined"
                          label={option.label}
                          {...getTagProps({ index })}
                          key={option.value}
                        />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Allowed Roles"
                        placeholder="Select roles that can access this dashboard"
                        error={!!errors.allowed_roles}
                        helperText={errors.allowed_roles}
                      />
                    )}
                  />
                </FormControl>
              )}

              {formData.is_public && (
                <Alert severity="info">
                  Public dashboards can be viewed by all authenticated users.
                </Alert>
              )}
            </Stack>
          </Box>

          {/* Dashboard Settings */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Dashboard Settings
            </Typography>
            
            <Stack spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Auto-refresh Interval</InputLabel>
                <Select
                  value={formData.auto_refresh_interval}
                  label="Auto-refresh Interval"
                  onChange={(e) => handleFieldChange('auto_refresh_interval', e.target.value)}
                >
                  {REFRESH_INTERVALS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  How often the dashboard data should automatically refresh
                </FormHelperText>
              </FormControl>

              <Stack direction="row" spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_active}
                      onChange={(e) => handleFieldChange('is_active', e.target.checked)}
                    />
                  }
                  label="Active"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_default}
                      onChange={(e) => handleFieldChange('is_default', e.target.checked)}
                    />
                  }
                  label="Default Dashboard"
                />
              </Stack>

              {formData.is_default && (
                <Alert severity="warning">
                  Setting this as the default dashboard will make it the primary dashboard for users with appropriate access.
                </Alert>
              )}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button
          onClick={handleClose}
          disabled={isLoading}
          startIcon={<CloseIcon />}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={isLoading}
          startIcon={<SaveIcon />}
        >
          {editingDashboard ? 'Update Dashboard' : 'Create Dashboard'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};