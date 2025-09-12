// Generic hook types with conditional type safety for messaging system
// Provides perfect TypeScript integration with role-based features

import type { 
  MessagingConfig,
  AdminMessagingConfig,
  ClientMessagingConfig,
  MessagingState,
  MessagingActions,
  MessagingQueries,
  MessagingMutations,
  WebSocketConnection,
  ConditionalSendMessage,
  ConditionalAssignThread,
  ConditionalBulkOperations,
  ConditionalCannedResponses
} from '../../types/messaging.types';

// === ADVANCED GENERIC HOOK TYPES ===

// Base hook configuration with strict typing
export interface UseMessagingBaseOptions {
  initialThreadId?: string;
  autoConnect?: boolean;
  pollingInterval?: number;
  maxRetries?: number;
  enableOfflineSupport?: boolean;
  enableOptimisticUpdates?: boolean;
  cacheDuration?: number;
}

// Enhanced hook options with generic configuration constraints
export interface UseMessagingEnhancedOptions<T extends MessagingConfig> extends UseMessagingBaseOptions {
  config: T;
  
  // Conditional options based on configuration
  bulkOperationOptions?: T['enableBulkOperations'] extends true ? {
    maxBulkSize: number;
    batchTimeout: number;
    confirmBeforeAction: boolean;
  } : never;
  
  cannedResponseOptions?: T['enableCannedResponses'] extends true ? {
    preloadResponses: boolean;
    cacheResponses: boolean;
    enableQuickInsert: boolean;
  } : never;
  
  typingIndicatorOptions?: T['enableTypingIndicators'] extends true ? {
    debounceMs: number;
    timeoutMs: number;
    showMultipleUsers: boolean;
  } : never;
}

// Strict return type with perfect conditional typing
export interface UseMessagingStrictReturn<T extends MessagingConfig> {
  // Core state - always available
  state: MessagingState & {
    // Configuration-aware state extensions
    canSendInternalNotes: T['enableInternalNotes'];
    canBulkOperate: T['enableBulkOperations'];
    canUseCannedResponses: T['enableCannedResponses'];
    userRole: T['userRole'];
  };
  
  // Core actions - with conditional signatures
  actions: {
    // Base actions available to all users
    sendMessage: ConditionalSendMessage<T>;
    markAsRead: (messageId: string) => Promise<void>;
    setActiveThread: (threadId: string | null) => void;
    refreshThreads: () => Promise<void>;
    loadMoreMessages: (threadId: string, before?: string) => Promise<void>;
    
    // Conditional actions with never types for unavailable features
    assignThread: ConditionalAssignThread<T>;
    bulkOperations: ConditionalBulkOperations<T>;
    cannedResponses: ConditionalCannedResponses<T>;
  } & (T['userRole'] extends 'ADMIN' ? AdminSpecificActions : {}) 
    & (T['userRole'] extends 'CLIENT' ? ClientSpecificActions : {});
  
  // Queries with role-aware data
  queries: MessagingQueries & {
    // Admin-specific queries
    adminAnalytics: T['userRole'] extends 'ADMIN' ? {
      data: AdminAnalyticsData | null;
      isLoading: boolean;
      error: Error | null;
    } : never;
    
    // Client-specific queries  
    clientNotifications: T['userRole'] extends 'CLIENT' ? {
      data: ClientNotification[];
      isLoading: boolean;
      error: Error | null;
    } : never;
  };
  
  // Mutations with conditional availability
  mutations: MessagingMutations<T> & {
    // Extended admin mutations
    bulkAssignThreads: T['enableBulkOperations'] extends true ? {
      mutate: (threadIds: string[], adminId: number) => void;
      isLoading: boolean;
      error: Error | null;
    } : never;
    
    // Extended canned response mutations
    createCannedResponse: T['enableCannedResponses'] extends true ? {
      mutate: (response: { title: string; content: string; category: string }) => void;
      isLoading: boolean;
      error: Error | null;
    } : never;
  };
  
  // WebSocket with enhanced features
  websocket: WebSocketConnection & {
    // Conditional WebSocket features
    typingBroadcast: T['enableTypingIndicators'] extends true ? {
      startTyping: (threadId: string) => void;
      stopTyping: (threadId: string) => void;
      isTyping: boolean;
    } : never;
    
    readReceiptBroadcast: T['enableReadReceipts'] extends true ? {
      markAsRead: (messageId: string) => void;
      getReadReceipts: (messageId: string) => ReadReceiptInfo[];
    } : never;
  };
  
  // Utility functions with type safety
  utils: {
    // Type guards
    isAdmin: () => boolean;
    isClient: () => boolean;
    
    // Configuration helpers
    canPerformAction: <K extends keyof MessagingActions<T>>(action: K) => boolean;
    getAvailableFeatures: () => (keyof T)[];
    
    // Validation helpers
    validateMessage: (content: string) => ValidationResult;
    validateAttachment: (file: File) => ValidationResult;
    
    // Format helpers with localization support
    formatTimestamp: (date: Date) => string;
    formatFileSize: (bytes: number) => string;
    formatThreadTitle: (thread: { event_name: string; client_name: string }) => string;
  };
}

// Admin-specific action types
interface AdminSpecificActions {
  changeThreadPriority: (threadId: string, priority: 'urgent' | 'high' | 'normal' | 'low') => Promise<void>;
  addInternalNote: (threadId: string, note: string) => Promise<void>;
  resolveThread: (threadId: string) => Promise<void>;
  transferThread: (threadId: string, toAdminId: number) => Promise<void>;
  archiveThread: (threadId: string) => Promise<void>;
  getThreadAnalytics: (threadId: string) => Promise<ThreadAnalytics>;
}

// Client-specific action types
interface ClientSpecificActions {
  requestCallback: (threadId: string, preferredTime?: Date) => Promise<void>;
  markThreadUrgent: (threadId: string, reason: string) => Promise<void>;
  uploadAttachment: (threadId: string, file: File) => Promise<string>;
  deleteAttachment: (attachmentId: string) => Promise<void>;
}

// Supporting interfaces
interface AdminAnalyticsData {
  totalThreads: number;
  activeThreads: number;
  averageResponseTime: number;
  resolutionRate: number;
  topCategories: Array<{ category: string; count: number }>;
}

interface ClientNotification {
  id: string;
  type: 'message' | 'status_change' | 'assignment';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

interface ReadReceiptInfo {
  userId: number;
  userName: string;
  readAt: Date;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface ThreadAnalytics {
  messageCount: number;
  averageResponseTime: number;
  participantCount: number;
  attachmentCount: number;
  lastActivity: Date;
  resolutionTime?: number;
}

// === SPECIALIZED HOOK TYPES FOR EACH APPLICATION ===

// Admin CRM Hook Types
export interface UseAdminMessagingOptions extends UseMessagingEnhancedOptions<AdminMessagingConfig> {
  // Admin-specific options
  enableAdvancedAnalytics?: boolean;
  enableBulkActions?: boolean;
  autoAssignmentRules?: AutoAssignmentRule[];
  escalationRules?: EscalationRule[];
}

export interface UseAdminMessagingReturn extends UseMessagingStrictReturn<AdminMessagingConfig> {
  // Admin-specific extensions
  advanced: {
    analytics: AdminAnalyticsData;
    bulkActions: BulkActionManager;
    escalationManager: EscalationManager;
    reportGenerator: ReportGenerator;
  };
}

// Client Portal Hook Types
export interface UseClientMessagingOptions extends UseMessagingEnhancedOptions<ClientMessagingConfig> {
  // Client-specific options
  enableQuickActions?: boolean;
  enableNotifications?: boolean;
  simplifiedInterface?: boolean;
  attachmentPresets?: AttachmentPreset[];
}

export interface UseClientMessagingReturn extends UseMessagingStrictReturn<ClientMessagingConfig> {
  // Client-specific extensions
  client: {
    quickActions: QuickActionManager;
    notifications: ClientNotificationManager;
    attachments: AttachmentManager;
    help: HelpSystemManager;
  };
}

// Supporting interfaces for specialized types
interface AutoAssignmentRule {
  id: string;
  condition: {
    priority?: string;
    clientType?: string;
    eventType?: string;
    keywords?: string[];
  };
  assignTo: number; // Admin ID
  active: boolean;
}

interface EscalationRule {
  id: string;
  trigger: {
    timeThreshold: number; // hours
    priority: string;
    noResponse: boolean;
  };
  action: {
    escalateTo: number; // Admin ID
    changePriority?: string;
    notify: boolean;
  };
  active: boolean;
}

interface BulkActionManager {
  selectAll: () => void;
  selectNone: () => void;
  selectByPriority: (priority: string) => void;
  executeAction: (action: string) => Promise<void>;
  getSelectedCount: () => number;
}

interface EscalationManager {
  checkEscalations: () => Promise<void>;
  createRule: (rule: Omit<EscalationRule, 'id'>) => Promise<string>;
  updateRule: (id: string, updates: Partial<EscalationRule>) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
}

interface ReportGenerator {
  generateThreadReport: (threadId: string) => Promise<ThreadReport>;
  generatePeriodReport: (startDate: Date, endDate: Date) => Promise<PeriodReport>;
  exportToCsv: (data: any[]) => Promise<string>;
  exportToPdf: (data: any[]) => Promise<Blob>;
}

interface QuickActionManager {
  getAvailableActions: (threadId: string) => QuickAction[];
  executeAction: (actionId: string, threadId: string) => Promise<void>;
  customizeActions: (actions: QuickAction[]) => void;
}

interface ClientNotificationManager {
  getUnreadCount: () => number;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  getNotificationSettings: () => NotificationSettings;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
}

interface AttachmentManager {
  validateFile: (file: File) => ValidationResult;
  uploadFile: (file: File, threadId: string) => Promise<string>;
  deleteFile: (attachmentId: string) => Promise<void>;
  getUploadProgress: (uploadId: string) => number;
  cancelUpload: (uploadId: string) => void;
}

interface HelpSystemManager {
  searchHelp: (query: string) => HelpArticle[];
  getQuickTips: (context: string) => QuickTip[];
  reportIssue: (issue: IssueReport) => Promise<string>;
}

interface AttachmentPreset {
  id: string;
  name: string;
  description: string;
  acceptedTypes: string[];
  maxSize: number;
  template?: string;
}

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  color?: string;
  shortcut?: string;
  description?: string;
}

interface NotificationSettings {
  enableEmail: boolean;
  enablePush: boolean;
  enableSms: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  categories: {
    newMessage: boolean;
    statusChange: boolean;
    assignment: boolean;
    reminder: boolean;
  };
}

interface ThreadReport {
  threadId: string;
  summary: string;
  messageCount: number;
  participantCount: number;
  duration: number;
  resolution?: string;
  attachments: string[];
}

interface PeriodReport {
  startDate: Date;
  endDate: Date;
  threadCount: number;
  messageCount: number;
  averageResponseTime: number;
  resolutionRate: number;
  topClients: Array<{ name: string; count: number }>;
  topCategories: Array<{ category: string; count: number }>;
}

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  lastUpdated: Date;
}

interface QuickTip {
  id: string;
  title: string;
  description: string;
  action?: string;
}

interface IssueReport {
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  attachments?: File[];
}

// === UTILITY TYPES FOR BETTER DEVELOPER EXPERIENCE ===

// Helper type to extract configuration from hook options
export type ExtractConfig<T> = T extends UseMessagingEnhancedOptions<infer U> ? U : never;

// Helper type to ensure proper hook usage
export type EnsureValidConfig<T extends MessagingConfig> = T extends AdminMessagingConfig 
  ? UseAdminMessagingOptions
  : T extends ClientMessagingConfig 
    ? UseClientMessagingOptions 
    : UseMessagingEnhancedOptions<T>;

// Helper type for component prop constraints
export type MessagingComponentProps<T extends MessagingConfig> = {
  config: T;
  messaging: UseMessagingStrictReturn<T>;
  className?: string;
  'data-testid'?: string;
};

// Export specialized types for easy consumption
export type AdminMessagingHookOptions = UseAdminMessagingOptions;
export type AdminMessagingHookReturn = UseAdminMessagingReturn;
export type ClientMessagingHookOptions = UseClientMessagingOptions;
export type ClientMessagingHookReturn = UseClientMessagingReturn;