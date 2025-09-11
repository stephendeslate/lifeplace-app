// Messaging Accessibility and Dark/Light Mode Support
// WCAG 2.1 AA compliant accessibility features and comprehensive theming system

import type { Theme } from '@mui/material/styles';

// === ACCESSIBILITY CONFIGURATION ===

export interface AccessibilityConfig {
  // Screen reader support
  screenReader: {
    enabled: boolean;
    announceNewMessages: boolean;
    announceThreadChanges: boolean;
    announceStatusUpdates: boolean;
    announcementDelay: number;
  };
  
  // Keyboard navigation
  keyboard: {
    enabled: boolean;
    focusManagement: boolean;
    skipLinks: boolean;
    keyboardShortcuts: boolean;
    focusTrapping: boolean;
  };
  
  // Visual accessibility
  visual: {
    highContrast: boolean;
    reducedMotion: boolean;
    largeText: boolean;
    colorBlindFriendly: boolean;
    focusIndicators: boolean;
  };
  
  // Motor accessibility
  motor: {
    largerClickTargets: boolean;
    reducedPointing: boolean;
    stickyHover: boolean;
    touchAccommodations: boolean;
  };
  
  // Cognitive accessibility
  cognitive: {
    simplifiedInterface: boolean;
    clearLanguage: boolean;
    consistentNavigation: boolean;
    errorPrevention: boolean;
    timeExtensions: boolean;
  };
}

export const defaultA11yConfig: AccessibilityConfig = {
  screenReader: {
    enabled: true,
    announceNewMessages: true,
    announceThreadChanges: true,
    announceStatusUpdates: true,
    announcementDelay: 500,
  },
  keyboard: {
    enabled: true,
    focusManagement: true,
    skipLinks: true,
    keyboardShortcuts: true,
    focusTrapping: true,
  },
  visual: {
    highContrast: false,
    reducedMotion: false,
    largeText: false,
    colorBlindFriendly: true,
    focusIndicators: true,
  },
  motor: {
    largerClickTargets: false,
    reducedPointing: false,
    stickyHover: false,
    touchAccommodations: true,
  },
  cognitive: {
    simplifiedInterface: false,
    clearLanguage: true,
    consistentNavigation: true,
    errorPrevention: true,
    timeExtensions: false,
  },
};

// === ARIA LABELS AND DESCRIPTIONS ===

export const ariaLabels = {
  // Container regions
  messagingContainer: 'Messaging interface',
  threadList: 'Message thread list',
  messageThread: 'Current message conversation',
  messageComposer: 'Message composition area',
  
  // Navigation elements
  threadListNavigation: 'Navigate between message threads',
  backToThreadList: 'Back to thread list',
  nextThread: 'Next thread',
  previousThread: 'Previous thread',
  
  // Interactive elements
  sendButton: 'Send message',
  attachmentButton: 'Attach file',
  emojiButton: 'Add emoji',
  moreActionsButton: 'More message actions',
  
  // Status indicators
  onlineStatus: 'User is online',
  offlineStatus: 'User is offline',
  typingIndicator: 'User is typing',
  unreadBadge: 'Unread messages',
  
  // Priority and status
  urgentPriority: 'Urgent priority message',
  highPriority: 'High priority message',
  normalPriority: 'Normal priority message',
  resolvedStatus: 'Thread resolved',
  activeStatus: 'Active conversation',
  
  // Time and timestamps
  messageTimestamp: 'Message sent at',
  lastActivity: 'Last activity at',
  threadCreated: 'Thread created at',
  
  // Actions
  markAsRead: 'Mark as read',
  markAsUnread: 'Mark as unread',
  deleteMessage: 'Delete message',
  editMessage: 'Edit message',
  replyToMessage: 'Reply to message',
  assignThread: 'Assign thread to admin',
  changeThreadPriority: 'Change thread priority',
  resolveThread: 'Resolve thread',
  
  // File attachments
  imageAttachment: 'Image attachment',
  documentAttachment: 'Document attachment',
  downloadAttachment: 'Download attachment',
  removeAttachment: 'Remove attachment',
};

export const ariaDescriptions = {
  // Complex interactions
  messageComposer: 'Type your message here. Press Enter to send, or Shift+Enter for new line.',
  threadSelection: 'Select a thread to view the conversation. Use arrow keys to navigate.',
  fileUpload: 'Drop files here or click to browse. Supported formats: images, documents, PDFs.',
  
  // Status explanations
  typingIndicator: 'Another user is currently typing a message in this thread.',
  unreadMessages: 'This thread contains unread messages.',
  assignedThread: 'This thread is assigned to an admin for handling.',
  
  // Context information
  threadMetadata: 'Thread information including participants, creation date, and current status.',
  messageMetadata: 'Message details including sender, timestamp, and read status.',
  attachmentPreview: 'Preview of attached file. Click to open or download.',
};

// === KEYBOARD NAVIGATION SYSTEM ===

export const keyboardShortcuts = {
  // Global shortcuts
  global: {
    'Alt+M': 'Open messaging interface',
    'Escape': 'Close current modal or return to thread list',
    'Ctrl+/': 'Show keyboard shortcuts help',
  },
  
  // Thread navigation
  threadList: {
    'ArrowUp': 'Select previous thread',
    'ArrowDown': 'Select next thread',
    'Enter': 'Open selected thread',
    'Space': 'Mark thread as read/unread',
    'Delete': 'Archive thread (admin only)',
    'Home': 'Go to first thread',
    'End': 'Go to last thread',
  },
  
  // Message navigation
  messageThread: {
    'ArrowUp': 'Previous message',
    'ArrowDown': 'Next message',
    'Home': 'Go to first message',
    'End': 'Go to latest message',
    'Ctrl+F': 'Search in thread',
  },
  
  // Composer shortcuts
  composer: {
    'Enter': 'Send message',
    'Shift+Enter': 'New line',
    'Ctrl+B': 'Bold text',
    'Ctrl+I': 'Italic text',
    'Ctrl+K': 'Add link',
    'Ctrl+Shift+A': 'Attach file',
    'Escape': 'Clear composer',
  },
  
  // Admin shortcuts
  admin: {
    'Ctrl+A': 'Assign thread',
    'Ctrl+R': 'Resolve thread',
    'Ctrl+P': 'Change priority',
    'Ctrl+N': 'Add internal note',
    'Ctrl+Shift+R': 'Mark as resolved',
  },
};

// === FOCUS MANAGEMENT SYSTEM ===

export const focusManagement = {
  // Focus trap configuration for modals
  focusTrap: {
    initialFocus: '[data-focus-initial]',
    fallbackFocus: '[data-focus-fallback]',
    escapeDeactivates: true,
    returnFocusOnDeactivate: true,
    allowOutsideClick: false,
  },
  
  // Roving tabindex for lists
  rovingTabindex: {
    orientation: 'vertical' as const,
    loop: true,
    activateOnFocus: true,
  },
  
  // Focus restoration points
  focusRestoration: {
    threadList: '[data-focus-thread-list]',
    messageThread: '[data-focus-message-thread]',
    composer: '[data-focus-composer]',
    previousThread: '[data-focus-previous-thread]',
    nextThread: '[data-focus-next-thread]',
  },
};

// === HIGH CONTRAST THEME OVERRIDES ===

export const createHighContrastTheme = (baseTheme: Theme): Partial<Theme> => ({
  ...baseTheme,
  palette: {
    ...baseTheme.palette,
    // Enhanced contrast ratios for WCAG AAA compliance
    primary: {
      ...baseTheme.palette.primary,
      main: '#003366',
      contrastText: '#ffffff',
    },
    text: {
      primary: '#000000',
      secondary: '#333333',
      disabled: '#666666',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    divider: '#333333',
    // Action colors with high contrast
    action: {
      ...baseTheme.palette.action,
      active: '#000000',
      hover: '#f0f0f0',
      selected: '#e0e0e0',
      disabled: '#999999',
      focus: '#0066cc',
    },
  },
  components: {
    // Message bubble high contrast
    MuiPaper: {
      styleOverrides: {
        root: {
          '&.MessageBubble--sent': {
            background: '#003366',
            color: '#ffffff',
            border: '2px solid #001122',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          },
          '&.MessageBubble--received': {
            background: '#ffffff',
            color: '#000000',
            border: '2px solid #333333',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          },
        },
      },
    },
    // Button high contrast
    MuiButton: {
      styleOverrides: {
        root: {
          border: '2px solid',
          fontWeight: 700,
          '&:focus': {
            outline: '3px solid #0066cc',
            outlineOffset: '2px',
          },
        },
        contained: {
          background: '#003366',
          color: '#ffffff',
          borderColor: '#001122',
          '&:hover': {
            background: '#004488',
            borderColor: '#002244',
          },
        },
        outlined: {
          borderColor: '#333333',
          color: '#000000',
          '&:hover': {
            borderColor: '#000000',
            background: '#f0f0f0',
          },
        },
      },
    },
    // Focus indicators
    MuiCssBaseline: {
      styleOverrides: {
        '*:focus': {
          outline: '3px solid #0066cc !important',
          outlineOffset: '2px !important',
        },
        '*:focus-visible': {
          outline: '3px solid #0066cc !important',
          outlineOffset: '2px !important',
        },
      },
    },
  },
});

// === DARK MODE THEME SYSTEM ===

export const createMessagingDarkTheme = (baseTheme: Theme): Partial<Theme> => ({
  ...baseTheme,
  palette: {
    ...baseTheme.palette,
    mode: 'dark' as const,
    primary: {
      ...baseTheme.palette.primary,
      main: '#2196f3',
      light: '#64b5f6',
      dark: '#1565c0',
      contrastText: '#ffffff',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
      disabled: 'rgba(255, 255, 255, 0.5)',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
    action: {
      ...baseTheme.palette.action,
      active: 'rgba(255, 255, 255, 0.54)',
      hover: 'rgba(255, 255, 255, 0.04)',
      selected: 'rgba(255, 255, 255, 0.08)',
      disabled: 'rgba(255, 255, 255, 0.26)',
      disabledBackground: 'rgba(255, 255, 255, 0.12)',
      focus: 'rgba(255, 255, 255, 0.12)',
    },
  },
  components: {
    // Dark mode message bubbles
    MuiPaper: {
      styleOverrides: {
        root: {
          '&.MessageBubble--sent': {
            background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
            color: '#ffffff',
            boxShadow: '0 4px 16px rgba(33, 150, 243, 0.3)',
          },
          '&.MessageBubble--received': {
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(10px)',
          },
          '&.MessageBubble--system': {
            background: 'rgba(255, 193, 7, 0.1)',
            color: '#ffc107',
            border: '1px solid rgba(255, 193, 7, 0.2)',
          },
        },
      },
    },
    // Dark mode thread list
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.04)',
          },
          '&.Mui-selected': {
            background: 'rgba(33, 150, 243, 0.12)',
            '&:hover': {
              background: 'rgba(33, 150, 243, 0.16)',
            },
          },
        },
      },
    },
    // Dark mode composer
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            background: 'rgba(255, 255, 255, 0.05)',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.08)',
            },
            '&.Mui-focused': {
              background: 'rgba(255, 255, 255, 0.1)',
            },
          },
        },
      },
    },
  },
});

// === SCREEN READER ANNOUNCEMENTS ===

export class ScreenReaderAnnouncer {
  private politeRegion: HTMLElement | null = null;
  private assertiveRegion: HTMLElement | null = null;

  constructor() {
    this.createAnnouncementRegions();
  }

  private createAnnouncementRegions(): void {
    if (typeof document === 'undefined') return;

    // Polite announcements (non-urgent)
    this.politeRegion = document.createElement('div');
    this.politeRegion.setAttribute('aria-live', 'polite');
    this.politeRegion.setAttribute('aria-atomic', 'true');
    this.politeRegion.style.position = 'absolute';
    this.politeRegion.style.left = '-10000px';
    this.politeRegion.style.width = '1px';
    this.politeRegion.style.height = '1px';
    this.politeRegion.style.overflow = 'hidden';
    document.body.appendChild(this.politeRegion);

    // Assertive announcements (urgent)
    this.assertiveRegion = document.createElement('div');
    this.assertiveRegion.setAttribute('aria-live', 'assertive');
    this.assertiveRegion.setAttribute('aria-atomic', 'true');
    this.assertiveRegion.style.position = 'absolute';
    this.assertiveRegion.style.left = '-10000px';
    this.assertiveRegion.style.width = '1px';
    this.assertiveRegion.style.height = '1px';
    this.assertiveRegion.style.overflow = 'hidden';
    document.body.appendChild(this.assertiveRegion);
  }

  announcePolite(message: string, delay: number = 100): void {
    if (!this.politeRegion) return;
    
    setTimeout(() => {
      if (this.politeRegion) {
        this.politeRegion.textContent = message;
      }
    }, delay);
  }

  announceAssertive(message: string, delay: number = 100): void {
    if (!this.assertiveRegion) return;
    
    setTimeout(() => {
      if (this.assertiveRegion) {
        this.assertiveRegion.textContent = message;
      }
    }, delay);
  }

  announceNewMessage(senderName: string, messagePreview: string): void {
    const announcement = `New message from ${senderName}: ${messagePreview.slice(0, 100)}`;
    this.announcePolite(announcement);
  }

  announceThreadChange(threadTitle: string): void {
    const announcement = `Switched to conversation: ${threadTitle}`;
    this.announcePolite(announcement);
  }

  announceStatusChange(status: string): void {
    const announcement = `Thread status changed to ${status}`;
    this.announcePolite(announcement);
  }

  announceError(error: string): void {
    const announcement = `Error: ${error}`;
    this.announceAssertive(announcement);
  }
}

// === ACCESSIBILITY HOOKS ===

export const useAccessibility = (config: AccessibilityConfig = defaultA11yConfig) => {
  const announcer = new ScreenReaderAnnouncer();
  
  // Detect user preferences
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
    
  const prefersHighContrast = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-contrast: high)').matches
    : false;
    
  const prefersLargeText = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-data: reduce)').matches
    : false;

  return {
    // Announcement functions
    announce: {
      polite: announcer.announcePolite.bind(announcer),
      assertive: announcer.announceAssertive.bind(announcer),
      newMessage: announcer.announceNewMessage.bind(announcer),
      threadChange: announcer.announceThreadChange.bind(announcer),
      statusChange: announcer.announceStatusChange.bind(announcer),
      error: announcer.announceError.bind(announcer),
    },
    
    // User preferences
    preferences: {
      reducedMotion: prefersReducedMotion || config.visual.reducedMotion,
      highContrast: prefersHighContrast || config.visual.highContrast,
      largeText: prefersLargeText || config.visual.largeText,
      keyboardNavigation: config.keyboard.enabled,
      screenReaderEnabled: config.screenReader.enabled,
    },
    
    // Accessibility utilities
    utils: {
      // Generate unique IDs for ARIA relationships
      generateId: (prefix: string): string => `${prefix}-${Math.random().toString(36).substr(2, 9)}`,
      
      // Check if element is focusable
      isFocusable: (element: Element): boolean => {
        const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
        return element.matches(focusableSelector);
      },
      
      // Get next/previous focusable element
      getNextFocusable: (current: Element, container: Element): Element | null => {
        const focusable = Array.from(container.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
        const currentIndex = focusable.indexOf(current);
        return focusable[currentIndex + 1] || focusable[0] || null;
      },
      
      getPreviousFocusable: (current: Element, container: Element): Element | null => {
        const focusable = Array.from(container.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
        const currentIndex = focusable.indexOf(current);
        return focusable[currentIndex - 1] || focusable[focusable.length - 1] || null;
      },
    },
    
    // ARIA helpers
    aria: {
      labels: ariaLabels,
      descriptions: ariaDescriptions,
      
      // Generate ARIA attributes for common patterns
      listbox: (id: string) => ({
        role: 'listbox',
        'aria-label': ariaLabels.threadList,
        id,
      }),
      
      option: (id: string, selected: boolean, position: number, setSize: number) => ({
        role: 'option',
        'aria-selected': selected,
        'aria-posinset': position,
        'aria-setsize': setSize,
        id,
      }),
      
      textbox: (id: string, describedBy?: string) => ({
        role: 'textbox',
        'aria-multiline': true,
        'aria-label': ariaLabels.messageComposer,
        'aria-describedby': describedBy,
        id,
      }),
    },
  };
};

// Export comprehensive accessibility system
export default {
  config: defaultA11yConfig,
  labels: ariaLabels,
  descriptions: ariaDescriptions,
  shortcuts: keyboardShortcuts,
  focus: focusManagement,
  themes: {
    highContrast: createHighContrastTheme,
    dark: createMessagingDarkTheme,
  },
  ScreenReaderAnnouncer,
  useAccessibility,
};