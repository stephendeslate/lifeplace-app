/**
 * MessageInterface - Modern Chat Interface Component
 * 
 * Features:
 * - Clean, professional Material-UI design
 * - Real-time message updates
 * - Thread management and navigation
 * - Responsive layout for mobile and desktop
 * - Accessibility compliance (WCAG 2.1)
 * - Performance optimized with virtualization
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Toolbar,
  Typography,
  IconButton,
  Badge,
  useTheme,
  useMediaQuery,
  Divider,
  Tooltip,
  Alert,
  Slide,
  Fade
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Info as InfoIcon
} from '@mui/icons-material';

import { ConversationThread } from './ConversationThread';
import { MessageComposer } from './MessageComposer';
import { ThreadList } from './ThreadList';
import { RealTimeIndicators } from './RealTimeIndicators';
import { ConnectionStatus } from './ConnectionStatus';

import {
  useMessagingContext,
  useWebSocketConnectionState
} from '@shared';
import {
  useRealTimeUpdates
} from '../../services';
import type {
  MessageThread
} from '../../types/messaging.types';

export interface MessageInterfaceProps {
  // Configuration
  userRole?: 'CLIENT' | 'ADMIN';
  enableThreadList?: boolean;
  enableRealTime?: boolean;
  enableSearch?: boolean;
  enableFileUploads?: boolean;
  
  // Layout
  height?: string | number;
  width?: string | number;
  showHeader?: boolean;
  showFooter?: boolean;
  
  // Initial state
  initialThreadId?: string;
  initialFilters?: Record<string, any>;
  
  // Event handlers
  onThreadSelect?: (thread: MessageThread | null) => void;
  onMessageSent?: (message: any) => void;
  onError?: (error: Error) => void;
  
  // Customization
  title?: string;
  subtitle?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export const MessageInterface: React.FC<MessageInterfaceProps> = ({
  userRole = 'CLIENT',
  enableThreadList = true,
  enableRealTime = true,
  enableSearch = true,
  enableFileUploads = true,
  height = '100vh',
  width = '100%',
  showHeader = true,
  showFooter = true,
  initialThreadId,
  initialFilters = {},
  onThreadSelect,
  onMessageSent,
  onError,
  title = 'Messages',
  subtitle,
  primaryColor
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  // State
  const [showThreadList, setShowThreadList] = useState(!isMobile);
  const [showThreadInfo, setShowThreadInfo] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<Error | null>(null);

  // Use shared messaging context instead of creating a separate instance
  const { state, actions } = useMessagingContext();
  const isReady = true; // Context is always ready when component renders

  // Real-time updates
  const { state: realTimeState } = useRealTimeUpdates({
    enabled: enableRealTime,
    threadId: state.selectedThreadId || undefined,
    onMessage: (message) => {
      // Handle new message notifications
      if (onMessageSent) {
        onMessageSent(message);
      }
    },
    onError: (error: string | Error) => {
      setError(error instanceof Error ? error : new Error(error));
    }
  });

  const { isConnected } = useWebSocketConnectionState();

  // Layout calculations
  const layoutConfig = useMemo(() => {
    if (isMobile) {
      return {
        threadListWidth: '100%',
        conversationWidth: '100%',
        showBothPanes: false,
        sidebarCollapsed: !showThreadList,
      };
    }
    
    if (isTablet) {
      return {
        threadListWidth: showThreadList ? '320px' : '0px',
        conversationWidth: showThreadList ? 'calc(100% - 320px)' : '100%',
        showBothPanes: true,
        sidebarCollapsed: !showThreadList,
      };
    }
    
    return {
      threadListWidth: showThreadList ? '360px' : '72px',
      conversationWidth: showThreadList ? 'calc(100% - 360px)' : 'calc(100% - 72px)',
      showBothPanes: true,
      sidebarCollapsed: !showThreadList,
    };
  }, [isMobile, isTablet, showThreadList]);

  // Event handlers
  const handleThreadSelect = useCallback((thread: MessageThread | null) => {
    actions.selectThread(thread?.id || null);
    
    if (isMobile && thread) {
      setShowThreadList(false);
    }
    
    onThreadSelect?.(thread);
  }, [actions, isMobile, onThreadSelect]);

  const handleBackToList = useCallback(() => {
    if (isMobile) {
      setShowThreadList(true);
      actions.selectThread(null);
    }
  }, [isMobile, actions]);

  const handleToggleThreadList = useCallback(() => {
    setShowThreadList(prev => !prev);
  }, []);

  const handleRefresh = useCallback(() => {
    actions.refreshThreads();
    if (state.selectedThreadId) {
      actions.refreshMessages();
    }
  }, [actions, state.selectedThreadId]);

  const handleError = useCallback((err: Error) => {
    setError(err);
    onError?.(err);
  }, [onError]);

  // Effects
  useEffect(() => {
    if (initialThreadId && isReady) {
      actions.selectThread(initialThreadId);
    }
  }, [initialThreadId, isReady, actions]);

  // Error handling is now managed by the MessagingProvider

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Loading state
  if (!isReady) {
    return (
      <Box
        sx={{
          height,
          width,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default'
        }}
      >
        <Typography variant="body1" color="text.secondary">
          Loading messages...
        </Typography>
      </Box>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        height,
        width,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: 'background.default',
        borderRadius: theme.shape.borderRadius,
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      {/* Error Alert */}
      <Slide direction="down" in={Boolean(error)} mountOnEnter unmountOnExit>
        <Alert
          severity="error"
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={() => setError(null)}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          }
          sx={{ 
            m: 1, 
            mb: 0,
            borderRadius: theme.shape.borderRadius,
          }}
        >
          {error?.message || 'An error occurred'}
        </Alert>
      </Slide>

      {/* Header */}
      {showHeader && (
        <Toolbar
          sx={{
            bgcolor: 'background.paper',
            borderBottom: `1px solid ${theme.palette.divider}`,
            minHeight: { xs: 56, sm: 64 },
            px: { xs: 1, sm: 2 },
          }}
        >
          {/* Mobile back button */}
          {isMobile && state.selectedThreadId && (
            <IconButton
              edge="start"
              onClick={handleBackToList}
              sx={{ mr: 1 }}
              aria-label="Back to thread list"
            >
              <ArrowBackIcon />
            </IconButton>
          )}

          {/* Thread list toggle */}
          {!isMobile && enableThreadList && (
            <Tooltip title={showThreadList ? 'Hide thread list' : 'Show thread list'}>
              <IconButton
                onClick={handleToggleThreadList}
                sx={{ mr: 1 }}
                aria-label="Toggle thread list"
              >
                <Badge
                  badgeContent={state.unreadCount}
                  color="primary"
                  max={99}
                  invisible={state.unreadCount === 0}
                >
                  <MoreVertIcon />
                </Badge>
              </IconButton>
            </Tooltip>
          )}

          {/* Title and subtitle */}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography 
              variant="h6" 
              component="h1"
              noWrap
              sx={{ 
                fontWeight: 600,
                color: primaryColor || 'text.primary'
              }}
            >
              {state.selectedThread?.event_name || title}
            </Typography>
            {(subtitle || state.selectedThread?.client_name) && (
              <Typography 
                variant="body2" 
                color="text.secondary"
                noWrap
              >
                {state.selectedThread?.client_name || subtitle}
              </Typography>
            )}
          </Box>

          {/* Real-time indicators */}
          {enableRealTime && (
            <RealTimeIndicators
              isConnected={isConnected}
              connectionQuality={realTimeState.connectionQuality}
              typingUsers={state.typingUsers.map(user => user.user_name)}
              onlineUsers={realTimeState.onlineUsers}
              compact={isMobile}
            />
          )}

          {/* Action buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {enableSearch && (
              <Tooltip title="Search messages">
                <IconButton
                  size="small"
                  aria-label="Search messages"
                >
                  <SearchIcon />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title="Refresh">
              <IconButton
                onClick={handleRefresh}
                size="small"
                disabled={state.isLoadingThreads || state.isLoadingMessages}
                aria-label="Refresh messages"
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>

            {state.selectedThread && (
              <Tooltip title="Thread information">
                <IconButton
                  onClick={() => setShowThreadInfo(!showThreadInfo)}
                  size="small"
                  aria-label="Toggle thread information"
                >
                  <InfoIcon />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title="Settings">
              <IconButton
                size="small"
                aria-label="Settings"
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      )}

      {/* Main Content */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Thread List */}
        {enableThreadList && (layoutConfig.showBothPanes || (isMobile && showThreadList)) && (
          <Fade in={showThreadList} timeout={200}>
            <Box
              sx={{
                width: layoutConfig.threadListWidth,
                height: '100%',
                borderRight: layoutConfig.showBothPanes ? `1px solid ${theme.palette.divider}` : 'none',
                bgcolor: 'background.paper',
                display: isMobile && !showThreadList ? 'none' : 'flex',
                flexDirection: 'column',
              }}
            >
              <ThreadList
                threads={state.threads}
                selectedThreadId={state.selectedThreadId}
                onThreadSelect={handleThreadSelect}
                onLoadMore={actions.loadMoreThreads}
                hasMore={state.hasMoreThreads}
                isLoading={state.isLoadingThreads}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                userRole={userRole}
                compact={layoutConfig.sidebarCollapsed}
                enableSearch={enableSearch}
              />
            </Box>
          </Fade>
        )}

        {/* Conversation Area */}
        <Box
          sx={{
            width: isMobile && showThreadList ? '0%' : layoutConfig.conversationWidth,
            height: '100%',
            display: isMobile && showThreadList ? 'none' : 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            bgcolor: 'background.default',
          }}
        >
          {state.selectedThreadId ? (
            <>
              {/* Messages */}
              <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                <ConversationThread
                  threadId={state.selectedThreadId}
                  messages={state.messages}
                  onLoadMore={actions.loadMoreMessages}
                  hasMore={state.hasMoreMessages}
                  isLoading={state.isLoadingMessages}
                  onMarkAsRead={actions.markAsRead}
                  userRole={userRole}
                  enableVirtualization={state.messages.length > 50}
                />
              </Box>

              {/* Message Composer */}
              {showFooter && (
                <>
                  <Divider />
                  <Box sx={{ p: { xs: 1, sm: 2 } }}>
                    <MessageComposer
                      threadId={state.selectedThreadId}
                      onSendMessage={actions.sendMessage}
                      onStartTyping={actions.startTyping}
                      onStopTyping={actions.stopTyping}
                      isTyping={state.isTyping}
                      enableFileUploads={enableFileUploads}
                      userRole={userRole}
                      disabled={!isConnected && enableRealTime}
                      placeholder={
                        !isConnected && enableRealTime 
                          ? 'Reconnecting...' 
                          : 'Type your message...'
                      }
                    />
                  </Box>
                </>
              )}
            </>
          ) : (
            /* Empty State */
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 3,
                textAlign: 'center',
              }}
            >
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {state.threads.length === 0 
                  ? 'No conversations yet'
                  : 'Select a conversation to start messaging'
                }
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {state.threads.length === 0
                  ? 'Your conversations will appear here when you start messaging'
                  : 'Choose a conversation from the list to view and send messages'
                }
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Connection Status */}
      {enableRealTime && (
        <ConnectionStatus
          isConnected={isConnected}
          connectionQuality={realTimeState.connectionQuality}
          lastUpdateTime={realTimeState.lastUpdateTime}
          onReconnect={actions.reconnect}
          compact={isMobile}
        />
      )}
    </Paper>
  );
};

export default MessageInterface;