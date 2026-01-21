// frontend/admin-crm/src/pages/settings/account/AccountSettings.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Divider,
  Typography,
  Stack,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  AccountCircle,
  Email,
  Person,
  Phone,
  Business,
  Visibility,
  VisibilityOff,
  Lock,
  Security as SecurityIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useLayout } from '../../../contexts/LayoutContext';
import { useAccountSettings } from '../../../hooks/useSettings';
import type { AccountSettingsFormData, PasswordChangeFormData } from '../../../types/settings.types';

// Modern Design System imports
import { ModernSettingsLayout } from '../../../components/common/ModernPageLayout';
import { ModernPageHeader } from '../../../components/common/ModernPageHeader';

export const AccountSettings: React.FC = () => {
  const { user } = useAuth();
  const { setBreadcrumbs } = useLayout();
  const {
    updateProfile,
    changePassword,
    isUpdatingProfile,
    isChangingPassword,
  } = useAccountSettings();

  // Profile form state
  const [profileData, setProfileData] = useState<AccountSettingsFormData>({
    first_name: '',
    last_name: '',
    email: '',
    profile: {
      phone: '',
      company: '',
    },
  });

  // Password form state
  const [passwordData, setPasswordData] = useState<PasswordChangeFormData>({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [passwordErrors, setPasswordErrors] = useState<Partial<PasswordChangeFormData>>({});

  // Set breadcrumbs
  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings' },
      { label: 'Account Management' },
      { label: 'Account Settings' },
    ]);
  }, [setBreadcrumbs]);

  // Initialize profile data from user
  useEffect(() => {
    if (user) {
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        profile: {
          phone: user.profile?.phone || '',
          company: user.profile?.company || '',
        },
      });
    }
  }, [user]);

  const handleProfileInputChange = (field: keyof AccountSettingsFormData | string) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setProfileData(prev => ({
        ...prev,
        [parent]: {
          ...((prev[parent as keyof AccountSettingsFormData] || {}) as object),
          [child]: value,
        },
      }));
    } else {
      setProfileData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handlePasswordInputChange = (field: keyof PasswordChangeFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setPasswordData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field when user starts typing
    if (passwordErrors[field]) {
      setPasswordErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const validatePasswordForm = (): boolean => {
    const errors: Partial<PasswordChangeFormData> = {};

    if (!passwordData.current_password) {
      errors.current_password = 'Current password is required';
    }

    if (!passwordData.new_password) {
      errors.new_password = 'New password is required';
    } else if (passwordData.new_password.length < 8) {
      errors.new_password = 'Password must be at least 8 characters';
    }

    if (!passwordData.confirm_password) {
      errors.confirm_password = 'Please confirm your password';
    } else if (passwordData.new_password !== passwordData.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    updateProfile(profileData);
  };

  const handlePasswordSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validatePasswordForm()) {
      return;
    }

    changePassword(passwordData);
    
    // Clear form on successful submission
    setPasswordData({
      current_password: '',
      new_password: '',
      confirm_password: '',
    });
  };

  return (
    <ModernSettingsLayout>
      {/* Header */}
      <ModernPageHeader
        title="Account Settings"
        subtitle="Manage your personal information and account security"
        icon={<AccountCircle />}
        breadcrumbs={[
          { label: 'Settings' },
          { label: 'Account Management' },
          { label: 'Account Settings' },
        ]}
        size="medium"
      />

      {/* Profile Settings */}
      <Box sx={{ mb: 4, borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
        <Box sx={{ position: 'relative' }}>
          <Box display="flex" alignItems="center" gap={1.5} mb={1}>
            <EditIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Personal Details
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            This information will be displayed on your profile and used for account identification.
          </Typography>

          {isUpdatingProfile && (
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.8)' }}>
              <CircularProgress />
            </Box>
          )}

          <form onSubmit={handleProfileSubmit}>
            <Stack spacing={3}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={profileData.first_name}
                  onChange={handleProfileInputChange('first_name')}
                  disabled={isUpdatingProfile}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  fullWidth
                  label="Last Name"
                  value={profileData.last_name}
                  onChange={handleProfileInputChange('last_name')}
                  disabled={isUpdatingProfile}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={profileData.email}
                onChange={handleProfileInputChange('email')}
                disabled={isUpdatingProfile}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email color="primary" />
                    </InputAdornment>
                  ),
                }}
              />

              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={profileData.profile.phone}
                  onChange={handleProfileInputChange('profile.phone')}
                  disabled={isUpdatingProfile}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  fullWidth
                  label="Company"
                  value={profileData.profile.company}
                  onChange={handleProfileInputChange('profile.company')}
                  disabled={isUpdatingProfile}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Business color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={isUpdatingProfile}
                  startIcon={isUpdatingProfile ? <CircularProgress size={16} color="inherit" /> : <EditIcon />}
                >
                  {isUpdatingProfile ? 'Updating...' : 'Update Profile'}
                </Button>
              </Box>
            </Stack>
          </form>
        </Box>
      </Box>

      {/* Password Settings */}
      <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
        <Box sx={{ position: 'relative' }}>
          <Box display="flex" alignItems="center" gap={1.5} mb={1}>
            <SecurityIcon color="secondary" />
            <Typography variant="h6" fontWeight={600}>
              Change Password
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Choose a strong password that you haven't used elsewhere.
          </Typography>

          {isChangingPassword && (
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.8)' }}>
              <CircularProgress />
            </Box>
          )}

          <form onSubmit={handlePasswordSubmit}>
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Current Password"
                type={showPasswords.current ? 'text' : 'password'}
                value={passwordData.current_password}
                onChange={handlePasswordInputChange('current_password')}
                error={!!passwordErrors.current_password}
                helperText={passwordErrors.current_password}
                disabled={isChangingPassword}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color={passwordErrors.current_password ? 'error' : 'secondary'} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => togglePasswordVisibility('current')}
                        edge="end"
                        disabled={isChangingPassword}
                      >
                        {showPasswords.current ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Divider sx={{ my: 1 }} />

              <TextField
                fullWidth
                label="New Password"
                type={showPasswords.new ? 'text' : 'password'}
                value={passwordData.new_password}
                onChange={handlePasswordInputChange('new_password')}
                error={!!passwordErrors.new_password}
                helperText={passwordErrors.new_password || 'Must be at least 8 characters'}
                disabled={isChangingPassword}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color={passwordErrors.new_password ? 'error' : 'secondary'} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => togglePasswordVisibility('new')}
                        edge="end"
                        disabled={isChangingPassword}
                      >
                        {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Confirm New Password"
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwordData.confirm_password}
                onChange={handlePasswordInputChange('confirm_password')}
                error={!!passwordErrors.confirm_password}
                helperText={passwordErrors.confirm_password}
                disabled={isChangingPassword}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color={passwordErrors.confirm_password ? 'error' : 'secondary'} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => togglePasswordVisibility('confirm')}
                        edge="end"
                        disabled={isChangingPassword}
                      >
                        {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="secondary"
                  disabled={isChangingPassword}
                  startIcon={isChangingPassword ? <CircularProgress size={16} color="inherit" /> : <SecurityIcon />}
                >
                  {isChangingPassword ? 'Updating...' : 'Update Password'}
                </Button>
              </Box>
            </Stack>
          </form>
        </Box>
      </Box>
    </ModernSettingsLayout>
  );
};