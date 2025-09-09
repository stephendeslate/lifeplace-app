import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Stack,
  Card,
  Chip,
  useTheme,
  useMediaQuery,
  Fade,
  IconButton,
  Tooltip,
  Button,
} from '@mui/material';
import {
  Message as MessageIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  TrendingUp as TrendingIcon,
  Notifications as NotificationIcon,
} from '@mui/icons-material';
import { useLayout } from '../../contexts/LayoutContext';
import { useMessages } from '../../hooks/useMessages';
import { MessageList } from '../../components/messaging/admin/MessageList';
import { MessageThread } from '../../components/messaging/admin/MessageThread';
import type { MessageThread as MessageThreadType, MessageFilters } from '../../types/messaging.types';

export const Messages: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { setBreadcrumbs } = useLayout();
  
  const [selectedThread, setSelectedThread] = useState<MessageThreadType | null>(null);
  const [filters, setFilters] = useState<MessageFilters>({});
  const [showMobileThread, setShowMobileThread] = useState(false);

  const { useUnreadCount } = useMessages();
  const { data: unreadCount = { count: 0 } } = useUnreadCount();

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Messages' },
    ]);
  }, [setBreadcrumbs]);

  const handleThreadSelect = (thread: MessageThreadType) => {
    setSelectedThread(thread);
    if (isMobile) {
      setShowMobileThread(true);
    }
  };

  const handleBackFromThread = () => {
    setShowMobileThread(false);
    setSelectedThread(null);
  };

  const getFilterSummary = () => {
    const activeFilters = [];
    if (filters.priority) activeFilters.push(`Priority: ${filters.priority}`);
    if (filters.status) activeFilters.push(`Status: ${filters.status}`);
    if (filters.client_id) activeFilters.push(`Client Filter`);
    if (filters.event_id) activeFilters.push(`Event Filter`);
    return activeFilters;
  };

  // Mobile View
  if (isMobile) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {showMobileThread && selectedThread ? (
          <MessageThread
            thread={selectedThread}
            onBack={handleBackFromThread}
            isMobile={true}
          />
        ) : (
          <>
            {/* Mobile Header */}
            <Box
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                p: 2,
                borderBottom: 1,
                borderColor: 'divider',
                flexShrink: 0,
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center" gap={2}>
                  <MessageIcon sx={{ color: theme.palette.primary.main }} />
                  <Typography variant="h5" fontWeight="bold">
                    Messages
                  </Typography>
                  {unreadCount.count > 0 && (
                    <Chip
                      label={unreadCount.count}
                      size="small"
                      color="primary"
                      sx={{ height: 24 }}
                    />
                  )}
                </Box>
                
                <IconButton size="small">
                  <FilterIcon />
                </IconButton>
              </Stack>
            </Box>

            {/* Mobile Message List */}
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <MessageList
                onThreadSelect={handleThreadSelect}
                selectedThreadId={selectedThread?.id}
                filters={filters}
                onFiltersChange={setFilters}
              />
            </Box>
          </>
        )}
      </Box>
    );
  }

  // Desktop View
  return (
    <Box sx={{ 
      minHeight: '100vh',
      position: 'relative',
      background: `
        radial-gradient(circle at 20% 20%, rgba(25, 118, 210, 0.04) 0%, transparent 50%),
        radial-gradient(circle at 80% 80%, rgba(33, 150, 243, 0.04) 0%, transparent 50%)
      `,
    }}>
      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
        {/* Enhanced Header */}
        <Fade in={true} timeout={500}>
          <Box sx={{ mb: 4 }}>
            <Card
              sx={{
                p: { xs: 3, md: 4 },
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                position: 'relative',
                overflow: 'visible',
              }}
            >
              <Stack 
                direction="row" 
                alignItems="center" 
                justifyContent="space-between"
                sx={{ mb: 2 }}
              >
                <Box display="flex" alignItems="center" gap={3}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 8px 24px rgba(25, 118, 210, 0.15)',
                    }}
                  >
                    <MessageIcon sx={{ color: 'white', fontSize: 28 }} />
                  </Box>
                  
                  <Box>
                    <Typography 
                      variant="h3" 
                      component="h1" 
                      sx={{ 
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        color: 'transparent',
                        mb: 0.5,
                        lineHeight: 1.2,
                      }}
                    >
                      Messages
                    </Typography>
                    
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        color: 'rgba(0, 0, 0, 0.6)',
                        fontWeight: 500,
                      }}
                    >
                      Manage client conversations and event communications
                    </Typography>
                  </Box>
                </Box>

                <Stack direction="row" spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {unreadCount.count > 0 && (
                      <Chip
                        icon={<NotificationIcon />}
                        label={`${unreadCount.count} unread`}
                        color="error"
                        sx={{
                          backgroundColor: 'rgba(255, 255, 255, 0.8)',
                          backdropFilter: 'blur(10px)',
                          fontWeight: 600,
                          height: 36,
                        }}
                      />
                    )}
                    
                    <Chip
                      icon={<TrendingIcon />}
                      label="Active Conversations"
                      color="primary"
                      variant="outlined"
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(10px)',
                        fontWeight: 600,
                        height: 36,
                      }}
                    />
                  </Box>

                  <Tooltip title="Refresh messages">
                    <IconButton
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '50%',
                        width: 48,
                        height: 48,
                        color: '#1976d2',
                        
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          transform: 'rotate(180deg)',
                        }
                      }}
                    >
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>

              {/* Filter Summary */}
              {getFilterSummary().length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                      Active filters:
                    </Typography>
                    {getFilterSummary().map((filter, index) => (
                      <Chip
                        key={index}
                        label={filter}
                        size="small"
                        onDelete={() => {
                          // Clear specific filter
                          setFilters(prev => {
                            const newFilters = { ...prev };
                            if (filter.includes('Priority')) delete newFilters.priority;
                            if (filter.includes('Status')) delete newFilters.status;
                            if (filter.includes('Client')) delete newFilters.client_id;
                            if (filter.includes('Event')) delete newFilters.event_id;
                            return newFilters;
                          });
                        }}
                        sx={{
                          backgroundColor: 'rgba(255, 255, 255, 0.8)',
                          backdropFilter: 'blur(10px)',
                          height: 24,
                        }}
                      />
                    ))}
                    <Button
                      size="small"
                      onClick={() => setFilters({})}
                      sx={{ 
                        textTransform: 'none',
                        color: 'rgba(0, 0, 0, 0.6)',
                      }}
                    >
                      Clear all
                    </Button>
                  </Stack>
                </Box>
              )}
            </Card>
          </Box>
        </Fade>

        {/* Main Content */}
        <Fade in={true} timeout={700}>
          <Box sx={{ height: 'calc(100vh - 200px)' }}>
            <Card
              sx={{
                height: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                overflow: 'hidden',
                display: 'flex',
              }}
            >
              {/* Thread List */}
              <Box
                sx={{
                  width: selectedThread ? 400 : '100%',
                  borderRight: selectedThread ? 1 : 0,
                  borderColor: 'divider',
                  transition: 'width 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <MessageList
                  onThreadSelect={handleThreadSelect}
                  selectedThreadId={selectedThread?.id}
                  filters={filters}
                  onFiltersChange={setFilters}
                />
              </Box>

              {/* Thread View */}
              {selectedThread && (
                <Box sx={{ flex: 1, position: 'relative' }}>
                  <MessageThread
                    thread={selectedThread}
                    isMobile={false}
                  />
                </Box>
              )}

              {/* Empty State */}
              {!selectedThread && (
                <Box
                  sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 4,
                  }}
                >
                  <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
                    <MessageIcon sx={{ fontSize: 80, color: 'grey.300', mb: 2 }} />
                    <Typography variant="h5" gutterBottom>
                      Select a conversation
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Choose a conversation from the list to start messaging with your clients
                    </Typography>
                  </Box>
                </Box>
              )}
            </Card>
          </Box>
        </Fade>
      </Container>
    </Box>
  );
};