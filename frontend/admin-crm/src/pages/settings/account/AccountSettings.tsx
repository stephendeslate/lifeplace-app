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
import { ModernCard } from '../../../components/common/ModernCard';
import { ModernPageHeader } from '../../../components/common/ModernPageHeader';
import { tokens } from '../../../design-system';
import { glassPresets } from '../../../design-system/utils/glassmorphism';

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
      {/* Modern Header */}
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
        gradient
        glass
      />

      {/* Profile Settings */}
      <Box sx={{ mb: 4 }}>
        <ModernCard
          variant="glass"
          size="large"
          color="primary"
          animation="none"
          title="Profile Information"
          subtitle="Update your personal information and contact details"
          sx={{
            '&::before': {
              background: `linear-gradient(135deg, ${tokens.color.primary[500]}04 0%, ${tokens.color.primary[600]}03 100%)`,
            },
          }}
        >
          <Box sx={{ position: 'relative' }}>
            <Typography 
              variant="h6" 
              sx={{ 
                color: tokens.color.neutral[800],
                fontWeight: 600,
                mb: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <EditIcon sx={{ color: tokens.color.primary[600] }} />
              Personal Details
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: tokens.color.neutral[600],
                mb: 3,
              }}
            >
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
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        ...glassPresets.light,
                        borderRadius: tokens.spacing.radius.lg,
                        border: `1px solid ${tokens.color.borders.glass}`,
                        '&:hover': {
                          border: `1px solid ${tokens.color.primary[300]}`,
                        },
                        '&.Mui-focused': {
                          border: `1px solid ${tokens.color.primary[500]}`,
                          boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
                        },
                      },
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person sx={{ color: tokens.color.primary[600] }} />
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
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        ...glassPresets.light,
                        borderRadius: tokens.spacing.radius.lg,
                        border: `1px solid ${tokens.color.borders.glass}`,
                        '&:hover': {
                          border: `1px solid ${tokens.color.primary[300]}`,
                        },
                        '&.Mui-focused': {
                          border: `1px solid ${tokens.color.primary[500]}`,
                          boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
                        },
                      },
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person sx={{ color: tokens.color.primary[600] }} />
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
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      ...glassPresets.light,
                      borderRadius: tokens.spacing.radius.lg,
                      border: `1px solid ${tokens.color.borders.glass}`,
                      '&:hover': {
                        border: `1px solid ${tokens.color.primary[300]}`,
                      },
                      '&.Mui-focused': {
                        border: `1px solid ${tokens.color.primary[500]}`,
                        boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
                      },
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email sx={{ color: tokens.color.primary[600] }} />
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
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        ...glassPresets.light,
                        borderRadius: tokens.spacing.radius.lg,
                        border: `1px solid ${tokens.color.borders.glass}`,
                        '&:hover': {
                          border: `1px solid ${tokens.color.primary[300]}`,
                        },
                        '&.Mui-focused': {
                          border: `1px solid ${tokens.color.primary[500]}`,
                          boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
                        },
                      },
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Phone sx={{ color: tokens.color.primary[600] }} />
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
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        ...glassPresets.light,
                        borderRadius: tokens.spacing.radius.lg,
                        border: `1px solid ${tokens.color.borders.glass}`,
                        '&:hover': {
                          border: `1px solid ${tokens.color.primary[300]}`,
                        },
                        '&.Mui-focused': {
                          border: `1px solid ${tokens.color.primary[500]}`,
                          boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
                        },
                      },
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Business sx={{ color: tokens.color.primary[600] }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isUpdatingProfile}
                    startIcon={isUpdatingProfile ? <CircularProgress size={16} color="inherit" /> : <EditIcon />}
                    sx={{
                      background: `linear-gradient(135deg, ${tokens.color.primary[500]} 0%, ${tokens.color.primary[600]} 100%)`,
                      borderRadius: tokens.spacing.radius.full,
                      px: 4,
                      py: 1.25,
                      boxShadow: `0 8px 32px ${tokens.color.primary[500]}25`,
                      fontWeight: 600,
                      '&:hover': {
                        background: `linear-gradient(135deg, ${tokens.color.primary[600]} 0%, ${tokens.color.primary[700]} 100%)`,
                        boxShadow: `0 12px 40px ${tokens.color.primary[500]}35`,
                      },
                    }}
                  >
                    {isUpdatingProfile ? 'Updating...' : 'Update Profile'}
                  </Button>
                </Box>
              </Stack>
            </form>
          </Box>
        </ModernCard>
      </Box>

      {/* Password Settings */}
      <ModernCard
        variant="glass"
        size="large"
        color="secondary"
        animation="none"
        title="Password Security"
        subtitle="Update your password to keep your account secure"
        sx={{
          '&::before': {
            background: `linear-gradient(135deg, ${tokens.color.secondary[500]}04 0%, ${tokens.color.secondary[600]}03 100%)`,
          },
        }}
      >
        <Box sx={{ position: 'relative' }}>
          <Typography 
            variant="h6" 
            sx={{ 
              color: tokens.color.neutral[800],
              fontWeight: 600,
              mb: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <SecurityIcon sx={{ color: tokens.color.secondary[600] }} />
            Change Password
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: tokens.color.neutral[600],
              mb: 3,
            }}
          >
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
                sx={{
                  '& .MuiOutlinedInput-root': {
                    ...glassPresets.light,
                    borderRadius: tokens.spacing.radius.lg,
                    border: `1px solid ${passwordErrors.current_password 
                      ? tokens.color.error[300] 
                      : tokens.color.borders.glass}`,
                    '&:hover': {
                      border: `1px solid ${passwordErrors.current_password 
                        ? tokens.color.error[400] 
                        : tokens.color.secondary[300]}`,
                    },
                    '&.Mui-focused': {
                      border: `1px solid ${passwordErrors.current_password 
                        ? tokens.color.error[500] 
                        : tokens.color.secondary[500]}`,
                      boxShadow: `0 0 0 3px ${passwordErrors.current_password 
                        ? tokens.color.error[500] 
                        : tokens.color.secondary[500]}15`,
                    },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: passwordErrors.current_password 
                        ? tokens.color.error[600] 
                        : tokens.color.secondary[600] 
                      }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => togglePasswordVisibility('current')}
                        edge="end"
                        disabled={isChangingPassword}
                        sx={{ color: tokens.color.secondary[600] }}
                      >
                        {showPasswords.current ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Divider sx={{ my: 1, borderColor: tokens.color.borders.glass }} />

              <TextField
                fullWidth
                label="New Password"
                type={showPasswords.new ? 'text' : 'password'}
                value={passwordData.new_password}
                onChange={handlePasswordInputChange('new_password')}
                error={!!passwordErrors.new_password}
                helperText={passwordErrors.new_password || 'Must be at least 8 characters'}
                disabled={isChangingPassword}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    ...glassPresets.light,
                    borderRadius: tokens.spacing.radius.lg,
                    border: `1px solid ${passwordErrors.new_password 
                      ? tokens.color.error[300] 
                      : tokens.color.borders.glass}`,
                    '&:hover': {
                      border: `1px solid ${passwordErrors.new_password 
                        ? tokens.color.error[400] 
                        : tokens.color.secondary[300]}`,
                    },
                    '&.Mui-focused': {
                      border: `1px solid ${passwordErrors.new_password 
                        ? tokens.color.error[500] 
                        : tokens.color.secondary[500]}`,
                      boxShadow: `0 0 0 3px ${passwordErrors.new_password 
                        ? tokens.color.error[500] 
                        : tokens.color.secondary[500]}15`,
                    },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: passwordErrors.new_password 
                        ? tokens.color.error[600] 
                        : tokens.color.secondary[600] 
                      }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => togglePasswordVisibility('new')}
                        edge="end"
                        disabled={isChangingPassword}
                        sx={{ color: tokens.color.secondary[600] }}
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
                sx={{
                  '& .MuiOutlinedInput-root': {
                    ...glassPresets.light,
                    borderRadius: tokens.spacing.radius.lg,
                    border: `1px solid ${passwordErrors.confirm_password 
                      ? tokens.color.error[300] 
                      : tokens.color.borders.glass}`,
                    '&:hover': {
                      border: `1px solid ${passwordErrors.confirm_password 
                        ? tokens.color.error[400] 
                        : tokens.color.secondary[300]}`,
                    },
                    '&.Mui-focused': {
                      border: `1px solid ${passwordErrors.confirm_password 
                        ? tokens.color.error[500] 
                        : tokens.color.secondary[500]}`,
                      boxShadow: `0 0 0 3px ${passwordErrors.confirm_password 
                        ? tokens.color.error[500] 
                        : tokens.color.secondary[500]}15`,
                    },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: passwordErrors.confirm_password 
                        ? tokens.color.error[600] 
                        : tokens.color.secondary[600] 
                      }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => togglePasswordVisibility('confirm')}
                        edge="end"
                        disabled={isChangingPassword}
                        sx={{ color: tokens.color.secondary[600] }}
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
                  disabled={isChangingPassword}
                  startIcon={isChangingPassword ? <CircularProgress size={16} color="inherit" /> : <SecurityIcon />}
                  sx={{
                    background: `linear-gradient(135deg, ${tokens.color.secondary[500]} 0%, ${tokens.color.secondary[600]} 100%)`,
                    borderRadius: tokens.spacing.radius.full,
                    px: 4,
                    py: 1.25,
                    boxShadow: `0 8px 32px ${tokens.color.secondary[500]}25`,
                    fontWeight: 600,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${tokens.color.secondary[600]} 0%, ${tokens.color.secondary[700]} 100%)`,
                      boxShadow: `0 12px 40px ${tokens.color.secondary[500]}35`,
                    },
                  }}
                >
                  {isChangingPassword ? 'Updating...' : 'Update Password'}
                </Button>
              </Box>
            </Stack>
          </form>
        </Box>
      </ModernCard>
    </ModernSettingsLayout>
  );
};