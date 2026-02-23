// ============================================================================
// Messaging Utility Functions and Constants
// ============================================================================
// Helper functions, formatters, constants, and utilities for the messaging domain.

import type {
  MessagePriority,
  MessageThreadStatus,
  MessageType,
  UserRole,
  MessageThreadListItem,
  Message,
  User,
  ThreadPermissions,
  MessageAttachment,
} from '../types/messaging';

// ============================================================================
// Constants
// ============================================================================

export const MESSAGING_CONSTANTS = {
  // Priority levels with display information
  PRIORITIES: {
    urgent: { label: 'Urgent', color: '#f44336', sortOrder: 0 },
    high: { label: 'High', color: '#ff9800', sortOrder: 1 },
    normal: { label: 'Normal', color: '#4caf50', sortOrder: 2 },
    low: { label: 'Low', color: '#9e9e9e', sortOrder: 3 },
  } as const,

  // Thread statuses with display information
  STATUSES: {
    active: { label: 'Active', color: '#4caf50', icon: '🟢' },
    waiting: { label: 'Waiting for Response', color: '#ff9800', icon: '⏳' },
    resolved: { label: 'Resolved', color: '#2196f3', icon: '✅' },
    archived: { label: 'Archived', color: '#9e9e9e', icon: '📁' },
  } as const,

  // Message types
  MESSAGE_TYPES: {
    text: { label: 'Text Message', icon: '💬' },
    system: { label: 'System Message', icon: '⚙️' },
    file: { label: 'File Attachment', icon: '📎' },
    event_update: { label: 'Event Update', icon: '📅' },
  } as const,

  // User roles
  USER_ROLES: {
    ADMIN: { label: 'Admin', color: '#9c27b0' },
    CLIENT: { label: 'Client', color: '#3f51b5' },
  } as const,

  // Pagination defaults
  DEFAULT_PAGE_SIZE: 20,
  DEFAULT_MESSAGE_LIMIT: 50,

  // File upload constraints
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES_PER_MESSAGE: 5,
  ALLOWED_FILE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ],

  // WebSocket configuration
  WEBSOCKET: {
    HEARTBEAT_INTERVAL: 30000, // 30 seconds
    RECONNECT_DELAY: 3000, // 3 seconds
    MAX_RECONNECT_ATTEMPTS: 5,
    TYPING_TIMEOUT: 3000, // 3 seconds
  },

  // UI timeouts and debounces
  TYPING_DEBOUNCE_MS: 300,
  SEARCH_DEBOUNCE_MS: 500,
  AUTO_SAVE_DEBOUNCE_MS: 1000,
} as const;

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format a date/timestamp for display in messages
 */
export function formatMessageTimestamp(
  timestamp: string,
  options: {
    includeTime?: boolean;
    includeDate?: boolean;
    relative?: boolean;
  } = {},
): string {
  const { includeTime = true, includeDate = true, relative = false } = options;

  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (relative && diffInMinutes < 60) {
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes === 1) return '1 minute ago';
    return `${diffInMinutes} minutes ago`;
  }

  if (relative && diffInMinutes < 24 * 60) {
    const hours = Math.floor(diffInMinutes / 60);
    if (hours === 1) return '1 hour ago';
    return `${hours} hours ago`;
  }

  const isToday = date.toDateString() === now.toDateString();
  const isYesterday =
    date.toDateString() === new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString();

  if (isToday && !includeDate) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  if (isYesterday && relative) {
    const timeStr = includeTime
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';
    return `Yesterday${timeStr ? ` at ${timeStr}` : ''}`;
  }

  const formatOptions: Intl.DateTimeFormatOptions = {};

  if (includeDate) {
    formatOptions.month = 'short';
    formatOptions.day = 'numeric';
    if (date.getFullYear() !== now.getFullYear()) {
      formatOptions.year = 'numeric';
    }
  }

  if (includeTime) {
    formatOptions.hour = '2-digit';
    formatOptions.minute = '2-digit';
  }

  return date.toLocaleString([], formatOptions);
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Get display information for a priority level
 */
export function getPriorityDisplay(priority: MessagePriority) {
  return MESSAGING_CONSTANTS.PRIORITIES[priority];
}

/**
 * Get display information for a thread status
 */
export function getStatusDisplay(status: MessageThreadStatus) {
  return MESSAGING_CONSTANTS.STATUSES[status];
}

/**
 * Get display information for a message type
 */
export function getMessageTypeDisplay(type: MessageType) {
  return MESSAGING_CONSTANTS.MESSAGE_TYPES[type];
}

/**
 * Get display information for a user role
 */
export function getUserRoleDisplay(role: UserRole) {
  return MESSAGING_CONSTANTS.USER_ROLES[role];
}

/**
 * Truncate text to a specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Generate a preview for message content
 */
export function generateMessagePreview(content: string, maxLength = 100): string {
  // Remove excessive whitespace and newlines
  const cleaned = content.replace(/\s+/g, ' ').trim();
  return truncateText(cleaned, maxLength);
}

// ============================================================================
// Permission Utilities
// ============================================================================

/**
 * Check if a user can access a thread
 */
export function canAccessThread(user: User, thread: MessageThreadListItem): boolean {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'CLIENT') return thread.client.id === user.id;
  return false;
}

/**
 * Check if a user can manage (edit/delete) a thread
 */
export function canManageThread(user: User, _thread?: MessageThreadListItem): boolean {
  return user.role === 'ADMIN';
}

/**
 * Check if a user can create internal notes
 */
export function canCreateInternalNotes(user: User): boolean {
  return user.role === 'ADMIN';
}

/**
 * Check if a user can assign threads
 */
export function canAssignThreads(user: User): boolean {
  return user.role === 'ADMIN';
}

/**
 * Check if a user can access a message
 */
export function canAccessMessage(
  user: User,
  message: Message,
  thread?: MessageThreadListItem,
): boolean {
  // Check thread access first
  if (thread && !canAccessThread(user, thread)) return false;

  // Admins can see all messages
  if (user.role === 'ADMIN') return true;

  // Clients can't see internal notes
  if (message.is_internal_note && user.role === 'CLIENT') return false;

  return true;
}

/**
 * Check if a user can edit a message
 */
export function canEditMessage(user: User, message: Message): boolean {
  return message.sender.id === user.id;
}

/**
 * Get comprehensive permissions for a user and thread
 */
export function getThreadPermissions(
  user: User,
  thread?: MessageThreadListItem,
): ThreadPermissions {
  return {
    canRead: thread ? canAccessThread(user, thread) : true,
    canWrite: thread ? canAccessThread(user, thread) : true,
    canManage: canManageThread(user, thread),
    canCreateInternalNotes: canCreateInternalNotes(user),
    canAssign: canAssignThreads(user),
  };
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate file for upload
 */
export function validateFile(file: File): { isValid: boolean; error?: string } {
  if (file.size > MESSAGING_CONSTANTS.MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds ${formatFileSize(MESSAGING_CONSTANTS.MAX_FILE_SIZE)} limit`,
    };
  }

  if (
    !MESSAGING_CONSTANTS.ALLOWED_FILE_TYPES.includes(
      file.type as (typeof MESSAGING_CONSTANTS.ALLOWED_FILE_TYPES)[number],
    )
  ) {
    return {
      isValid: false,
      error: 'File type not allowed',
    };
  }

  return { isValid: true };
}

/**
 * Validate multiple files for upload
 */
export function validateFiles(files: File[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (files.length > MESSAGING_CONSTANTS.MAX_FILES_PER_MESSAGE) {
    errors.push(`Maximum ${MESSAGING_CONSTANTS.MAX_FILES_PER_MESSAGE} files allowed per message`);
  }

  files.forEach((file, index) => {
    const validation = validateFile(file);
    if (!validation.isValid) {
      errors.push(`File ${index + 1}: ${validation.error}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate message content
 */
export function validateMessageContent(content: string): { isValid: boolean; error?: string } {
  const trimmed = content.trim();

  if (trimmed.length === 0) {
    return { isValid: false, error: 'Message content cannot be empty' };
  }

  if (trimmed.length > 10000) {
    return { isValid: false, error: 'Message content too long (maximum 10,000 characters)' };
  }

  return { isValid: true };
}

// ============================================================================
// Sorting and Filtering Utilities
// ============================================================================

/**
 * Sort threads by priority (urgent first)
 */
export function sortThreadsByPriority(threads: MessageThreadListItem[]): MessageThreadListItem[] {
  return [...threads].sort((a, b) => {
    const aPriority = MESSAGING_CONSTANTS.PRIORITIES[a.priority];
    const bPriority = MESSAGING_CONSTANTS.PRIORITIES[b.priority];
    return aPriority.sortOrder - bPriority.sortOrder;
  });
}

/**
 * Sort threads by last message timestamp (newest first)
 */
export function sortThreadsByLastMessage(
  threads: MessageThreadListItem[],
): MessageThreadListItem[] {
  return [...threads].sort((a, b) => {
    const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    return bTime - aTime;
  });
}

/**
 * Sort threads by unread count (highest first)
 */
export function sortThreadsByUnreadCount(
  threads: MessageThreadListItem[],
): MessageThreadListItem[] {
  return [...threads].sort((a, b) => b.unread_count - a.unread_count);
}

/**
 * Filter threads by status
 */
export function filterThreadsByStatus(
  threads: MessageThreadListItem[],
  statuses: MessageThreadStatus[],
): MessageThreadListItem[] {
  return threads.filter((thread) => statuses.includes(thread.status));
}

/**
 * Filter threads by priority
 */
export function filterThreadsByPriority(
  threads: MessageThreadListItem[],
  priorities: MessagePriority[],
): MessageThreadListItem[] {
  return threads.filter((thread) => priorities.includes(thread.priority));
}

/**
 * Filter threads by search term
 */
export function filterThreadsBySearch(
  threads: MessageThreadListItem[],
  searchTerm: string,
): MessageThreadListItem[] {
  if (!searchTerm.trim()) return threads;

  const term = searchTerm.toLowerCase();
  return threads.filter(
    (thread) =>
      thread.subject.toLowerCase().includes(term) ||
      thread.client_name.toLowerCase().includes(term) ||
      thread.last_message_content.toLowerCase().includes(term) ||
      (thread.event_name && thread.event_name.toLowerCase().includes(term)),
  );
}

// ============================================================================
// URL and Link Utilities
// ============================================================================

/**
 * Generate a URL for a thread detail page
 */
export function getThreadUrl(threadId: string, baseUrl = '/messages'): string {
  return `${baseUrl}/thread/${threadId}`;
}

/**
 * Generate a URL for creating a new thread
 */
export function getNewThreadUrl(
  baseUrl = '/messages',
  params?: { clientId?: string; eventId?: string },
): string {
  const url = `${baseUrl}/new`;
  if (params) {
    const searchParams = new URLSearchParams();
    if (params.clientId) searchParams.set('client', params.clientId);
    if (params.eventId) searchParams.set('event', params.eventId);
    const queryString = searchParams.toString();
    return queryString ? `${url}?${queryString}` : url;
  }
  return url;
}

/**
 * Extract file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot === -1 ? '' : filename.substring(lastDot + 1).toLowerCase();
}

/**
 * Get icon name for file type
 */
export function getFileTypeIcon(attachment: MessageAttachment): string {
  const extension = getFileExtension(attachment.filename);

  if (attachment.file_type.startsWith('image/')) return '🖼️';
  if (attachment.file_type === 'application/pdf') return '📄';
  if (attachment.file_type.includes('word')) return '📝';
  if (attachment.file_type.includes('excel') || attachment.file_type.includes('spreadsheet'))
    return '📊';
  if (attachment.file_type.includes('text')) return '📄';

  // Fallback based on extension
  switch (extension) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return '🖼️';
    case 'pdf':
      return '📄';
    case 'doc':
    case 'docx':
      return '📝';
    case 'xls':
    case 'xlsx':
      return '📊';
    case 'txt':
      return '📄';
    default:
      return '📎';
  }
}

// ============================================================================
// State Management Utilities
// ============================================================================

/**
 * Merge new messages into existing message list while avoiding duplicates
 */
export function mergeMessages(existing: Message[], newMessages: Message[]): Message[] {
  const existingIds = new Set(existing.map((msg) => msg.id));
  const uniqueNew = newMessages.filter((msg) => !existingIds.has(msg.id));
  return [...existing, ...uniqueNew];
}

/**
 * Update a message in a list
 */
export function updateMessageInList(messages: Message[], updatedMessage: Message): Message[] {
  return messages.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg));
}

/**
 * Remove a message from a list
 */
export function removeMessageFromList(messages: Message[], messageId: string): Message[] {
  return messages.filter((msg) => msg.id !== messageId);
}

/**
 * Calculate total unread count across all threads
 */
export function calculateTotalUnreadCount(threads: MessageThreadListItem[]): number {
  return threads.reduce((total, thread) => total + thread.unread_count, 0);
}

// ============================================================================
// Export All Utilities
// ============================================================================

export const messagingUtils = {
  // Constants
  constants: MESSAGING_CONSTANTS,

  // Formatting
  formatMessageTimestamp,
  formatFileSize,
  getPriorityDisplay,
  getStatusDisplay,
  getMessageTypeDisplay,
  getUserRoleDisplay,
  truncateText,
  generateMessagePreview,

  // Permissions
  canAccessThread,
  canManageThread,
  canCreateInternalNotes,
  canAssignThreads,
  canAccessMessage,
  canEditMessage,
  getThreadPermissions,

  // Validation
  validateFile,
  validateFiles,
  validateMessageContent,

  // Sorting and filtering
  sortThreadsByPriority,
  sortThreadsByLastMessage,
  sortThreadsByUnreadCount,
  filterThreadsByStatus,
  filterThreadsByPriority,
  filterThreadsBySearch,

  // URLs and links
  getThreadUrl,
  getNewThreadUrl,
  getFileExtension,
  getFileTypeIcon,

  // State management
  mergeMessages,
  updateMessageInList,
  removeMessageFromList,
  calculateTotalUnreadCount,
};
