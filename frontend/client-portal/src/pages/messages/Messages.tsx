// frontend/client-portal/src/pages/messages/Messages.tsx

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Stack,
  Chip,
  IconButton,
  InputAdornment,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Badge,
  Button,
  Tabs,
  Tab,
  useTheme,
  alpha,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Email as EmailIcon,
  Sms as SmsIcon,
  Inbox as InboxIcon,
  Send as SentIcon,
  Drafts as DraftsIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CheckCircle as ReadIcon,
  Add as ComposeIcon,
} from '@mui/icons-material';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import { CommunicationHistory } from '../../components/communications';
import SendMessageDialog from '../../components/communications/SendMessageDialog';
import { useCommunications } from '../../hooks/useCommunications';
import type { CommunicationFilters } from '../../types/communications.types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`messages-tabpanel-${index}`}
      aria-labelledby={`messages-tab-${index}`}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
};

const Messages: React.FC = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageType, setMessageType] = useState<'all' | 'email' | 'sms'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'DELIVERED' | 'SENT' | 'PENDING'>('all');
  const [composeDialogOpen, setComposeDialogOpen] = useState(false);
  
  const { useRecords, useAnalytics } = useCommunications();
  
  // Build filters based on UI state
  const filters: CommunicationFilters = useMemo(() => {
    const baseFilters: CommunicationFilters = {};
    
    if (messageType !== 'all') {
      baseFilters.channel = messageType.toUpperCase() as 'EMAIL' | 'SMS';
    }
    
    if (statusFilter !== 'all') {
      baseFilters.delivery_status = statusFilter;
    }
    
    // Add search functionality if API supports it
    if (searchTerm) {
      baseFilters.search = searchTerm;
    }
    
    // Tab-specific filters
    if (activeTab === 1) { // Sent
      baseFilters.status = 'sent';
    } else if (activeTab === 2) { // Drafts
      baseFilters.status = 'draft';
    }
    
    return baseFilters;
  }, [messageType, statusFilter, searchTerm, activeTab]);
  
  const { 
    data: records = [], 
    isLoading, 
    refetch,
    isRefetching 
  } = useRecords(filters);
  
  const { data: analytics } = useAnalytics();
  
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  const handleRefresh = () => {
    refetch();
  };

  const handleComposeMessage = () => {
    setComposeDialogOpen(true);
  };

  const handleComposeComplete = (success: boolean, message?: string) => {
    setComposeDialogOpen(false);
    if (success) {
      // Refresh messages to show the newly sent message
      refetch();
      // You could show a toast notification here
      console.log('Message sent successfully:', message);
    }
  };
  
  // Calculate stats
  const unreadCount = useMemo(() => {
    if (!records) return 0;
    return records.filter(r => r.channel === 'EMAIL' && !r.is_opened).length;
  }, [records]);
  
  const totalMessages = records?.length || 0;
  
  return (
    <Box sx={{ width: '100%', position: 'relative' }}>
      {/* Subtle gradient overlay for depth */}
      <Box
        sx={{
          position: 'absolute',
          top: -100,
          left: -100,
          right: -100,
          height: 300,
          background: `radial-gradient(circle at 50% 0%, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 70%)`,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Header Section */}
      <AnimatedElement animation="slideDown" delay={100}>
        <Stack 
          direction={{ xs: 'column', md: 'row' }} 
          justifyContent="space-between" 
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={3}
          sx={{ mb: 4, position: 'relative', zIndex: 1 }}
        >
          <Box>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700, 
                mb: 1, 
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Messages & Communications
            </Typography>
            <Typography variant="body1" color="text.secondary">
              View and manage all your communications
            </Typography>
          </Box>
          
          <Stack direction="row" spacing={2} alignItems="center">
            {/* Quick Stats */}
            <AnimatedElement animation="slideLeft" delay={200}>
              <GlassCard
                variant="light"
                intensity="medium"
                sx={{
                  px: 2,
                  py: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  border: `1px solid ${alpha('#fff', 0.1)}`,
                }}
              >
                <Badge 
                  badgeContent={unreadCount} 
                  color="error"
                  sx={{
                    '& .MuiBadge-badge': {
                      backgroundColor: theme.palette.error.main,
                      color: 'white',
                      fontWeight: 600,
                    },
                  }}
                >
                  <InboxIcon color="primary" />
                </Badge>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Unread
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1 }}>
                    {unreadCount}
                  </Typography>
                </Box>
              </GlassCard>
            </AnimatedElement>
            
            <AnimatedElement animation="slideLeft" delay={250}>
              <GlassCard
                variant="light"
                intensity="medium"
                sx={{
                  px: 2,
                  py: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  border: `1px solid ${alpha('#fff', 0.1)}`,
                }}
              >
                <EmailIcon color="primary" />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Total
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1 }}>
                    {totalMessages}
                  </Typography>
                </Box>
              </GlassCard>
            </AnimatedElement>
            
            {/* Compose Message Button */}
            <Tooltip title="Compose new message">
              <Button
                variant="contained"
                startIcon={<ComposeIcon />}
                onClick={handleComposeMessage}
                sx={{
                  backgroundColor: theme.palette.primary.main,
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${alpha('#fff', 0.1)}`,
                  '&:hover': {
                    backgroundColor: theme.palette.primary.dark,
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.3s ease',
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Compose
              </Button>
            </Tooltip>

            {/* Refresh Button */}
            <Tooltip title="Refresh messages">
              <IconButton
                onClick={handleRefresh}
                disabled={isRefetching}
                sx={{
                  backgroundColor: alpha('#fff', 0.1),
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${alpha('#fff', 0.1)}`,
                  '&:hover': {
                    backgroundColor: alpha('#fff', 0.15),
                    transform: 'rotate(90deg)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                {isRefetching ? (
                  <CircularProgress size={24} />
                ) : (
                  <RefreshIcon />
                )}
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </AnimatedElement>

      {/* Search and Filters Bar */}
      <AnimatedElement animation="slideUp" delay={300}>
        <GlassCard
          variant="light"
          intensity="strong"
          sx={{
            mb: 3,
            p: 3,
            border: `1px solid ${alpha('#fff', 0.1)}`,
            backgroundColor: alpha('#fff', 0.08),
            backdropFilter: 'blur(20px)',
          }}
        >
          <Stack spacing={3}>
            {/* Search Field */}
            <TextField
              fullWidth
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: alpha('#fff', 0.05),
                  backdropFilter: 'blur(10px)',
                  '&:hover': {
                    backgroundColor: alpha('#fff', 0.08),
                  },
                  '&.Mui-focused': {
                    backgroundColor: alpha('#fff', 0.1),
                  },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: alpha(theme.palette.text.primary, 0.5) }} />
                  </InputAdornment>
                ),
              }}
            />
            
            {/* Filter Controls */}
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={2}
              alignItems={{ sm: 'center' }}
              justifyContent="space-between"
            >
              {/* Message Type Filter */}
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Type:
                </Typography>
                <ToggleButtonGroup
                  value={messageType}
                  exclusive
                  onChange={(_, value) => value && setMessageType(value)}
                  size="small"
                  sx={{
                    '& .MuiToggleButton-root': {
                      backgroundColor: alpha('#fff', 0.05),
                      backdropFilter: 'blur(10px)',
                      border: `1px solid ${alpha('#fff', 0.1)}`,
                      '&.Mui-selected': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.2),
                        color: theme.palette.primary.main,
                        fontWeight: 600,
                      },
                      '&:hover': {
                        backgroundColor: alpha('#fff', 0.1),
                      },
                    },
                  }}
                >
                  <ToggleButton value="all">
                    All
                  </ToggleButton>
                  <ToggleButton value="email">
                    <EmailIcon sx={{ fontSize: 18, mr: 0.5 }} />
                    Email
                  </ToggleButton>
                  <ToggleButton value="sms">
                    <SmsIcon sx={{ fontSize: 18, mr: 0.5 }} />
                    SMS
                  </ToggleButton>
                </ToggleButtonGroup>
              </Stack>
              
              {/* Delivery Status Filter */}
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Status:
                </Typography>
                <ToggleButtonGroup
                  value={statusFilter}
                  exclusive
                  onChange={(_, value) => value && setStatusFilter(value)}
                  size="small"
                  sx={{
                    '& .MuiToggleButton-root': {
                      backgroundColor: alpha('#fff', 0.05),
                      backdropFilter: 'blur(10px)',
                      border: `1px solid ${alpha('#fff', 0.1)}`,
                      '&.Mui-selected': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.2),
                        color: theme.palette.primary.main,
                        fontWeight: 600,
                      },
                      '&:hover': {
                        backgroundColor: alpha('#fff', 0.1),
                      },
                    },
                  }}
                >
                  <ToggleButton value="all">
                    All
                  </ToggleButton>
                  <ToggleButton value="DELIVERED">
                    <ReadIcon sx={{ fontSize: 18, mr: 0.5 }} />
                    Delivered
                  </ToggleButton>
                  <ToggleButton value="SENT">
                    <SentIcon sx={{ fontSize: 18, mr: 0.5 }} />
                    Sent
                  </ToggleButton>
                </ToggleButtonGroup>
              </Stack>
            </Stack>
            
            {/* Active Filters Display */}
            {(searchTerm || messageType !== 'all' || statusFilter !== 'all') && (
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="body2" color="text.secondary">
                  Active filters:
                </Typography>
                {searchTerm && (
                  <Chip
                    label={`Search: "${searchTerm}"`}
                    size="small"
                    onDelete={() => setSearchTerm('')}
                    sx={{
                      backgroundColor: alpha('#fff', 0.1),
                      backdropFilter: 'blur(5px)',
                      '& .MuiChip-deleteIcon': {
                        color: alpha(theme.palette.text.primary, 0.5),
                        '&:hover': {
                          color: theme.palette.text.primary,
                        },
                      },
                    }}
                  />
                )}
                {messageType !== 'all' && (
                  <Chip
                    label={`Type: ${messageType}`}
                    size="small"
                    onDelete={() => setMessageType('all')}
                    sx={{
                      backgroundColor: alpha('#fff', 0.1),
                      backdropFilter: 'blur(5px)',
                    }}
                  />
                )}
                {statusFilter !== 'all' && (
                  <Chip
                    label={`Status: ${statusFilter.toLowerCase()}`}
                    size="small"
                    onDelete={() => setStatusFilter('all')}
                    sx={{
                      backgroundColor: alpha('#fff', 0.1),
                      backdropFilter: 'blur(5px)',
                    }}
                  />
                )}
                <Button
                  size="small"
                  onClick={() => {
                    setSearchTerm('');
                    setMessageType('all');
                    setStatusFilter('all');
                  }}
                  sx={{
                    color: theme.palette.primary.main,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    },
                  }}
                >
                  Clear All
                </Button>
              </Stack>
            )}
          </Stack>
        </GlassCard>
      </AnimatedElement>

      {/* Main Content with Tabs */}
      <AnimatedElement animation="slideUp" delay={400}>
        <GlassCard
          variant="light"
          intensity="medium"
          sx={{
            border: `1px solid ${alpha('#fff', 0.1)}`,
            overflow: 'hidden',
            backgroundColor: alpha('#fff', 0.05),
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Tab Navigation */}
          <Box sx={{ 
            borderBottom: 1, 
            borderColor: alpha(theme.palette.divider, 0.2),
            backgroundColor: alpha('#fff', 0.03),
            backdropFilter: 'blur(10px)',
          }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              sx={{ 
                px: 3,
                '& .MuiTab-root': {
                  color: alpha(theme.palette.text.primary, 0.7),
                  fontWeight: 500,
                  '&.Mui-selected': {
                    color: theme.palette.primary.main,
                    fontWeight: 600,
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
                label="Inbox" 
                icon={<InboxIcon />} 
                iconPosition="start"
                id="messages-tab-0"
              />
              <Tab 
                label="Sent" 
                icon={<SentIcon />} 
                iconPosition="start"
                id="messages-tab-1"
              />
              <Tab 
                label="Drafts" 
                icon={<DraftsIcon />} 
                iconPosition="start"
                id="messages-tab-2"
              />
            </Tabs>
          </Box>

          {/* Tab Content */}
          <Box sx={{ p: { xs: 2, md: 3 } }}>
            {/* Loading State */}
            {isLoading ? (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                py: 8,
              }}>
                <Stack spacing={2} alignItems="center">
                  <CircularProgress size={40} />
                  <Typography variant="body1" color="text.secondary">
                    Loading messages...
                  </Typography>
                </Stack>
              </Box>
            ) : (
              <>
                <TabPanel value={activeTab} index={0}>
                  <CommunicationHistory />
                </TabPanel>
                
                <TabPanel value={activeTab} index={1}>
                  <CommunicationHistory />
                </TabPanel>
                
                <TabPanel value={activeTab} index={2}>
                  <Box sx={{ py: 8, textAlign: 'center' }}>
                    <DraftsIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No drafts available
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Draft messages will appear here when saved
                    </Typography>
                  </Box>
                </TabPanel>
              </>
            )}
          </Box>
        </GlassCard>
      </AnimatedElement>

      {/* Analytics Summary (if available) */}
      {analytics && (
        <AnimatedElement animation="slideUp" delay={500}>
          <GlassCard
            variant="light"
            intensity="subtle"
            sx={{
              mt: 3,
              p: 3,
              border: `1px solid ${alpha('#fff', 0.1)}`,
              backgroundColor: alpha(theme.palette.info.main, 0.05),
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Communication Insights
            </Typography>
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={3}
              divider={
                <Box sx={{ 
                  width: { xs: '100%', sm: 1 },
                  height: { xs: 1, sm: 40 },
                  backgroundColor: alpha('#fff', 0.1),
                }} />
              }
            >
              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {analytics.total_sent || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Sent
                </Typography>
              </Box>
              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                  {analytics.delivered || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Delivered
                </Typography>
              </Box>
              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                  {analytics.open_rate || 0}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Open Rate
                </Typography>
              </Box>
            </Stack>
          </GlassCard>
        </AnimatedElement>
      )}

      {/* Send Message Dialog */}
      <SendMessageDialog
        open={composeDialogOpen}
        onClose={() => setComposeDialogOpen(false)}
        onSendComplete={handleComposeComplete}
      />
    </Box>
  );
};

export default Messages;