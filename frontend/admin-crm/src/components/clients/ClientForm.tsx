// frontend/admin-crm/src/components/clients/ClientForm.tsx

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControlLabel,
  Switch,
  TextField,
  Typography,
  Stack,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import type { CreateClientData, UpdateClientData, Client } from '../../types/clients.types';

interface ClientFormProps {
  client?: Client;
  onSubmit: (data: CreateClientData | UpdateClientData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export const ClientForm: React.FC<ClientFormProps> = ({
  client,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const isEditing = !!client;
  
  const [formData, setFormData] = useState<CreateClientData>({
    email: client?.email || '',
    first_name: client?.first_name || '',
    last_name: client?.last_name || '',
    profile: {
      company: client?.profile?.company || '',
      phone: client?.profile?.phone || '',
    },
    password: '',
    is_active: client?.is_active ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [createAccount, setCreateAccount] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.profile?.phone && !/^[\d\s\-+()]+$/.test(formData.profile.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if ((createAccount || isEditing) && formData.password) {
      if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters long';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => {
      if (field.startsWith('profile.')) {
        const profileField = field.split('.')[1];
        return {
          ...prev,
          profile: {
            ...prev.profile,
            [profileField]: value
          }
        };
      }
      return {
        ...prev,
        [field]: value
      };
    });

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Prepare data for submission
    if (isEditing) {
      // For editing, create UpdateClientData
      const updateData: UpdateClientData = {
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        profile: formData.profile,
        is_active: formData.is_active,
      };
      
      // Only include password if it's being changed
      if (formData.password) {
        updateData.password = formData.password;
      }
      
      onSubmit(updateData);
    } else {
      // For creating, create CreateClientData
      const createData: CreateClientData = {
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        profile: formData.profile,
        is_active: formData.is_active,
      };
      
      // Add password if creating account
      if (createAccount || formData.password) {
        createData.password = formData.password;
      }
      
      onSubmit(createData);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={3}>
        {/* Basic Information */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
            
            <Stack spacing={2}>
              <Box display="flex" gap={2}>
                <TextField
                  label="First Name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  error={!!errors.first_name}
                  helperText={errors.first_name}
                  required
                  fullWidth
                  disabled={isLoading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
                
                <TextField
                  label="Last Name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  error={!!errors.last_name}
                  helperText={errors.last_name}
                  required
                  fullWidth
                  disabled={isLoading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              <TextField
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                error={!!errors.email}
                helperText={errors.email}
                required
                fullWidth
                disabled={isLoading || isEditing} // Prevent email changes in edit mode
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Contact Information
            </Typography>
            
            <Stack spacing={2}>
              <TextField
                label="Company"
                value={formData.profile?.company || ''}
                onChange={(e) => handleInputChange('profile.company', e.target.value)}
                fullWidth
                disabled={isLoading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BusinessIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                helperText="Optional - Client's company or organization"
              />
              
              <TextField
                label="Phone Number"
                value={formData.profile?.phone || ''}
                onChange={(e) => handleInputChange('profile.phone', e.target.value)}
                error={!!errors.phone}
                helperText={errors.phone || "Optional - Client's phone number"}
                fullWidth
                disabled={isLoading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Account Settings
            </Typography>
            
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={(e) => handleInputChange('is_active', e.target.checked)}
                    disabled={isLoading}
                  />
                }
                label="Active Client"
              />

              {!isEditing && (
                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={createAccount}
                        onChange={(e) => setCreateAccount(e.target.checked)}
                        disabled={isLoading}
                      />
                    }
                    label="Create Account Immediately"
                  />
                  
                  {!createAccount && (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      Client will be created without an account. You can send them an invitation later to create their own password.
                    </Alert>
                  )}
                </Box>
              )}

              {(createAccount || isEditing) && (
                <TextField
                  label={isEditing ? "New Password (leave blank to keep current)" : "Password"}
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password || ''}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  error={!!errors.password}
                  helperText={errors.password || (isEditing ? "Only enter if changing password" : "Minimum 8 characters")}
                  fullWidth
                  disabled={isLoading}
                  required={createAccount && !isEditing}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          disabled={isLoading}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Box display="flex" gap={2} justifyContent="flex-end">
          {onCancel && (
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
          
          <Button
            type="submit"
            variant="contained"
            startIcon={isLoading ? <CircularProgress size={20} /> : <SaveIcon />}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : (isEditing ? 'Update Client' : 'Create Client')}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};