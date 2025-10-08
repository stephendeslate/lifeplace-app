// frontend/admin-crm/src/types/messaging.types.ts
// Admin-specific extensions to shared messaging types
// WIP: Messaging feature temporarily disabled for deployment

/* eslint-disable @typescript-eslint/no-explicit-any */
// import type {
//   ThreadFilters,
//   MessageFilters,
//   MessageThreadListItem,
//   MessageThreadDetail,
//   Message,
//   MessagePriority,
//   MessageThreadStatus,
//   CreateThreadRequest,
// } from '@shared/types/messaging';

// Temporary type stubs until shared package is fully integrated
export type ThreadFilters = any;
export type MessageFilters = any;
export type MessageThreadListItem = any;
export type MessageThreadDetail = any;
export type Message = any;
export type MessagePriority = any;
export type MessageThreadStatus = any;
export type CreateThreadRequest = any;

// ============================================================================
// Admin-Specific Data Types
// ============================================================================

// Thread creation data for admin messaging
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CreateThreadData extends CreateThreadRequest {
  // Admin-specific fields can be added here if needed in the future
}

// Bulk operation value type
export type BulkOperationValue = string | null;

// ============================================================================
// Admin-Specific Filter Extensions
// ============================================================================

export interface AdminThreadFilters extends ThreadFilters {
  // Additional admin-only filters
  unassigned_only?: boolean;
  urgent_only?: boolean;
  has_unread?: boolean;
  created_after?: string;
  created_before?: string;
  context_type?: 'client' | 'event' | 'all';
  // Re-declare inherited properties to fix type issues
  status?: MessageThreadStatus;
  priority?: MessagePriority;
}

export interface AdminMessageFilters extends MessageFilters {
  // Additional admin-only filters
  internal_notes_only?: boolean;
  exclude_internal_notes?: boolean;
  message_type?: string;
  created_after?: string;
  created_before?: string;
}

// ============================================================================
// UI State Management Types
// ============================================================================

export interface ThreadListUIState {
  selectedThreadIds: string[];
  searchQuery: string;
  activeFilters: AdminThreadFilters;
  sortBy: 'created_at' | 'last_message_at' | 'priority' | 'status';
  sortOrder: 'asc' | 'desc';
  viewMode: 'list' | 'card';
  showFilters: boolean;
}

export interface MessageInterfaceUIState {
  selectedThreadId: string | null;
  isThreadListCollapsed: boolean;
  isTyping: boolean;
  messageInputValue: string;
  attachmentFiles: File[];
  showInternalNotes: boolean;
}

export interface BulkOperationState {
  isActive: boolean;
  selectedThreadIds: string[];
  operation: 'assign' | 'status' | 'priority' | null;
  targetValue: string | null;
}

// ============================================================================
// Component Props Interfaces
// ============================================================================

export interface MessageInterfaceProps {
  // Context filters (when embedded in client/event views)
  clientId?: string;
  eventId?: string;

  // Initial thread selection
  initialThreadId?: string;

  // Layout options
  height?: string | number;
  showHeader?: boolean;
  compactMode?: boolean;

  // Event handlers
  onThreadSelect?: (threadId: string) => void;
  onThreadCreate?: (threadId: string) => void;
}

export interface ThreadListProps {
  // Context filtering
  clientId?: string;
  eventId?: string;

  // Selection state
  selectedThreadId?: string | null;
  onThreadSelect: (threadId: string) => void;

  // Bulk operations
  bulkMode?: boolean;
  selectedThreadIds?: string[];
  onThreadSelectionChange?: (threadIds: string[]) => void;

  // UI customization
  height?: string | number;
  showSearch?: boolean;
  showFilters?: boolean;
  compactMode?: boolean;
}

export interface ChatBoxProps {
  threadId: string;

  // UI customization
  height?: string | number;
  showTypingIndicators?: boolean;
  showInternalNotes?: boolean;

  // Feature toggles
  allowAttachments?: boolean;
  allowInternalNotes?: boolean;

  // Event handlers
  onMessageSent?: (message: Message) => void;
  onThreadUpdate?: (thread: MessageThreadDetail) => void;
}

export interface ThreadManagementProps {
  // Single thread operations
  threadId?: string;
  thread?: MessageThreadListItem;

  // Bulk operations
  selectedThreadIds?: string[];

  // UI mode
  mode: 'single' | 'bulk' | 'create';

  // Event handlers
  onThreadCreated?: (threadData: CreateThreadData) => Promise<void>;
  onThreadUpdated?: (threadId: string) => void;
  onBulkOperationComplete?: (operation: string, count: number) => void;
  onClose?: () => void;
}

// ============================================================================
// Admin Action Types
// ============================================================================

export interface AdminThreadAction {
  type: 'assign' | 'unassign' | 'priority' | 'status' | 'delete' | 'archive';
  label: string;
  icon: string;
  requiresConfirmation?: boolean;
  bulkSupported?: boolean;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: (threadIds: string[]) => Promise<void>;
  variant?: 'primary' | 'secondary' | 'danger';
}

// ============================================================================
// Context Types
// ============================================================================

export interface MessagingContextType {
  // UI State
  threadListState: ThreadListUIState;
  messageInterfaceState: MessageInterfaceUIState;
  bulkOperationState: BulkOperationState;

  // Actions
  updateThreadListState: (updates: Partial<ThreadListUIState>) => void;
  updateMessageInterfaceState: (updates: Partial<MessageInterfaceUIState>) => void;
  updateBulkOperationState: (updates: Partial<BulkOperationState>) => void;

  // Admin operations
  performBulkOperation: (operation: string, threadIds: string[], targetValue?: string) => Promise<void>;
  createNewThread: (data: CreateThreadData) => Promise<string>;
  assignThread: (threadId: string, adminId: string | null) => Promise<void>;
}

// ============================================================================
// Hook Configuration Types
// ============================================================================

export interface UseAdminMessagingOptions {
  // Context filtering
  clientId?: string;
  eventId?: string;

  // Feature flags
  enableRealtime?: boolean;
  enableBulkOperations?: boolean;
  enableAutoRefresh?: boolean;

  // Pagination
  pageSize?: number;

  // Callbacks
  onThreadUpdate?: (thread: MessageThreadListItem) => void;
  onNewMessage?: (message: Message) => void;
  onError?: (error: string) => void;
}

export interface AdminMessagingStats {
  totalThreads: number;
  activeThreads: number;
  unassignedThreads: number;
  urgentThreads: number;
  unreadCount: number;
  todayMessages: number;
}

// ============================================================================
// Export all types
// ============================================================================

// Note: Types are already exported above as stubs
// When @shared/types/messaging is available, uncomment the import at top and remove stubs