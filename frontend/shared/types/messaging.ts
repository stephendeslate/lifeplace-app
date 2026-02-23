// ============================================================================
// Messaging Domain Types
// ============================================================================
// Complete TypeScript interfaces for the messaging domain backend models
// and all related API request/response types.

// ============================================================================
// Core Domain Models
// ============================================================================

export type MessagePriority = 'urgent' | 'high' | 'normal' | 'low';
export type MessageThreadStatus = 'active' | 'waiting' | 'resolved' | 'archived';
export type MessageType = 'text' | 'system' | 'file' | 'event_update';
export type UserRole = 'ADMIN' | 'CLIENT';

// User basic information for messaging context
export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  display_name: string;
}

// Message attachment model
export interface MessageAttachment {
  id: string;
  filename: string;
  file_url: string;
  file_size: number;
  file_type: string;
  created_at: string;
}

// Message read status tracking
export interface MessageReadStatus {
  user: User;
  read_at: string;
}

// Individual message model
export interface Message {
  id: string;
  thread: string; // Thread ID
  sender: User;
  content: string;
  message_type: MessageType;
  is_internal_note: boolean;
  attachments: MessageAttachment[];
  read_by: string[]; // Array of user IDs
  created_at: string;
  updated_at: string;
  edited_at: string | null;
}

// Message thread list item (for thread lists)
export interface MessageThreadListItem {
  id: string;
  client: User;
  event: string | null; // Event ID
  event_name: string | null;
  client_name: string;
  assigned_admin: User | null;
  priority: MessagePriority;
  status: MessageThreadStatus;
  subject: string;
  last_message_at: string | null;
  last_message_content: string;
  last_message_sender_name: string;
  last_message_preview: string;
  unread_count: number;
  can_manage: boolean;
  created_at: string;
  updated_at: string;
}

// Message thread detail (includes messages)
export interface MessageThreadDetail extends MessageThreadListItem {
  messages: Message[];
}

// ============================================================================
// API Request Types
// ============================================================================

// Thread creation request
export interface CreateThreadRequest {
  client: string; // User ID
  event?: string; // Event ID (optional)
  subject: string;
  priority?: MessagePriority;
  initial_message?: string;
}

// Thread update request (admin only)
export interface UpdateThreadRequest {
  assigned_admin?: string | null; // User ID
  priority?: MessagePriority;
  status?: MessageThreadStatus;
  subject?: string;
}

// Message creation request
export interface CreateMessageRequest {
  thread: string; // Thread ID
  content: string;
  message_type?: MessageType;
  is_internal_note?: boolean;
  attachment_files?: File[];
}

// Thread assignment request
export interface AssignThreadRequest {
  admin_id?: string; // User ID, null to unassign
}

// Bulk thread assignment request
export interface BulkAssignThreadsRequest {
  thread_ids: string[];
  admin_id?: string; // User ID, null to unassign
}

// Bulk thread status update request
export interface BulkUpdateThreadStatusRequest {
  thread_ids: string[];
  status: MessageThreadStatus;
}

// Bulk mark messages as read request
export interface BulkMarkAsReadRequest {
  message_ids: string[];
}

// ============================================================================
// API Response Types
// ============================================================================

// Paginated response wrapper
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Thread list response
export type ThreadListResponse = PaginatedResponse<MessageThreadListItem>;

// Message list response
export type MessageListResponse = PaginatedResponse<Message>;

// Mark as read response
export interface MarkAsReadResponse {
  status: 'success';
  marked_read: number;
}

// Bulk mark as read response
export interface BulkMarkAsReadResponse {
  status: 'success';
  marked_read: number;
  total_requested: number;
}

// Bulk assign response
export interface BulkAssignResponse {
  status: 'success';
  updated_count: number;
  assigned_to: string;
}

// Bulk status update response
export interface BulkStatusUpdateResponse {
  status: 'success';
  updated_count: number;
  new_status: MessageThreadStatus;
}

// Admin messaging statistics
export interface MessagingStats {
  total_threads: number;
  active_threads: number;
  unassigned_threads: number;
  urgent_threads: number;
  total_messages: number;
  messages_today: number;
  status_breakdown: Record<MessageThreadStatus, number>;
  priority_breakdown: Record<MessagePriority, number>;
}

// ============================================================================
// Query Parameter Types
// ============================================================================

// Thread list filters
export interface ThreadFilters {
  status?: MessageThreadStatus;
  priority?: MessagePriority;
  assigned_admin?: string; // User ID
  search?: string;
  event_id?: string;
  client_id?: string; // Admin only
  ordering?: string;
  page?: number;
  page_size?: number;
}

// Message list filters
export interface MessageFilters {
  thread_id?: string;
  limit?: number;
  before?: string; // Message ID for pagination
}

// ============================================================================
// WebSocket Message Types
// ============================================================================

// Base WebSocket message structure
export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

// Connection establishment messages
export interface ConnectionEstablishedMessage extends WebSocketMessage {
  type: 'connection_established';
  thread_id: string;
  user_id: string;
}

export interface GlobalConnectionEstablishedMessage extends WebSocketMessage {
  type: 'global_connection_established';
  user_id: string;
}

// Message-related WebSocket messages
export interface NewMessageWebSocketMessage extends WebSocketMessage {
  type: 'new_message';
  message: Message;
  is_own_message: boolean;
}

export interface TypingIndicatorMessage extends WebSocketMessage {
  type: 'typing_indicator';
  user_id: string;
  user_name: string;
  is_typing: boolean;
}

export interface MessageReadMessage extends WebSocketMessage {
  type: 'message_read';
  message_id: string;
  user_id: string;
  user_name: string;
}

export interface ThreadUpdatedMessage extends WebSocketMessage {
  type: 'thread_updated';
  thread_data: MessageThreadListItem;
}

// Global WebSocket messages
export interface ThreadNotificationMessage extends WebSocketMessage {
  type: 'thread_notification';
  thread_id: string;
  notification_type: string;
  data: Record<string, any>;
}

export interface UnreadCountUpdateMessage extends WebSocketMessage {
  type: 'unread_count_update';
  unread_count: number;
}

// Error messages
export interface WebSocketErrorMessage extends WebSocketMessage {
  type: 'error';
  message: string;
}

// Ping/Pong messages
export interface PingMessage extends WebSocketMessage {
  type: 'ping';
}

export interface PongMessage extends WebSocketMessage {
  type: 'pong';
}

// Outgoing WebSocket message types
export interface SendMessageWebSocketRequest extends WebSocketMessage {
  type: 'send_message';
  content: string;
  is_internal_note?: boolean;
}

export interface TypingIndicatorWebSocketRequest extends WebSocketMessage {
  type: 'typing_indicator';
  is_typing: boolean;
}

export interface MarkAsReadWebSocketRequest extends WebSocketMessage {
  type: 'mark_as_read';
  message_id: string;
}

// Union types for all WebSocket messages
export type IncomingWebSocketMessage =
  | ConnectionEstablishedMessage
  | GlobalConnectionEstablishedMessage
  | NewMessageWebSocketMessage
  | TypingIndicatorMessage
  | MessageReadMessage
  | ThreadUpdatedMessage
  | ThreadNotificationMessage
  | UnreadCountUpdateMessage
  | WebSocketErrorMessage
  | PongMessage;

export type OutgoingWebSocketMessage =
  | SendMessageWebSocketRequest
  | TypingIndicatorWebSocketRequest
  | MarkAsReadWebSocketRequest
  | PingMessage;

// ============================================================================
// WebSocket Connection State Types
// ============================================================================

export type WebSocketConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WebSocketConnectionInfo {
  state: WebSocketConnectionState;
  error?: string;
  lastConnected?: Date;
  reconnectAttempts: number;
}

// ============================================================================
// Hook State Types
// ============================================================================

// Thread list hook state
export interface ThreadListState {
  threads: MessageThreadListItem[];
  loading: boolean;
  error: string | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

// Thread detail hook state
export interface ThreadDetailState {
  thread: MessageThreadDetail | null;
  loading: boolean;
  error: string | null;
}

// Message list hook state
export interface MessageListState {
  messages: Message[];
  loading: boolean;
  error: string | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

// Typing indicator state
export interface TypingState {
  [userId: string]: {
    userName: string;
    isTyping: boolean;
    lastTyping: Date;
  };
}

// ============================================================================
// Utility Types
// ============================================================================

// File upload progress
export interface FileUploadProgress {
  file: File;
  progress: number;
  error?: string;
}

// Message with optimistic update flag
export interface OptimisticMessage extends Message {
  isOptimistic?: boolean;
  uploadProgress?: FileUploadProgress[];
}

// Thread permission helpers
export interface ThreadPermissions {
  canRead: boolean;
  canWrite: boolean;
  canManage: boolean;
  canCreateInternalNotes: boolean;
  canAssign: boolean;
}

// Export all types as a namespace for convenience
export type * from './messaging';
