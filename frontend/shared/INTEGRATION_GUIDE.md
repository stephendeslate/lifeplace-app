# Messaging System State Management Integration Guide

## Overview

This comprehensive state management system seamlessly integrates messaging functionality into both the admin-crm and client-portal applications without breaking any existing functionality. It enhances the sophisticated React Query and context architecture already in place.

## Architecture Components

### 1. **Query Keys System** (`queries/messagingKeys.ts`)
- Hierarchical query key structure following TanStack Query best practices
- Thread-based organization with filtered variants
- Admin-specific query keys for advanced features
- Type-safe query key exports for better TypeScript support

### 2. **API Integration** (`apis/messaging.api.ts`)
- Unified API client that works with both application's existing axios instances
- Configurable through `setApiClient()` function
- Comprehensive CRUD operations for threads, messages, and admin actions
- File upload support with progress tracking

### 3. **React Query Hooks** (`hooks/messaging/useMessagingQueries.ts`)
- Complete set of optimized hooks for all messaging operations
- Infinite query support for message pagination
- Sophisticated caching strategies with appropriate stale times
- Prefetch utilities for performance optimization
- Multi-query hooks for efficient batch operations

### 4. **Optimistic Updates** (`hooks/messaging/useOptimisticUpdates.ts`)
- Sophisticated optimistic UI updates with rollback support
- Message sending with temporary IDs and status tracking
- Read receipt handling with real-time updates
- Admin-specific actions (assign, priority, resolve)
- Failed message retry functionality

### 5. **WebSocket Context** (`contexts/WebSocketContext.tsx`)
- Production-ready WebSocket connection management
- Automatic reconnection with exponential backoff
- Heartbeat mechanism with latency tracking
- Connection quality monitoring
- Event subscription system with cleanup

### 6. **Messaging Context** (`contexts/MessagingContext.tsx`)
- Comprehensive messaging state management
- Real-time synchronization with WebSocket events
- Typing indicator management with debouncing
- Thread filtering and active thread tracking
- Role-based feature enablement

### 7. **Real-time Sync** (`hooks/messaging/useRealtimeSync.ts`)
- WebSocket event handling with cache updates
- Cross-tab synchronization via BroadcastChannel
- Intelligent cache invalidation strategies
- Connection recovery with data refresh
- Event deduplication and conflict resolution

### 8. **Draft Persistence** (`hooks/messaging/useMessageDrafts.ts`)
- Auto-save functionality with debouncing
- Cross-device draft synchronization
- Draft recovery with age management
- Before-unload protection for unsaved changes
- Statistics and debugging utilities

## Integration Points

### Admin CRM Integration

The messaging system is integrated into the admin CRM through the `AppProviders.tsx` file:

```typescript
// Enhanced provider hierarchy
<QueryClientProvider client={queryClient}>
  <ThemeProvider>
    <ThemedApp>
      <AuthProvider>
        <MessagingEnabledApp> // ← New messaging wrapper
          <LayoutProvider>
            <ToastProvider>
              <ConfirmDialogProvider>
                {children}
              </ConfirmDialogProvider>
            </ToastProvider>
          </LayoutProvider>
        </MessagingEnabledApp>
      </AuthProvider>
    </ThemedApp>
  </ThemeProvider>
</QueryClientProvider>
```

**Admin Configuration:**
- Full messaging features including internal notes
- Bulk operations support
- 50MB file upload limit
- Manual read receipt management
- Advanced admin actions (assign, prioritize, resolve)

### Client Portal Integration

Similar integration pattern with client-specific configurations:

```typescript
// Client-optimized configuration
const messagingConfig = {
  userRole: 'CLIENT',
  enableInternalNotes: false,
  enableBulkOperations: false,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  simplified: true,
  autoMarkAsRead: true,
}
```

## Key Features

### 1. **Zero Breaking Changes**
- All existing functionality continues to work unchanged
- Additive integration approach
- Backward compatibility maintained
- Graceful degradation for unauthenticated users

### 2. **Performance Optimization**
- Selective component re-renders
- Efficient caching with appropriate stale times
- Query prefetching for improved UX
- Optimistic updates for instant feedback
- Connection pooling and management

### 3. **Real-time Capabilities**
- Instant message delivery via WebSocket
- Live typing indicators
- Real-time read receipts
- Thread status updates
- Cross-tab synchronization

### 4. **Error Handling**
- Comprehensive error boundaries
- Connection recovery mechanisms
- Failed message retry logic
- Graceful offline behavior
- Debug logging and monitoring

### 5. **Developer Experience**
- Type-safe APIs throughout
- Comprehensive TypeScript support
- React Query Devtools integration
- Debugging utilities and logging
- Clean separation of concerns

## Usage Examples

### Basic Messaging Hook Usage
```typescript
import { useMessaging, useMessages } from '../../../shared';

function MessageComponent() {
  const { 
    sendMessage, 
    activeThreadId, 
    isConnected 
  } = useMessaging();
  
  const { 
    data: messagesData, 
    isLoading 
  } = useMessages(activeThreadId);
  
  const handleSendMessage = async (content: string) => {
    await sendMessage(content, activeThreadId);
  };
  
  // Component implementation...
}
```

### Admin Actions
```typescript
import { useAdminMessagingActions } from '../../../shared';

function AdminControls({ threadId }: { threadId: string }) {
  const { 
    assignThread, 
    setThreadPriority, 
    resolveThread 
  } = useAdminMessagingActions();
  
  const handleAssign = (adminId: number) => {
    assignThread(threadId, adminId);
  };
  
  // Component implementation...
}
```

### Draft Management
```typescript
import { useMessageDrafts } from '../../../shared';

function MessageComposer({ threadId }: { threadId: string }) {
  const { 
    saveDraft, 
    getDraft, 
    clearDraft,
    hasUnsavedChanges 
  } = useMessageDrafts();
  
  const [content, setContent] = useState(getDraft(threadId)?.content || '');
  
  useEffect(() => {
    saveDraft(threadId, content);
  }, [content, threadId, saveDraft]);
  
  // Component implementation...
}
```

## Environment Configuration

### Environment Variables
Both applications need these environment variables:

```env
# WebSocket connection
VITE_WS_BASE_URL=ws://localhost:8000  # Development
VITE_WS_BASE_URL=wss://yourdomain.com  # Production

# API endpoints (existing)
VITE_API_BASE_URL=http://localhost:8000  # Development
VITE_API_BASE_URL=https://yourdomain.com  # Production
```

### Production Considerations
- WebSocket URL automatically adapts to HTTPS/WSS
- Connection quality monitoring
- Automatic failover and recovery
- Performance metrics and monitoring
- Security token management

## Monitoring and Debugging

### React Query Devtools
- Enabled in development mode
- Query inspection and cache management
- Performance monitoring
- Network request tracking

### Console Logging
- Connection status changes
- Message send/receive events
- Error conditions and recovery
- Performance metrics

### Debug Utilities
- Draft export functionality
- Connection quality indicators
- Cache inspection tools
- Event history tracking

This state management system provides a production-ready, scalable foundation for real-time messaging while maintaining the existing application architecture's integrity and performance characteristics.