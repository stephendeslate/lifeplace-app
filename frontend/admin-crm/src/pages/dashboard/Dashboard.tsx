// frontend/admin-crm/src/pages/dashboard/Dashboard.tsx

import React, { useEffect } from 'react';
import {
  Box,
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
  AdminPanelSettings,
  Email,
  Business,
  Schedule,
  TrendingUp,
  People,
  Security,
  Notifications,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useLayout } from '../../contexts/LayoutContext';
import { useToastActions } from '../../contexts/ToastContext';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { setBreadcrumbs } = useLayout();
  const { showSuccess } = useToastActions();

  // Set breadcrumbs for dashboard
  useEffect(() => {
    setBreadcrumbs([]);
  }, [setBreadcrumbs]);

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
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Welcome Header */}
      <Box sx={{ mb: 4 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <DashboardIcon color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h4" component="h1" fontWeight="bold">
              Welcome back, {user?.first_name || user?.email}!
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Here's what's happening with your admin dashboard today.
            </Typography>
          </Box>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<AdminPanelSettings />}
          onClick={handleWelcomeMessage}
          sx={{ mt: 1 }}
        >
          Show Welcome Message
        </Button>
      </Box>

      {/* Stats Cards */}
      <Box 
        sx={{ 
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          flexWrap: 'wrap',
          gap: 3,
          mb: 4 
        }}
      >
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' } }}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    bgcolor: 'primary.light',
                    color: 'primary.contrastText',
                  }}
                >
                  <People />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    0
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Users
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' } }}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    bgcolor: 'success.light',
                    color: 'success.contrastText',
                  }}
                >
                  <TrendingUp />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    0
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Sessions
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' } }}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    bgcolor: 'warning.light',
                    color: 'warning.contrastText',
                  }}
                >
                  <Security />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    100%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    System Health
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' } }}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    bgcolor: 'info.light',
                    color: 'info.contrastText',
                  }}
                >
                  <Notifications />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    0
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Notifications
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Main Content */}
      <Box 
        sx={{ 
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 3,
          mb: 4
        }}
      >
        {/* User Profile Card */}
        <Box sx={{ flex: 1 }}>
          <Card elevation={2}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Your Profile
              </Typography>
              
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
                  <Typography variant="h6" fontWeight="bold">
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
    </Box>
  );
};