/**
 * ClientMessageWidget - Dashboard Messages Widget
 * 
 * Features:
 * - Recent messages preview for dashboard
 * - Quick actions (new conversation, view all)
 * - Toast notifications for new messages
 * - Responsive design for different screen sizes
 * - Integration with dashboard layout
 */

import React, { useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Badge,
  Divider,
  IconButton,
  Skeleton,
  useTheme,
} from '@mui/material';
import {
  Message as MessageIcon,
  ArrowForward as ArrowForwardIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Event as EventIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useMessagingState } from '../../../../shared/providers/MessagingProvider';
import type { MessageThread } from '../../../../shared/types/messaging.types';

export interface ClientMessageWidgetProps {
  variant?: 'dashboard' | 'compact' | 'floating';
  showPreview?: boolean;
  maxMessages?: number;
  className?: string;
  onNewMessage?: () => void;
  onViewAll?: () => void;
}

export const ClientMessageWidget: React.FC<ClientMessageWidgetProps> = ({
  variant = 'dashboard',
  showPreview = true,
  maxMessages = 3,
  className,
  onNewMessage,
  onViewAll,
}) => {
  const navigate = useNavigate();
  
  // Messaging state
  const messagingState = useMessagingState();

  // Get recent threads with unread messages
  const recentThreads = useMemo(() => {
    return messagingState.threads
      .filter(thread => thread.unread_count > 0)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, maxMessages);
  }, [messagingState.threads, maxMessages]);

  // Total unread count
  const totalUnread = useMemo(() => {
    return messagingState.threads.reduce((sum, thread) => sum + thread.unread_count, 0);
  }, [messagingState.threads]);

  // Navigation handlers
  const handleViewAll = useCallback(() => {
    if (onViewAll) {
      onViewAll();
    } else {
      navigate('/messages');
    }
  }, [navigate, onViewAll]);

  const handleNewMessage = useCallback(() => {
    if (onNewMessage) {
      onNewMessage();
    } else {
      // Navigate to messages and potentially start a new conversation
      navigate('/messages');
    }
  }, [navigate, onNewMessage]);

  const handleThreadClick = useCallback((threadId: string) => {
    navigate(`/messages/thread/${threadId}`);
  }, [navigate]);

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    return date.toLocaleDateString();
  };

  // Render based on variant
  switch (variant) {
    case 'compact':
      return (
        <CompactWidget
          className={className}
          totalUnread={totalUnread}
          recentThreads={recentThreads}
          onViewAll={handleViewAll}
          onThreadClick={handleThreadClick}
        />
      );

    case 'floating':
      return (
        <FloatingWidget
          className={className}
          totalUnread={totalUnread}
          onViewAll={handleViewAll}
          onNewMessage={handleNewMessage}
        />
      );

    case 'dashboard':
    default:
      return (
        <DashboardWidget
          className={className}
          totalUnread={totalUnread}
          recentThreads={recentThreads}
          showPreview={showPreview}
          isLoading={messagingState.isLoadingThreads}
          onViewAll={handleViewAll}
          onNewMessage={handleNewMessage}
          onThreadClick={handleThreadClick}
          formatRelativeTime={formatRelativeTime}
        />
      );
  }
};

/**
 * Dashboard Widget Variant
 */
interface DashboardWidgetProps {
  className?: string;
  totalUnread: number;
  recentThreads: MessageThread[];
  showPreview: boolean;
  isLoading: boolean;
  onViewAll: () => void;
  onNewMessage: () => void;
  onThreadClick: (threadId: string) => void;
  formatRelativeTime: (date: string) => string;
}

const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  className,
  totalUnread,
  recentThreads,
  showPreview,
  isLoading,
  onViewAll,
  onNewMessage,
  onThreadClick,
  formatRelativeTime,
}) => {

  if (isLoading) {
    return (
      <Card className={className} sx={{ height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Skeleton variant="circular" width={24} height={24} />
            <Skeleton variant="text" width="40%" />
          </Box>
          {[...Array(3)].map((_, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Skeleton variant="circular" width={32} height={32} />
              <Box sx={{ flexGrow: 1 }}>
                <Skeleton variant="text" width="80%" />
                <Skeleton variant="text" width="60%" />
              </Box>
            </Box>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={className} 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Badge badgeContent={totalUnread} color="primary" max={99}>
              <MessageIcon color="primary" />
            </Badge>
            <Typography variant="h6" component="h3">
              Messages
            </Typography>
          </Box>
          <IconButton size="small" onClick={onViewAll} aria-label="Refresh messages">
            <RefreshIcon />
          </IconButton>
        </Box>

        {/* Content */}
        {totalUnread === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <MessageIcon 
              sx={{ 
                fontSize: 48, 
                color: 'text.secondary', 
                opacity: 0.3, 
                mb: 1 
              }} 
            />
            <Typography variant="body2" color="text.secondary" gutterBottom>
              All caught up!
            </Typography>
            <Typography variant="caption" color="text.secondary">
              No new messages at the moment
            </Typography>
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {recentThreads.map((thread, index) => (
              <React.Fragment key={thread.id}>
                <ListItem
                  component="button"
                  onClick={() => onThreadClick(thread.id)}
                  sx={{
                    px: 0,
                    borderRadius: 2,
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Badge 
                      badgeContent={thread.unread_count} 
                      color="primary" 
                      max={99}
                    >
                      <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                        <EventIcon fontSize="small" />
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {thread.event_name}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block' }}
                        >
                          {new Date(thread.event_date).toLocaleDateString()}
                        </Typography>
                        {showPreview && thread.last_message && (
                          <Typography
                            variant="caption"
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              color: 'text.secondary',
                              mt: 0.5,
                            }}
                          >
                            {thread.last_message.content}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          {formatRelativeTime(thread.updated_at)}
                        </Typography>
                      </Box>
                    }
                  />
                  <ArrowForwardIcon fontSize="small" color="action" />
                </ListItem>
                {index < recentThreads.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </CardContent>

      {/* Actions */}
      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={onNewMessage}
          variant="outlined"
        >
          New Message
        </Button>
        <Button
          size="small"
          endIcon={<ArrowForwardIcon />}
          onClick={onViewAll}
          variant="text"
        >
          View All {totalUnread > 0 ? `(${totalUnread})` : ''}
        </Button>
      </CardActions>
    </Card>
  );
};

/**
 * Compact Widget Variant
 */
interface CompactWidgetProps {
  className?: string;
  totalUnread: number;
  recentThreads: MessageThread[];
  onViewAll: () => void;
  onThreadClick: (threadId: string) => void;
}

const CompactWidget: React.FC<CompactWidgetProps> = ({
  className,
  totalUnread,
  recentThreads,
  onViewAll,
  onThreadClick: _onThreadClick,
}) => (
  <Card className={className}>
    <CardContent sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Badge badgeContent={totalUnread} color="primary" max={99}>
            <MessageIcon color="primary" />
          </Badge>
          <Typography variant="subtitle2">
            Messages
          </Typography>
        </Box>
        <Button
          size="small"
          onClick={onViewAll}
          endIcon={<ArrowForwardIcon />}
        >
          View All
        </Button>
      </Box>
      
      {recentThreads.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {recentThreads.length} unread conversation{recentThreads.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
      )}
    </CardContent>
  </Card>
);

/**
 * Floating Widget Variant
 */
interface FloatingWidgetProps {
  className?: string;
  totalUnread: number;
  onViewAll: () => void;
  onNewMessage: () => void;
}

const FloatingWidget: React.FC<FloatingWidgetProps> = ({
  className,
  totalUnread,
  onViewAll,
  onNewMessage,
}) => {
  const theme = useTheme();
  
  if (totalUnread === 0) {
    return null;
  }

  return (
    <Card
      className={className}
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: theme.zIndex.fab,
        minWidth: 280,
        bgcolor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: theme.shadows[8],
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Badge badgeContent={totalUnread} color="primary" max={99}>
            <MessageIcon color="primary" />
          </Badge>
          <Typography variant="subtitle2">
            New Messages
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          You have {totalUnread} unread message{totalUnread !== 1 ? 's' : ''}
        </Typography>
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
        <Button size="small" onClick={onNewMessage}>
          Reply
        </Button>
        <Button size="small" onClick={onViewAll} variant="contained">
          View All
        </Button>
      </CardActions>
    </Card>
  );
};

export default ClientMessageWidget;