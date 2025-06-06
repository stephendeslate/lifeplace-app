// frontend/admin-crm/src/pages/dashboard/Dashboard.tsx

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  Stack,
  Divider,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  ExitToApp,
  AdminPanelSettings,
  Email,
  Business,
  Schedule,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useToastActions } from '../../contexts/ToastContext';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { showSuccess, showInfo } = useToastActions();

  const handleLogout = () => {
    logout();
    showInfo('Logged Out', 'You have been successfully logged out.');
  };

  const handleWelcomeMessage = () => {
    showSuccess('Welcome!', `Hello ${user?.first_name || user?.email}! Ready to manage LifePlace.`);
  };

  const getInitials = (firstName?: string, lastName?: string, email?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) {
      return firstName[0].toUpperCase();
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'grey.50',
        display: 'flex',
        justifyContent: 'center',
        py: 4,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 1200,
          px: { xs: 2, sm: 3, md: 4 },
        }}
      >
        <Stack spacing={4}>
          {/* Header */}
          <Paper
            elevation={2}
            sx={{
              p: 3,
              background: (theme) =>
                `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              color: 'white',
            }}
          >
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              flexWrap="wrap"
              gap={2}
            >
              <Box display="flex" alignItems="center" gap={2}>
                <DashboardIcon sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" component="h1" fontWeight="bold">
                    LifePlace Admin Dashboard
                  </Typography>
                  <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                    Welcome back, {user?.first_name || user?.email}!
                  </Typography>
                </Box>
              </Box>
              
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<AdminPanelSettings />}
                  onClick={handleWelcomeMessage}
                  sx={{ borderColor: 'white', color: 'white' }}
                >
                  Welcome
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<ExitToApp />}
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </Stack>
            </Box>
          </Paper>

          {/* User Info Section */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 3,
            }}
          >
            {/* User Profile Card */}
            <Box sx={{ flex: 1 }}>
              <Card elevation={2}>
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" gap={2} mb={3}>
                    <Avatar
                      sx={{
                        width: 64,
                        height: 64,
                        backgroundColor: 'primary.main',
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                      }}
                    >
                      {getInitials(user?.first_name, user?.last_name, user?.email)}
                    </Avatar>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">
                        {user?.first_name || user?.last_name 
                          ? `${user?.first_name} ${user?.last_name}`.trim()
                          : user?.email}
                      </Typography>
                      <Chip
                        icon={<AdminPanelSettings />}
                        label={user?.role || 'ADMIN'}
                        color="primary"
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    </Box>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Stack spacing={2}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Email color="action" />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Email
                        </Typography>
                        <Typography variant="body1">
                          {user?.email || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                    
                    {user?.profile?.company && (
                      <Box display="flex" alignItems="center" gap={2}>
                        <Business color="action" />
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Company
                          </Typography>
                          <Typography variant="body1">
                            {user.profile.company}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                    
                    <Box display="flex" alignItems="center" gap={2}>
                      <Schedule color="action" />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Member Since
                        </Typography>
                        <Typography variant="body1">
                          {formatDate(user?.date_joined)}
                        </Typography>
                      </Box>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Box>

            {/* System Status Card */}
            <Box sx={{ flex: 1 }}>
              <Card elevation={2}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    System Status
                  </Typography>
                  
                  <Stack spacing={2}>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      p={2}
                      sx={{
                        backgroundColor: 'success.light',
                        borderRadius: 1,
                        color: 'success.contrastText',
                      }}
                    >
                      <Typography variant="body2" fontWeight="medium">
                        Authentication
                      </Typography>
                      <Chip
                        label="Connected"
                        size="small"
                        color="success"
                        variant="filled"
                      />
                    </Box>
                    
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      p={2}
                      sx={{
                        backgroundColor: 'info.light',
                        borderRadius: 1,
                        color: 'info.contrastText',
                      }}
                    >
                      <Typography variant="body2" fontWeight="medium">
                        Admin Access
                      </Typography>
                      <Chip
                        label="Active"
                        size="small"
                        color="info"
                        variant="filled"
                      />
                    </Box>
                    
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      p={2}
                      sx={{
                        backgroundColor: 'warning.light',
                        borderRadius: 1,
                        color: 'warning.contrastText',
                      }}
                    >
                      <Typography variant="body2" fontWeight="medium">
                        Dashboard
                      </Typography>
                      <Chip
                        label="In Development"
                        size="small"
                        color="warning"
                        variant="filled"
                      />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          </Box>

          {/* Placeholder Content */}
          <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom>
              🚀 Dashboard Coming Soon
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              The full admin dashboard is currently under development. 
              You have successfully logged in with admin privileges.
            </Typography>
            <Typography variant="body2" color="text.disabled">
              Future features will include user management, system analytics, 
              and administrative tools.
            </Typography>
          </Paper>
        </Stack>
      </Box>
    </Box>
  );
};