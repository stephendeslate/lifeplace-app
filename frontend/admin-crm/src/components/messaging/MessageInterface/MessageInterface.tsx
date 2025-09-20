// frontend/admin-crm/src/components/messaging/MessageInterface/MessageInterface.tsx
// Main container component for the messaging interface

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Divider,
  CircularProgress,
  Alert,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Badge,
  Tooltip
} from '@mui/material';
import {
  Message as MessageIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon
} from '@mui/icons-material';
import { useAdminMessaging } from '../../../hooks/useAdminMessaging';
import { ThreadList } from '../ThreadList/ThreadList';
import { ChatBox } from '../ChatBox/ChatBox';
import { ThreadManagement } from '../ThreadManagement/ThreadManagement';
import type { MessageInterfaceProps } from '../../../types/messaging.types';

export const MessageInterface: React.FC<MessageInterfaceProps> = ({
  clientId,
  eventId,
  initialThreadId,
  height = 600,
  showHeader = true,
  compactMode = false,
  onThreadSelect,
  onThreadCreate
}) => {
  // ============================================================================
  // State Management
  // ============================================================================

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    initialThreadId || null
  );
  const [isThreadListCollapsed, setIsThreadListCollapsed] = useState(false);
  const [showThreadManagement, setShowThreadManagement] = useState(false);

  // ============================================================================
  // Messaging Hook
  // ============================================================================

  const {
    threads,
    isLoadingThreads,
    isConnected,
    connectionState,
    stats,
    createNewThread,
    refetchThreadList,
    getThreadById
  } = useAdminMessaging({
    clientId,
    eventId,
    onThreadUpdate: (thread) => {
      // Auto-select first thread if none selected
      if (!selectedThreadId && threads.length === 0) {
        setSelectedThreadId(thread.id);
      }
    },
    onError: (error) => {
      console.error('Messaging error:', error);
    }
  });

  // ============================================================================
  // Effects
  // ============================================================================

  // Auto-select first thread when threads load
  useEffect(() => {
    if (!selectedThreadId && threads.length > 0 && !initialThreadId) {
      setSelectedThreadId(threads[0].id);
    }
  }, [threads, selectedThreadId, initialThreadId]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleThreadSelect = (threadId: string) => {
    setSelectedThreadId(threadId);
    onThreadSelect?.(threadId);
  };

  const handleThreadCreate = async (threadData: any) => {
    try {
      const newThreadId = await createNewThread(threadData);
      setSelectedThreadId(newThreadId);
      setShowThreadManagement(false);
      onThreadCreate?.(newThreadId);
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  };

  const handleRefresh = () => {
    refetchThreadList();
  };

  const toggleThreadList = () => {
    setIsThreadListCollapsed(!isThreadListCollapsed);
  };

  // ============================================================================
  // Computed Values
  // ============================================================================

  // const selectedThread = selectedThreadId ? getThreadById(selectedThreadId) : null;
  const threadListWidth = compactMode ? 280 : 350;
  const collapsedWidth = 60;

  // ============================================================================
  // Render Functions
  // ============================================================================

  const renderHeader = () => {
    if (!showHeader) return null;

    return (
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar variant="dense" sx={{ minHeight: 48 }}>
          <MessageIcon sx={{ mr: 1 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Messages
            {(clientId || eventId) && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                {clientId ? 'Client View' : 'Event View'}
              </Typography>
            )}
          </Typography>

          {/* Connection Status */}
          <Tooltip title={`Connection: ${connectionState}`}>
            <Badge
              color={isConnected ? 'success' : 'error'}
              variant="dot"
              sx={{ mr: 1 }}
            >
              <NotificationsIcon />
            </Badge>
          </Tooltip>

          {/* Unread Count */}
          {stats && stats.unreadCount > 0 && (
            <Badge badgeContent={stats.unreadCount} color="primary" sx={{ mr: 1 }}>
              <MessageIcon />
            </Badge>
          )}

          {/* Refresh Button */}
          <Tooltip title="Refresh">
            <IconButton
              size="small"
              onClick={handleRefresh}
              disabled={isLoadingThreads}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          {/* Settings */}
          <Tooltip title="Thread Management">
            <IconButton
              size="small"
              onClick={() => setShowThreadManagement(true)}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>

          {/* Toggle Thread List */}
          <Tooltip title={isThreadListCollapsed ? 'Show Threads' : 'Hide Threads'}>
            <IconButton size="small" onClick={toggleThreadList}>
              {isThreadListCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </IconButton>
          </Tooltip>
        </Toolbar>
        <Divider />
      </AppBar>
    );
  };

  const renderContent = () => {
    if (isLoadingThreads && threads.length === 0) {
      return (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          height="100%"
        >
          <CircularProgress />
        </Box>
      );
    }

    if (threads.length === 0) {
      return (
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          height="100%"
          p={3}
        >
          <MessageIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No messages yet
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            {clientId || eventId
              ? 'No messages found for this context.'
              : 'Start a conversation to see messages here.'
            }
          </Typography>
        </Box>
      );
    }

    return (
      <Box display="flex" height="100%">
        {/* Thread List Panel */}
        <Box
          sx={{
            width: isThreadListCollapsed ? collapsedWidth : threadListWidth,
            transition: 'width 0.3s ease',
            borderRight: 1,
            borderColor: 'divider',
            overflow: 'hidden'
          }}
        >
          {!isThreadListCollapsed && (
            <ThreadList
              clientId={clientId}
              eventId={eventId}
              selectedThreadId={selectedThreadId}
              onThreadSelect={handleThreadSelect}
              height="100%"
              showSearch={!compactMode}
              showFilters={!compactMode}
              compactMode={compactMode}
            />
          )}
        </Box>

        {/* Chat Panel */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedThreadId ? (
            <ChatBox
              threadId={selectedThreadId}
              height="100%"
              showTypingIndicators
              showInternalNotes
              allowAttachments
              allowInternalNotes
              onMessageSent={() => {
                // Refresh thread list to update last message
                refetchThreadList();
              }}
            />
          ) : (
            <Box
              display="flex"
              flexDirection="column"
              justifyContent="center"
              alignItems="center"
              height="100%"
              p={3}
            >
              <MessageIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Select a conversation
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Choose a thread from the list to start messaging
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <Paper
      elevation={1}
      sx={{
        height,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: 'background.paper'
      }}
    >
      {renderHeader()}

      {!isConnected && (
        <Alert severity="warning" sx={{ mb: 0 }}>
          Connection lost. Attempting to reconnect...
        </Alert>
      )}

      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {renderContent()}
      </Box>

      {/* Thread Management Dialog */}
      {showThreadManagement && (
        <ThreadManagement
          mode="create"
          onThreadCreated={handleThreadCreate}
          onClose={() => setShowThreadManagement(false)}
        />
      )}
    </Paper>
  );
};

export type { MessageInterfaceProps };