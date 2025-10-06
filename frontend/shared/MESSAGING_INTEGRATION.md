# Messaging Integration Guide

This guide explains how to use the shared messaging infrastructure in both `client-portal` and `admin-crm` applications.

## Overview

The shared messaging system provides:

- ✅ **Complete TypeScript Types** - All backend models and API types
- ✅ **API Client** - Axios-based client with authentication and error handling
- ✅ **React Query Hooks** - Data fetching and mutation hooks with caching
- ✅ **WebSocket Hooks** - Real-time messaging with automatic reconnection
- ✅ **Utility Functions** - Formatting, validation, and permission helpers

## Quick Start

### 1. Import What You Need

```typescript
import {
  // Types
  type MessageThreadListItem,
  type Message,
  type CreateMessageRequest,

  // Hooks - Data fetching
  useThreads,
  useThread,
  useThreadWithMessages,
  useInbox,

  // Hooks - Mutations
  useSendMessage,
  useCreateThread,
  useMarkThreadAsRead,

  // Hooks - WebSocket
  useThreadWebSocket,
  useGlobalMessagingWebSocket,

  // API Client
  messagingApiClient,

  // Utilities
  messagingUtils,
} from '@shared';
```

### 2. Basic Thread List

```typescript
function ThreadList() {
  const { data, isLoading, error } = useThreads({
    status: 'active',
    ordering: '-last_message_at'
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.results.map(thread => (
        <ThreadListItem key={thread.id} thread={thread} />
      ))}
    </div>
  );
}
```

### 3. Thread Detail with Real-time Updates

```typescript
function ThreadDetail({ threadId }: { threadId: string }) {
  // Combined hook for thread + messages
  const {
    thread,
    messages,
    isLoading,
    hasNextPage,
    fetchNextPage
  } = useThreadWithMessages(threadId);

  // Real-time WebSocket connection
  const { sendTextMessage, typingState, connectionInfo } = useThreadWebSocket({
    threadId,
    onMessage: (message) => {
      // Handle new message (cache is automatically updated)
      console.log('New message received:', message);
    },
    onTypingUpdate: (typing) => {
      console.log('Typing status:', typing);
    }
  });

  // Send message mutation
  const sendMessageMutation = useSendMessage({
    onSuccess: () => {
      // Message sent successfully
    }
  });

  const handleSendMessage = (content: string) => {
    sendMessageMutation.mutate({
      thread: threadId,
      content,
      message_type: 'text'
    });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h2>{thread?.subject}</h2>

      {/* Connection status */}
      <div>Status: {connectionInfo.state}</div>

      {/* Messages */}
      <div>
        {messages.map(message => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>

      {/* Typing indicators */}
      {Object.values(typingState)
        .filter(user => user.isTyping)
        .map(user => (
          <div key={user.userName}>{user.userName} is typing...</div>
        ))}

      {/* Message input */}
      <MessageInput onSend={handleSendMessage} />
    </div>
  );
}
```

### 4. Admin Dashboard with Statistics

```typescript
function AdminDashboard() {
  const { stats, recentThreads, isLoading } = useAdminDashboard();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Messaging Statistics</h2>
      <div>
        <div>Total Threads: {stats?.total_threads}</div>
        <div>Active Threads: {stats?.active_threads}</div>
        <div>Unassigned: {stats?.unassigned_threads}</div>
        <div>Urgent: {stats?.urgent_threads}</div>
      </div>

      <h3>Recent Activity</h3>
      {recentThreads.map(thread => (
        <ThreadCard key={thread.id} thread={thread} />
      ))}
    </div>
  );
}
```

### 5. Global Notifications

```typescript
function App() {
  // Global WebSocket for notifications
  useGlobalMessagingWebSocket({
    onThreadNotification: (notification) => {
      // Handle global notifications
      if (notification.notification_type === 'new_thread') {
        showToast('New message thread created');
      }
    },
    onUnreadCountUpdate: (count) => {
      // Update global unread count
      setGlobalUnreadCount(count);
    }
  });

  return <Router>...</Router>;
}
```

## API Examples

### Direct API Usage (if needed)

```typescript
// Get threads
const threads = await messagingApiClient.threads.getThreads({
  status: 'active',
  priority: 'urgent'
});

// Send message with file attachment
const files = [/* File objects */];
const message = await messagingApiClient.messages.sendMessage({
  thread: 'thread-id',
  content: 'Message with attachment',
  attachment_files: files
});

// Admin bulk operations
await messagingApiClient.admin.bulkAssignThreads({
  thread_ids: ['id1', 'id2'],
  admin_id: 'admin-user-id'
});
```

## Utility Functions

```typescript
// Formatting
const timestamp = messagingUtils.formatMessageTimestamp(message.created_at, {
  relative: true
});

const fileSize = messagingUtils.formatFileSize(attachment.file_size);

// Permissions
const permissions = messagingUtils.getThreadPermissions(currentUser, thread);
if (permissions.canCreateInternalNotes) {
  // Show internal note option
}

// Validation
const validation = messagingUtils.validateFiles(selectedFiles);
if (!validation.isValid) {
  showErrors(validation.errors);
}

// Sorting and filtering
const urgentThreads = messagingUtils.filterThreadsByPriority(threads, ['urgent']);
const sortedThreads = messagingUtils.sortThreadsByLastMessage(threads);
```

## Error Handling

```typescript
// All hooks include error handling
const { data, error, isError } = useThreads();

if (isError) {
  const errorMessage = messagingApiClient.errorHandler.getErrorMessage(error);

  if (messagingApiClient.errorHandler.isAuthError(error)) {
    // Handle authentication error
    redirectToLogin();
  } else if (messagingApiClient.errorHandler.isPermissionError(error)) {
    // Handle permission error
    showPermissionError();
  } else {
    // Generic error handling
    showError(errorMessage);
  }
}
```

## WebSocket Best Practices

1. **Enable when needed**: Only connect WebSocket when actively viewing threads
2. **Handle reconnection**: The hooks automatically handle reconnection with exponential backoff
3. **Monitor connection state**: Use `connectionInfo.state` to show connection status
4. **Cleanup**: WebSocket connections automatically cleanup when components unmount

```typescript
const { connectionInfo } = useThreadWebSocket({
  threadId,
  enabled: isThreadViewActive, // Only connect when viewing thread
  onError: (error) => {
    console.error('WebSocket error:', error);
  }
});

// Show connection status
if (connectionInfo.state === 'connecting') {
  return <div>Connecting...</div>;
}
```

## Environment Variables

Make sure these environment variables are set:

```env
# API Configuration
VITE_API_URL=http://localhost:8000
VITE_WS_HOST=localhost:8000

# Optional: Override WebSocket host if different from API
VITE_WS_HOST=localhost:8001
```

## Performance Tips

1. **Use infinite queries** for long message lists
2. **Implement virtualization** for large thread lists
3. **Debounce typing indicators** to avoid excessive WebSocket messages
4. **Cache invalidation** is handled automatically by the hooks

## Examples by Use Case

### Client Portal
- Thread list with unread counts
- Thread detail with real-time messaging
- File attachment support
- Read receipts

### Admin CRM
- All client portal features plus:
- Internal notes
- Thread assignment
- Bulk operations
- Statistics dashboard
- Cross-client thread management

## Support

For issues or questions:
1. Check the TypeScript types for available options
2. Look at the utility functions for common operations
3. Review the WebSocket hooks for real-time features
4. Check the API client for direct backend access