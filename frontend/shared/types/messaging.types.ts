// Unified messaging types for both client-portal and admin-crm

// API Response Types (matching Django REST Framework pagination)
export interface PaginatedApiResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  page_count: number;
  current_page: number;
  page_size: number;
  results: T[];
}

// Type aliases for specific paginated responses
export type PaginatedThreadsResponse = PaginatedApiResponse<MessageThread>;
export type PaginatedMessagesResponse = PaginatedApiResponse<Message>;

// Base User interface
export interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  name: string;
  avatar_url?: string;
  role?: 'CLIENT' | 'ADMIN';
  phone?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MessageThread {
  id: string;
  event_id: number;
  event_name: string;
  event_date: string;
  client_id: number;
  client_name: string;
  assigned_admin?: {
    id: number;
    name: string;
    avatar?: string;
  };
  priority: 'urgent' | 'high' | 'normal' | 'low';
  status: 'active' | 'waiting' | 'resolved';
  unread_count: number;
  last_message?: {
    content: string;
    sender_name: string;
    sent_at: string;
  };
  created_at: string;
  updated_at: string;
  // Legacy properties for backward compatibility
  last_message_at?: string;
  client_email?: string;
  client_phone?: string;
}

export interface Message {
  id: string;
  thread_id: string;
  sender: {
    id: number;
    first_name?: string;
    last_name?: string;
    email: string;
    role: 'CLIENT' | 'ADMIN';
    display_name: string;
    name?: string; // Legacy support
    avatar?: string;
  };
  content: string;
  message_type: 'text' | 'system' | 'file' | 'event_update';
  is_internal_note?: boolean; // Admin-only visibility
  attachments?: MessageAttachment[];
  read_by: number[];
  created_at: string;
  updated_at?: string;
  edited_at?: string;
  // Message status for optimistic updates
  status?: 'sending' | 'sent' | 'failed' | 'delivered' | 'read';
  // Legacy properties for backward compatibility
  sender_id?: number;
  sender_name?: string;
  sender_type?: string;
  is_read?: boolean;
}

export interface MessageAttachment {
  id: string;
  filename: string;
  file_url: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
  // Legacy property for backward compatibility
  file_name?: string;
}

export interface MessageComposition {
  thread_id: string;
  content: string;
  attachments?: File[];
  is_internal_note?: boolean;
}

export interface SendMessageRequest {
  thread: string;
  content: string;
  message_type?: 'text' | 'file';
  attachments?: string[]; // File IDs after upload
  is_internal_note?: boolean;
}

export interface SendMessageResponse {
  success: boolean;
  message?: Message;
  error?: string;
}

export interface CreateMessageData {
  thread_id: string;
  content: string;
  message_type?: 'text' | 'file';
  attachments?: File[] | string[]; // Files for upload or File IDs after upload
  is_internal_note?: boolean;
}

export interface ThreadFilters {
  status?: 'active' | 'waiting' | 'resolved';
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  assigned_admin?: number;
  search?: string;
  event_id?: number;
  // Index signature for React Query compatibility
  [key: string]: unknown;
}

export interface MessageFilters {
  thread_id?: string;
  before?: string; // For pagination
  limit?: number;
  include_internal?: boolean;
  // Additional filters for thread queries
  client_id?: number;
  event_id?: number;
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  status?: 'active' | 'waiting' | 'resolved';
  search?: string;
  // Index signature for React Query compatibility
  [key: string]: unknown;
}

export interface TypingIndicator {
  thread_id: string;
  user_id: number;
  user_name: string;
  is_typing: boolean;
}

// Extended typing user interface for components
export interface TypingUser extends User {
  lastTyping: number;
  isTyping: boolean;
}

// Extended read receipt user interface for components
export interface ReadReceiptUser extends User {
  readAt: string;
  deliveredAt?: string;
}

export interface MessageReadReceipt {
  message_id: string;
  user_id: number;
  read_at: string;
  user_name?: string;
  user_avatar?: string;
}

// WebSocket event types - compatible with WebSocketEventType
export interface WSMessage {
  type: 'new_message' | 'message_read' | 'typing_indicator' | 'thread_updated' | 'user_presence' | 'connection_state_changed' | 'error' | 'ping' | 'pong';
  payload: Message | MessageReadReceipt | TypingIndicator | MessageThread | any;
  timestamp?: number;
  id?: string;
}

// WebSocket Event type alias for compatibility
export interface WebSocketEvent<T = any> {
  type: 'new_message' | 'message_read' | 'typing_indicator' | 'thread_updated' | 'user_presence' | 'connection_state_changed' | 'error' | 'ping' | 'pong' | 'connection_quality_changed' | 'message_queued' | 'bulk_operation_complete' | 'system_notification' | 'token_refresh_required';
  payload: T;
  timestamp: number;
  id?: string;
  retry?: number;
}

export interface ThreadStats {
  total_messages: number;
  response_time_avg: number; // in minutes
  resolution_time_avg: number; // in hours
  satisfaction_rating?: number;
}

// Quick actions (both client and admin)
export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: 'mark_urgent' | 'request_callback' | 'attach_file' | 'resolve';
  enabled: boolean;
}

// Admin-specific features
export interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category: string;
  usage_count: number;
}

export interface AdminMessageAction {
  action: 'assign' | 'change_priority' | 'add_internal_note' | 'resolve';
  thread_id: string;
  data?: {
    admin_id?: number;
    priority?: 'urgent' | 'high' | 'normal' | 'low';
    note?: string;
  };
}

// === ENHANCED TYPESCRIPT INTEGRATION TYPES ===

// Configuration types for conditional messaging features
export interface MessagingConfig {
  userRole: 'ADMIN' | 'CLIENT';
  enableInternalNotes?: boolean;
  enableBulkOperations?: boolean;
  enableCannedResponses?: boolean;
  enableVirtualScrolling?: boolean;
  maxFileSize: number;
  simplified?: boolean;
  autoMarkAsRead?: boolean;
  enableTypingIndicators?: boolean;
  enableReadReceipts?: boolean;
  // Real-time configuration
  enableRealTime?: boolean;
  // File upload configuration
  enableFileUploads?: boolean;
  allowedFileTypes?: string[];
  // Search configuration
  enableSearch?: boolean;
  // Typing configuration
  typingTimeout?: number;
  typingDebounceMs?: number;
  // Pagination configuration
  messagesPerPage?: number;
  threadsPerPage?: number;
  // Connection configuration  
  reconnectAttempts?: number;
  reconnectDelay?: number;
  // Index signature for flexibility
  [key: string]: unknown;
}

// Admin-specific configuration
export interface AdminMessagingConfig extends MessagingConfig {
  userRole: 'ADMIN';
  enableInternalNotes: true;
  enableBulkOperations: true;
  enableCannedResponses: true;
  assignmentFeatures: boolean;
  threadManagement: boolean;
  analyticsAccess: boolean;
}

// Client-specific configuration
export interface ClientMessagingConfig extends MessagingConfig {
  userRole: 'CLIENT';
  enableInternalNotes: false;
  enableBulkOperations: false;
  enableCannedResponses: false;
  quickActions: boolean;
  attachmentTypes: string[];
}

// Conditional types based on configuration
export type ConditionalSendMessage<T extends MessagingConfig> = 
  T['enableInternalNotes'] extends true 
    ? (content: string, threadId: string, isInternal?: boolean) => Promise<void>
    : (content: string, threadId: string) => Promise<void>;

export type ConditionalAssignThread<T extends MessagingConfig> = 
  T['userRole'] extends 'ADMIN' 
    ? (threadId: string, adminId: number) => Promise<void>
    : never;

export type ConditionalBulkOperations<T extends MessagingConfig> = 
  T['enableBulkOperations'] extends true
    ? BulkMessageOperations
    : never;

export type ConditionalCannedResponses<T extends MessagingConfig> = 
  T['enableCannedResponses'] extends true
    ? CannedResponseActions
    : never;

// Bulk operations for admin users
export interface BulkMessageOperations {
  markAsRead: (threadIds: string[]) => Promise<void>;
  assignThreads: (threadIds: string[], adminId: number) => Promise<void>;
  changePriority: (threadIds: string[], priority: MessageThread['priority']) => Promise<void>;
  archiveThreads: (threadIds: string[]) => Promise<void>;
  deleteThreads: (threadIds: string[]) => Promise<void>;
}

// Canned responses for admin users
export interface CannedResponseActions {
  list: () => Promise<CannedResponse[]>;
  create: (response: Omit<CannedResponse, 'id' | 'usage_count'>) => Promise<CannedResponse>;
  update: (id: string, response: Partial<CannedResponse>) => Promise<CannedResponse>;
  delete: (id: string) => Promise<void>;
  use: (id: string, threadId: string) => Promise<void>;
}

// Context value with conditional types
export interface MessagingContextValue<T extends MessagingConfig = MessagingConfig> {
  // Core state
  threads: MessageThread[];
  activeThreadId: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  
  // User configuration
  config: T;
  
  // Core actions (available to all users)
  sendMessage: ConditionalSendMessage<T>;
  markAsRead: (messageId: string) => Promise<void>;
  loadThread: (threadId: string) => Promise<void>;
  refreshThreads: () => Promise<void>;
  
  // Conditional actions based on user role
  assignThread: ConditionalAssignThread<T>;
  bulkOperations: ConditionalBulkOperations<T>;
  cannedResponses: ConditionalCannedResponses<T>;
  
  // UI state management
  setActiveThread: (threadId: string | null) => void;
  clearError: () => void;
}

// Hook options with generic configuration
export interface UseMessagingOptions<T extends MessagingConfig> {
  config: T;
  initialThreadId?: string;
  autoConnect?: boolean;
  pollingInterval?: number;
  maxRetries?: number;
}

// Hook return type with conditional features
export interface UseMessagingReturn<T extends MessagingConfig> {
  // State
  state: MessagingState;
  
  // Actions
  actions: MessagingActions<T>;
  
  // Queries (React Query integration)
  queries: MessagingQueries;
  
  // Mutations (React Query integration)
  mutations: MessagingMutations<T>;
  
  // WebSocket connection
  websocket: WebSocketConnection;
}

// Messaging state interface
export interface MessagingState {
  threads: MessageThread[];
  activeThread: MessageThread | null;
  messages: Record<string, Message[]>;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  typingUsers: Record<string, TypingIndicator[]>;
  unreadCounts: Record<string, number>;
  isTyping?: boolean;
}

// Actions interface with conditional types
export interface MessagingActions<T extends MessagingConfig> {
  sendMessage: ConditionalSendMessage<T>;
  markAsRead: (messageId: string) => Promise<void>;
  setActiveThread: (threadId: string | null) => void;
  refreshThreads: () => Promise<void>;
  loadMoreMessages: (threadId: string, before?: string) => Promise<void>;
  assignThread?: ConditionalAssignThread<T>;
  bulkActions?: ConditionalBulkOperations<T>;
  cannedResponses?: ConditionalCannedResponses<T>;
}

// React Query integrations
export interface MessagingQueries {
  threads: {
    data: MessageThread[];
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
  };
  messages: (threadId: string) => {
    data: Message[];
    isLoading: boolean;
    error: Error | null;
    fetchNextPage: () => void;
    hasNextPage: boolean;
  };
  threadStats?: (threadId: string) => {
    data: ThreadStats | null;
    isLoading: boolean;
    error: Error | null;
  };
}

export interface MessagingMutations<T extends MessagingConfig> {
  sendMessage: {
    mutate: ConditionalSendMessage<T>;
    isLoading: boolean;
    error: Error | null;
  };
  markAsRead: {
    mutate: (messageId: string) => void;
    isLoading: boolean;
  };
  assignThread?: T['userRole'] extends 'ADMIN' ? {
    mutate: (threadId: string, adminId: number) => void;
    isLoading: boolean;
    error: Error | null;
  } : never;
}

// WebSocket connection interface
export interface WebSocketConnection {
  isConnected: boolean;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error' | 'closed' | 'throttled' | 'suspended';
  lastHeartbeat: Date | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  connect: () => void;
  disconnect: () => void;
  send: (message: WSMessage) => void;
  sendRawMessage: (message: any) => void;
}

// Component prop types with generic constraints
export interface MessageThreadProps<T extends MessagingConfig = MessagingConfig> {
  threadId: string;
  config: T;
  onMessageSent?: (message: Message) => void;
  onThreadAction?: (action: string, threadId: string) => void;
  className?: string;
  maxHeight?: string | number;
  enableVirtualization?: boolean;
}

export interface MessageComposerProps<T extends MessagingConfig = MessagingConfig> {
  threadId: string;
  config: T;
  onSend: ConditionalSendMessage<T>;
  onTyping?: (isTyping: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  allowAttachments?: boolean;
  cannedResponses?: T['enableCannedResponses'] extends true ? CannedResponse[] : never;
}

export interface MessageBubbleProps {
  message: Message;
  variant: 'sent' | 'received' | 'system';
  showAvatar?: boolean;
  showTimestamp?: boolean;
  showReadReceipts?: boolean;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  className?: string;
}

// Theme integration types
export interface MessagingThemeVariant {
  name: 'admin-glassmorphism' | 'client-organic';
  components: MessagingThemeComponents;
  animations: MessagingAnimations;
  responsive: MessagingResponsive;
}

export interface MessagingThemeComponents {
  container: React.CSSProperties;
  threadList: React.CSSProperties;
  messageThread: React.CSSProperties;
  messageBubble: {
    sent: React.CSSProperties;
    received: React.CSSProperties;
    system: React.CSSProperties;
  };
  composer: React.CSSProperties;
  attachment: React.CSSProperties;
}

export interface MessagingAnimations {
  messageAppear: string;
  threadSelect: string;
  typingIndicator: string;
  scrollToBottom: string;
}

export interface MessagingResponsive {
  mobile: {
    breakpoint: string;
    components: Partial<MessagingThemeComponents>;
  };
  tablet: {
    breakpoint: string;
    components: Partial<MessagingThemeComponents>;
  };
  desktop: {
    breakpoint: string;
    components: Partial<MessagingThemeComponents>;
  };
}

// Accessibility types
export interface MessagingA11yConfig {
  enableScreenReader: boolean;
  keyboardNavigation: boolean;
  focusManagement: boolean;
  ariaLabels: {
    threadList: string;
    messageThread: string;
    composer: string;
    sendButton: string;
    attachmentButton: string;
  };
  announcements: {
    newMessage: boolean;
    threadChange: boolean;
    typingIndicator: boolean;
  };
}

// Error handling types
export interface MessagingError {
  code: 'NETWORK_ERROR' | 'PERMISSION_DENIED' | 'INVALID_INPUT' | 'SERVER_ERROR' | 'WEBSOCKET_ERROR';
  message: string;
  context?: {
    threadId?: string;
    messageId?: string;
    action?: string;
  };
  timestamp: Date;
  retryable: boolean;
}

// Performance monitoring types
export interface MessagingMetrics {
  messagesSent: number;
  messagesReceived: number;
  connectionsCount: number;
  averageResponseTime: number;
  errorRate: number;
  lastActivity: Date;
}

// Export utility types for better developer experience
export type AdminMessagingContextValue = MessagingContextValue<AdminMessagingConfig>;
export type ClientMessagingContextValue = MessagingContextValue<ClientMessagingConfig>;
export type AdminMessagingHook = UseMessagingReturn<AdminMessagingConfig>;
export type ClientMessagingHook = UseMessagingReturn<ClientMessagingConfig>;

// Type guards for runtime configuration checking
export const isAdminConfig = (config: MessagingConfig): config is AdminMessagingConfig => {
  return config.userRole === 'ADMIN';
};

export const isClientConfig = (config: MessagingConfig): config is ClientMessagingConfig => {
  return config.userRole === 'CLIENT';
};

// Default configurations
export const DEFAULT_ADMIN_CONFIG: AdminMessagingConfig = {
  userRole: 'ADMIN',
  enableInternalNotes: true,
  enableBulkOperations: true,
  enableCannedResponses: true,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  simplified: false,
  autoMarkAsRead: false,
  enableTypingIndicators: true,
  enableReadReceipts: true,
  enableRealTime: true,
  assignmentFeatures: true,
  threadManagement: true,
  analyticsAccess: true,
};

export const DEFAULT_CLIENT_CONFIG: ClientMessagingConfig = {
  userRole: 'CLIENT',
  enableInternalNotes: false,
  enableBulkOperations: false,
  enableCannedResponses: false,
  maxFileSize: 5 * 1024 * 1024, // 5MB
  simplified: true,
  autoMarkAsRead: true,
  enableTypingIndicators: true,
  enableReadReceipts: false,
  enableRealTime: true,
  quickActions: true,
  attachmentTypes: ['image/*', 'application/pdf', '.doc', '.docx'],
};