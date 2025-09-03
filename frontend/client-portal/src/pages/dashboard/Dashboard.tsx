// frontend/client-portal/src/pages/dashboard/Dashboard.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Stack,
  Chip,
  Button,
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
  ArrowForward as ArrowForwardIcon,
  Message as MessageIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useCommunications } from '../../hooks/useCommunications';
import { CommunicationHistory } from '../../components/communications';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';

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


      {/* Main Content Tabs */}
      <AnimatedElement animation="slideUp" delay={400}>
        <GlassCard 
          variant="light" 
          intensity="subtle"
          sx={{ 
            border: `1px solid ${alpha('#fff', 0.1)}`,
            overflow: 'hidden',
          }}
        >
          <Box sx={{ 
            borderBottom: 1, 
            borderColor: alpha(theme.palette.divider, 0.3),
            backgroundColor: alpha('#fff', 0.05),
            backdropFilter: 'blur(10px)',
          }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange} 
              aria-label="dashboard tabs"
              sx={{ 
                px: 2,
                '& .MuiTab-root': {
                  color: alpha(theme.palette.text.primary, 0.7),
                  '&.Mui-selected': {
                    color: theme.palette.primary.main,
                  },
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: theme.palette.primary.main,
                  height: 3,
                  borderRadius: '3px 3px 0 0',
                },
              }}
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
              <GlassCard 
                variant="light" 
                intensity="subtle"
                sx={{ 
                  p: 3, 
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  borderRadius: 3,
                }}
              >
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
              </GlassCard>
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
                <GlassCard 
                  variant="light" 
                  intensity="subtle"
                  sx={{ 
                    p: 3, 
                    textAlign: 'center', 
                    backgroundColor: alpha(theme.palette.grey[500], 0.05),
                    border: `1px solid ${alpha(theme.palette.grey[300], 0.3)}`,
                  }}
                >
                  <HistoryIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    No Recent Activity
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Your activity and communications will appear here.
                  </Typography>
                </GlassCard>
              ) : (
                <Stack spacing={2}>
                  {recentCommunications.slice(0, 3).map((comm) => (
                    <GlassCard 
                      key={comm.id} 
                      variant="light"
                      intensity="subtle"
                      hover={true}
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        backgroundColor: !comm.is_opened && comm.channel === 'EMAIL' 
                          ? alpha(theme.palette.primary.main, 0.08) 
                          : alpha('#fff', 0.03),
                        border: `1px solid ${!comm.is_opened && comm.channel === 'EMAIL' 
                          ? alpha(theme.palette.primary.main, 0.3) 
                          : alpha('#fff', 0.1)}`,
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                          backgroundColor: alpha('#fff', 0.08),
                        },
                      }}
                      onClick={() => handleMessageClick(comm)}
                    >
                      <Box display="flex" alignItems="center" gap={2}>
                        <Box
                          sx={{
                            p: 1,
                            borderRadius: 1,
                            backgroundColor: alpha(theme.palette.info.main, 0.15),
                            backdropFilter: 'blur(10px)',
                            color: theme.palette.info.main,
                            border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
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
                            sx={{
                              backgroundColor: alpha('#fff', 0.1),
                              backdropFilter: 'blur(5px)',
                            }}
                          />
                        </Box>
                      </Box>
                    </GlassCard>
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
        </GlassCard>
      </AnimatedElement>

      {/* Communication Analytics (if available) */}
      {commAnalytics && !isLoadingAnalytics && (
        <AnimatedElement animation="fadeIn" delay={500}>
          <GlassCard 
            variant="light" 
            intensity="medium"
            sx={{ 
              mt: 4,
              border: `1px solid ${alpha('#fff', 0.1)}`,
            }}
          >
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
          </GlassCard>
        </AnimatedElement>
      )}
    </Box>
  );
};

export default Dashboard;