// frontend/client-portal/src/pages/profile/Profile.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Stack,
  Button,
  TextField,
  Divider,
  Avatar,
  IconButton,
  Chip,
  Alert,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  PhotoCamera as PhotoCameraIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Support as SupportIcon,
} from '@mui/icons-material';
import { SEO } from '../../hooks/useSEO';
import { useAuth } from '../../contexts/AuthContext';
import { useToastActions } from '../../contexts/ToastContext';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import ChangePasswordDialog from '../../components/profile/ChangePasswordDialog';
import { NotificationPreferencesDialog } from '../../components/notifications';
import { useChangePassword } from '../../hooks/useChangePassword';

interface ProfileFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
}

const Profile: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { showSuccess, showError } = useToastActions();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.profile?.phone || '',
    company: user?.profile?.company || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [notificationPreferencesOpen, setNotificationPreferencesOpen] = useState(false);

  // Password change mutation
  const changePasswordMutation = useChangePassword();

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Reset form data when canceling
      setFormData({
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        email: user?.email || '',
        phone: user?.profile?.phone || '',
        company: user?.profile?.company || '',
      });
    }
    setIsEditing(!isEditing);
  };

  const handleInputChange = (field: keyof ProfileFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement API call to update profile
      // await updateProfile(formData);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call

      // Update user in context with new data
      if (user) {
        updateUser({
          ...user,
          first_name: formData.first_name,
          last_name: formData.last_name,
          profile: {
            ...user.profile,
            phone: formData.phone,
            company: formData.company,
          },
        });
      }
      showSuccess('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error updating profile:', error);
      showError('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (data: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }) => {
    await changePasswordMutation.mutateAsync(data);
    setPasswordDialogOpen(false);
  };

  if (!user) {
    return (
      <>
        <SEO
          title="Profile | LifePlace Alfonso"
          description="Your LifePlace Alfonso profile."
          noIndex={true}
        />
        <AnimatedElement animation="fadeIn">
          <GlassCard variant="light" intensity="subtle" sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              Loading profile...
            </Typography>
          </GlassCard>
        </AnimatedElement>
      </>
    );
  }

  return (
    <>
      <SEO
        title="Profile | LifePlace Alfonso"
        description="Your LifePlace Alfonso profile."
        noIndex={true}
      />
      <Box>
      {/* Header */}
      <AnimatedElement animation="slideDown" delay={100}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
            My Profile
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your personal information
          </Typography>
        </Box>
      </AnimatedElement>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
        {/* Profile Overview */}
        <Box sx={{ flex: { md: '0 0 33%' } }}>
          <AnimatedElement animation="slideRight" delay={200}>
            <GlassCard 
              variant="light" 
              intensity="medium"
              sx={{ 
                p: 3,
                textAlign: 'center',
                border: `1px solid ${alpha('#fff', 0.1)}`,
                position: 'sticky',
                top: 20,
              }}
            >
              <Box sx={{ position: 'relative', display: 'inline-block', mb: 3 }}>
                <Avatar
                  sx={{
                    width: 120,
                    height: 120,
                    fontSize: '2rem',
                    fontWeight: 600,
                    backgroundColor: theme.palette.primary.main,
                    color: 'white',
                    border: `4px solid ${alpha('#fff', 0.2)}`,
                  }}
                >
                  {getInitials(user.first_name, user.last_name)}
                </Avatar>
                <IconButton
                  size="small"
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    backgroundColor: alpha('#fff', 0.9),
                    backdropFilter: 'blur(10px)',
                    border: `2px solid ${alpha('#fff', 0.2)}`,
                    '&:hover': {
                      backgroundColor: alpha('#fff', 0.95),
                      transform: 'scale(1.1)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <PhotoCameraIcon fontSize="small" />
                </IconButton>
              </Box>
              
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                {user.first_name} {user.last_name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {user.email}
              </Typography>
              
              <Chip
                label={user.is_active ? 'Active Account' : 'Inactive'}
                color={user.is_active ? 'success' : 'warning'}
                size="small"
                sx={{
                  mb: 3,
                  backgroundColor: alpha('#fff', 0.1),
                  backdropFilter: 'blur(5px)',
                  border: `1px solid ${alpha('#fff', 0.2)}`,
                }}
              />

              <Divider sx={{ mb: 2, borderColor: alpha('#fff', 0.1) }} />

              <Stack spacing={1} sx={{ textAlign: 'left' }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <CalendarIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    Member since {user.date_joined ? new Date(user.date_joined).getFullYear() : 'N/A'}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <PersonIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    Account Status: {user.is_active ? 'Active' : 'Inactive'}
                  </Typography>
                </Box>
              </Stack>
            </GlassCard>
          </AnimatedElement>
        </Box>

        {/* Profile Details */}
        <Box sx={{ flex: { md: '1' } }}>
          <Stack spacing={4}>
            {/* Personal Information */}
            <AnimatedElement animation="slideLeft" delay={300}>
              <GlassCard 
                variant="light" 
                intensity="medium"
                sx={{ 
                  p: 3,
                  border: `1px solid ${alpha('#fff', 0.1)}`,
                }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <PersonIcon color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Personal Information
                    </Typography>
                  </Box>
                  <Button
                    startIcon={isEditing ? <CancelIcon /> : <EditIcon />}
                    onClick={handleEditToggle}
                    variant={isEditing ? 'outlined' : 'contained'}
                    size="small"
                    disabled={isLoading}
                  >
                    {isEditing ? 'Cancel' : 'Edit'}
                  </Button>
                </Box>

                <Stack spacing={3}>
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3 }}>
                    <TextField
                      label="First Name"
                      value={formData.first_name}
                      onChange={handleInputChange('first_name')}
                      disabled={!isEditing || isLoading}
                      fullWidth
                      variant="outlined"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: alpha('#fff', isEditing ? 0.1 : 0.05),
                          backdropFilter: 'blur(10px)',
                          '&:hover': {
                            backgroundColor: alpha('#fff', isEditing ? 0.15 : 0.05),
                          },
                        },
                      }}
                    />
                    <TextField
                      label="Last Name"
                      value={formData.last_name}
                      onChange={handleInputChange('last_name')}
                      disabled={!isEditing || isLoading}
                      fullWidth
                      variant="outlined"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: alpha('#fff', isEditing ? 0.1 : 0.05),
                          backdropFilter: 'blur(10px)',
                          '&:hover': {
                            backgroundColor: alpha('#fff', isEditing ? 0.15 : 0.05),
                          },
                        },
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3 }}>
                    <TextField
                      label="Email"
                      value={formData.email}
                      onChange={handleInputChange('email')}
                      disabled={true} // Email should not be editable
                      fullWidth
                      variant="outlined"
                      type="email"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: alpha('#fff', 0.05),
                          backdropFilter: 'blur(10px)',
                        },
                      }}
                    />
                    <TextField
                      label="Phone"
                      value={formData.phone}
                      onChange={handleInputChange('phone')}
                      disabled={!isEditing || isLoading}
                      fullWidth
                      variant="outlined"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: alpha('#fff', isEditing ? 0.1 : 0.05),
                          backdropFilter: 'blur(10px)',
                          '&:hover': {
                            backgroundColor: alpha('#fff', isEditing ? 0.15 : 0.05),
                          },
                        },
                      }}
                    />
                  </Box>
                  <TextField
                    label="Company"
                    value={formData.company}
                    onChange={handleInputChange('company')}
                    disabled={!isEditing || isLoading}
                    fullWidth
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: alpha('#fff', isEditing ? 0.1 : 0.05),
                        backdropFilter: 'blur(10px)',
                        '&:hover': {
                          backgroundColor: alpha('#fff', isEditing ? 0.15 : 0.05),
                        },
                      },
                    }}
                  />
                </Stack>

                {isEditing && (
                  <Box mt={3} display="flex" justifyContent="flex-end" gap={2}>
                    <Button
                      variant="outlined"
                      onClick={handleEditToggle}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSave}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </Box>
                )}
              </GlassCard>
            </AnimatedElement>


            {/* Quick Actions */}
            <AnimatedElement animation="slideLeft" delay={500}>
              <GlassCard 
                variant="light" 
                intensity="medium"
                sx={{ 
                  p: 3,
                  border: `1px solid ${alpha('#fff', 0.1)}`,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  Quick Actions
                </Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button
                    variant="outlined"
                    startIcon={<SecurityIcon />}
                    fullWidth
                    onClick={() => setPasswordDialogOpen(true)}
                    sx={{
                      backgroundColor: alpha('#fff', 0.1),
                      backdropFilter: 'blur(10px)',
                      border: `1px solid ${alpha('#fff', 0.2)}`,
                      '&:hover': {
                        backgroundColor: alpha('#fff', 0.15),
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Change Password
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<NotificationsIcon />}
                    fullWidth
                    onClick={() => setNotificationPreferencesOpen(true)}
                    sx={{
                      backgroundColor: alpha('#fff', 0.1),
                      backdropFilter: 'blur(10px)',
                      border: `1px solid ${alpha('#fff', 0.2)}`,
                      '&:hover': {
                        backgroundColor: alpha('#fff', 0.15),
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Notification Settings
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<SupportIcon />}
                    fullWidth
                    onClick={() => navigate('/support')}
                    sx={{
                      backgroundColor: alpha('#fff', 0.1),
                      backdropFilter: 'blur(10px)',
                      border: `1px solid ${alpha('#fff', 0.2)}`,
                      '&:hover': {
                        backgroundColor: alpha('#fff', 0.15),
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Contact Support
                  </Button>
                </Stack>
              </GlassCard>
            </AnimatedElement>
          </Stack>
        </Box>
      </Box>

      {/* Success/Error Messages */}
      {isLoading && (
        <Box mt={2}>
          <Alert
            severity="info"
            sx={{
              backgroundColor: alpha(theme.palette.info.main, 0.1),
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
            }}
          >
            Updating your profile...
          </Alert>
        </Box>
      )}

      {/* Change Password Dialog */}
      <ChangePasswordDialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
        onSubmit={handleChangePassword}
        isLoading={changePasswordMutation.isPending}
      />

      {/* Notification Preferences Dialog */}
      <NotificationPreferencesDialog
        open={notificationPreferencesOpen}
        onClose={() => setNotificationPreferencesOpen(false)}
      />
      </Box>
    </>
  );
};

export default Profile;