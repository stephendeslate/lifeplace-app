// frontend/admin-crm/src/pages/settings/account/AccountSettings.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Divider,
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
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useLayout } from '../../../contexts/LayoutContext';
import { useAccountSettings } from '../../../hooks/useSettings';
import { SettingsCard } from '../../../components/settings/SettingsCard';
import { SettingsForm } from '../../../components/settings/SettingsForm';
import type { AccountSettingsFormData, PasswordChangeFormData } from '../../../types/settings.types';

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
      { label: 'Settings', path: '/settings' },
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
    <Box>
      {/* Profile Settings */}
      <Box sx={{ mb: 4 }}>
        <SettingsCard
          title="Profile Information"
          description="Update your personal information and contact details"
          icon={AccountCircle}
        >
          <SettingsForm
            title="Personal Details"
            description="This information will be displayed on your profile and used for account identification."
            onSubmit={handleProfileSubmit}
            isLoading={isUpdatingProfile}
          >
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
                      <Person color="action" />
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
                      <Person color="action" />
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
                    <Email color="action" />
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
                      <Phone color="action" />
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
                      <Business color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          </SettingsForm>
        </SettingsCard>
      </Box>

      {/* Password Settings */}
      <SettingsCard
        title="Password Security"
        description="Update your password to keep your account secure"
        icon={Lock}
      >
        <SettingsForm
          title="Change Password"
          description="Choose a strong password that you haven't used elsewhere."
          onSubmit={handlePasswordSubmit}
          isLoading={isChangingPassword}
          submitLabel="Update Password"
        >
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
                  <Lock color={passwordErrors.current_password ? 'error' : 'action'} />
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

          <Divider />

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
                  <Lock color={passwordErrors.new_password ? 'error' : 'action'} />
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
                  <Lock color={passwordErrors.confirm_password ? 'error' : 'action'} />
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
        </SettingsForm>
      </SettingsCard>
    </Box>
  );
};