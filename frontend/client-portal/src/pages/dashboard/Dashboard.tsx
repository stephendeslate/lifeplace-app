// frontend/client-portal/src/pages/dashboard/Dashboard.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
  Button,
  IconButton,
  Paper,
  Divider,
  CircularProgress,
  Tabs,
  Tab,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Event as EventIcon,
  History as HistoryIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon,
  Person as ProfileIcon,
  Refresh as RefreshIcon,
  ArrowForward as ArrowForwardIcon,
  Message as MessageIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useCommunications } from '../../hooks/useCommunications';
import { CommunicationHistory } from '../../components/communications';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  const { useRecords, useAnalytics, useMarkAsRead } = useCommunications();
  
  // Get recent communications
  const { data: recentCommunications = [], isLoading: isLoadingComms } = useRecords({});
  
  // Get communication analytics
  const { data: commAnalytics, isLoading: isLoadingAnalytics } = useAnalytics();

  // Mark as read mutation
  const markAsReadMutation = useMarkAsRead();

  const handleMessageClick = (comm: any) => {
    // Mark as read if it's an unread email
    if (comm.channel === 'EMAIL' && !comm.is_opened) {
      markAsReadMutation.mutate(comm.id);
    }
    
    // Navigate to messages tab or messages page
    setActiveTab(1);
  };

  // @ts-ignore
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const getDashboardStats = () => {
    const recentCommsCount = recentCommunications.length;
    const unreadCommsCount = recentCommunications.filter(comm => !comm.is_opened && comm.channel === 'EMAIL').length;
    
    return [
      {
        title: 'Recent Messages',
        value: recentCommsCount,
        icon: <EmailIcon sx={{ fontSize: 24 }} />,
        color: theme.palette.info.main,
        change: unreadCommsCount > 0 ? `${unreadCommsCount} unread` : 'All read',
      },
      {
        title: 'Profile Status',
        value: user?.profile ? 'Complete' : 'Incomplete',
        icon: <ProfileIcon sx={{ fontSize: 24 }} />,
        color: user?.profile ? theme.palette.success.main : theme.palette.warning.main,
        change: user?.profile ? 'Up to date' : 'Update needed',
      },
      {
        title: 'Account Status',
        value: user?.is_active ? 'Active' : 'Inactive',
        icon: <CheckCircleIcon sx={{ fontSize: 24 }} />,
        color: user?.is_active ? theme.palette.success.main : theme.palette.error.main,
        change: user?.is_active ? 'All systems go' : 'Contact support',
      },
      {
        title: 'Member Since',
        value: user?.date_joined ? new Date(user.date_joined).getFullYear() : 'N/A',
        icon: <CalendarIcon sx={{ fontSize: 24 }} />,
        color: theme.palette.primary.main,
        change: user?.date_joined ? new Date(user.date_joined).toLocaleDateString() : 'Unknown',
      },
    ];
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Welcome Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
          Welcome back, {user?.first_name || 'Client'}! 🌿
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your events, view communications, and stay updated with LifePlace Alfonso.
        </Typography>
      </Box>

      {/* Dashboard Stats */}
      <Box 
        sx={{ 
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          flexWrap: 'wrap',
          gap: 3,
          mb: 4
        }}
      >
        {getDashboardStats().map((stat, index) => (
          <Box key={index} sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' } }}>
            <Card
              elevation={2}
              sx={{
                height: '100%',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: theme.shadows[8],
                },
              }}
            >
              <CardContent>
                <Stack spacing={2}>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        backgroundColor: alpha(stat.color, 0.1),
                        color: stat.color,
                      }}
                    >
                      {stat.icon}
                    </Box>
                    <IconButton size="small" sx={{ color: 'text.secondary' }}>
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {stat.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: stat.color, fontWeight: 500 }}>
                      {stat.change}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      {/* Main Content Tabs */}
      <Card elevation={2}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            aria-label="dashboard tabs"
            sx={{ px: 2 }}
          >
            <Tab 
              label="Overview" 
              icon={<CalendarIcon />} 
              iconPosition="start"
              id="dashboard-tab-0"
              aria-controls="dashboard-tabpanel-0"
            />
            <Tab 
              label="Messages" 
              icon={<MessageIcon />} 
              iconPosition="start"
              id="dashboard-tab-1"
              aria-controls="dashboard-tabpanel-1"
            />
            <Tab 
              label="Events" 
              icon={<EventIcon />} 
              iconPosition="start"
              id="dashboard-tab-2"
              aria-controls="dashboard-tabpanel-2"
            />
          </Tabs>
        </Box>

        {/* Overview Tab */}
        <TabPanel value={activeTab} index={0}>
          <Stack spacing={4}>
            {/* Quick Actions */}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Quick Actions
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<EventIcon />}
                  endIcon={<ArrowForwardIcon />}
                  sx={{ flex: 1 }}
                  onClick={() => navigate('/events')}
                >
                  View My Events
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<MessageIcon />}
                  sx={{ flex: 1 }}
                  onClick={() => setActiveTab(1)}
                >
                  View Messages
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<ProfileIcon />}
                  sx={{ flex: 1 }}
                  onClick={() => navigate('/profile')}
                >
                  Update Profile
                </Button>
              </Stack>
            </Box>

            <Divider />

            {/* Welcome Message */}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Welcome to LifePlace Alfonso
              </Typography>
              <Paper elevation={0} sx={{ p: 3, bgcolor: 'primary.50', border: 1, borderColor: 'primary.200' }}>
                <Stack spacing={2}>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    Hello {user?.first_name || 'Valued Client'}! 👋
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Welcome to your client portal. Here you can manage your events, view communications, 
                    and stay connected with our team at LifePlace Alfonso. We're excited to help you 
                    create unforgettable moments for your special occasions.
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={() => navigate('/contact')}
                    >
                      Contact Us
                    </Button>
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={() => navigate('/services')}
                    >
                      View Our Services
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            </Box>

            {/* Recent Activity */}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Recent Activity
              </Typography>
              {isLoadingComms ? (
                <Box display="flex" justifyContent="center" p={4}>
                  <CircularProgress />
                </Box>
              ) : recentCommunications.length === 0 ? (
                <Paper elevation={0} sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                  <HistoryIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    No Recent Activity
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Your activity and communications will appear here.
                  </Typography>
                </Paper>
              ) : (
                <Stack spacing={2}>
                  {recentCommunications.slice(0, 3).map((comm) => (
                    <Card 
                      key={comm.id} 
                      variant="outlined"
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        backgroundColor: !comm.is_opened && comm.channel === 'EMAIL' ? alpha(theme.palette.primary.main, 0.02) : 'background.paper',
                        borderColor: !comm.is_opened && comm.channel === 'EMAIL' ? 'primary.main' : 'divider',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: theme.shadows[4],
                        },
                      }}
                      onClick={() => handleMessageClick(comm)}
                    >
                      <CardContent>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Box
                            sx={{
                              p: 1,
                              borderRadius: 1,
                              backgroundColor: alpha(theme.palette.info.main, 0.1),
                              color: theme.palette.info.main,
                            }}
                          >
                            {comm.channel === 'EMAIL' ? <EmailIcon /> : <MessageIcon />}
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography 
                              variant="body1" 
                              sx={{ 
                                fontWeight: !comm.is_opened && comm.channel === 'EMAIL' ? 600 : 500,
                              }}
                            >
                              {comm.subject || comm.template_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {comm.sent_at ? new Date(comm.sent_at).toLocaleDateString() : 'Pending'}
                            </Typography>
                          </Box>
                          <Box display="flex" alignItems="center" gap={1}>
                            {comm.is_opened ? (
                              <CheckCircleIcon color="success" />
                            ) : (
                              <ScheduleIcon color="action" />
                            )}
                            <Chip 
                              label={comm.is_opened ? 'Read' : 'Unread'}
                              size="small"
                              color={comm.is_opened ? 'success' : 'warning'}
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                  {recentCommunications.length > 3 && (
                    <Button 
                      variant="outlined" 
                      onClick={() => setActiveTab(1)}
                      sx={{ alignSelf: 'center' }}
                    >
                      View All Messages ({recentCommunications.length})
                    </Button>
                  )}
                </Stack>
              )}
            </Box>
          </Stack>
        </TabPanel>

        {/* Messages Tab */}
        <TabPanel value={activeTab} index={1}>
          <CommunicationHistory />
        </TabPanel>

        {/* Events Tab */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <EventIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
              Events Management
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
              Your event management system is coming soon! You'll be able to view, modify, and track all your bookings and events here.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
              <Button variant="contained" size="large" startIcon={<EventIcon />}>
                Create New Event
              </Button>
              <Button variant="outlined" size="large" startIcon={<CalendarIcon />}>
                View Calendar
              </Button>
            </Stack>
          </Box>
        </TabPanel>
      </Card>

      {/* Communication Analytics (if available) */}
      {commAnalytics && !isLoadingAnalytics && (
        <Card elevation={2} sx={{ mt: 4 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Communication Summary
            </Typography>
            <Box 
              sx={{ 
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 3
              }}
            >
              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  {commAnalytics.total_sent}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Messages
                </Typography>
              </Box>
              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 600, color: 'success.main' }}>
                  {commAnalytics.delivered}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Delivered
                </Typography>
              </Box>
              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 600, color: 'info.main' }}>
                  {commAnalytics.opened}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Opened
                </Typography>
              </Box>
              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 600, color: 'success.main' }}>
                  {commAnalytics.open_rate}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Open Rate
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default Dashboard;