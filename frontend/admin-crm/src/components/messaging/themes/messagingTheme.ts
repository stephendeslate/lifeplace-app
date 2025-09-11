// Admin CRM Glassmorphism Messaging Theme Integration
// Simplified, working Material-UI theming that avoids problematic helper function calls

import type { Theme, Components } from '@mui/material/styles';

// === GLASSMORPHISM MESSAGING THEME INTEGRATION ===

export const createMessagingTheme = (baseTheme: Theme) => {
  // Enhanced glassmorphism styles for messaging components
  const glassmorphismStyles = {
    // Primary glass container
    container: {
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(24px) saturate(180%)',
      border: '1px solid rgba(99, 102, 241, 0.18)',
      borderRadius: '24px',
      boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent 0%, rgba(99, 102, 241, 0.6) 25%, rgba(99, 102, 241, 0.8) 50%, rgba(99, 102, 241, 0.6) 75%, transparent 100%)',
      },
    } as const,

    // Interactive glass elements
    interactive: {
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
      '&:hover': {
        background: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(32px) saturate(200%)',
        transform: 'translateY(-1px)',
        boxShadow: '0px 12px 40px rgba(0, 0, 0, 0.15)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
      },
      '&:active': {
        transform: 'translateY(0)',
        transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.6, 1)',
      },
    } as const,

    // Message bubble glass effects
    messageBubble: {
      sent: {
        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
      },
      received: {
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px) saturate(150%)',
        border: '1px solid rgba(156, 163, 175, 0.2)',
        boxShadow: '0px 2px 12px rgba(0, 0, 0, 0.08)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(249, 250, 251, 0.1) 0%, transparent 50%, rgba(243, 244, 246, 0.05) 100%)',
          borderRadius: 'inherit',
          pointerEvents: 'none',
        },
      },
      system: {
        background: 'rgba(59, 130, 246, 0.1)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(59, 130, 246, 0.15)',
        boxShadow: '0px 2px 8px rgba(59, 130, 246, 0.1)',
      },
    } as const,

    // Enhanced animations
    animations: {
      messageSlideIn: {
        animation: 'messageSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        '@keyframes messageSlideIn': {
          '0%': {
            opacity: 0,
            transform: 'translateX(-20px) scale(0.95)',
            filter: 'blur(4px)',
          },
          '50%': {
            opacity: 0.7,
            transform: 'translateX(-5px) scale(0.98)',
            filter: 'blur(2px)',
          },
          '100%': {
            opacity: 1,
            transform: 'translateX(0) scale(1)',
            filter: 'blur(0)',
          },
        },
      },
      threadGlowPulse: {
        animation: 'threadGlowPulse 2s ease-in-out infinite',
        '@keyframes threadGlowPulse': {
          '0%, 100%': {
            boxShadow: '0px 2px 12px rgba(0, 0, 0, 0.08)',
          },
          '50%': {
            boxShadow: '0px 4px 20px rgba(99, 102, 241, 0.2), 0 0 20px rgba(99, 102, 241, 0.1)',
          },
        },
      },
      typingIndicator: {
        animation: 'typingDots 1.4s infinite ease-in-out',
        '@keyframes typingDots': {
          '0%, 60%, 100%': {
            transform: 'translateY(0)',
            opacity: 0.4,
          },
          '30%': {
            transform: 'translateY(-10px)',
            opacity: 1,
          },
        },
      },
    } as const,
  };

  // Material-UI component overrides for messaging
  const messagingComponents: Components<Theme> = {
    // Message Bubbles
    MuiPaper: {
      variants: [
        {
          props: { className: 'MessageBubble--sent' },
          style: {
            ...glassmorphismStyles.messageBubble.sent,
            borderRadius: '18px 18px 4px 18px',
            padding: '12px 16px',
            color: 'white',
            maxWidth: '75%',
            alignSelf: 'flex-end',
            marginLeft: 'auto',
            position: 'relative',
            ...glassmorphismStyles.animations.messageSlideIn,
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: '0px 6px 24px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
            },
          },
        },
        {
          props: { className: 'MessageBubble--received' },
          style: {
            ...glassmorphismStyles.messageBubble.received,
            borderRadius: '18px 18px 18px 4px',
            padding: '12px 16px',
            color: baseTheme.palette.text.primary,
            maxWidth: '75%',
            alignSelf: 'flex-start',
            position: 'relative',
            ...glassmorphismStyles.animations.messageSlideIn,
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.15)',
              transform: 'translateY(-1px)',
              boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.12)',
            },
          },
        },
        {
          props: { className: 'MessageBubble--system' },
          style: {
            ...glassmorphismStyles.messageBubble.system,
            borderRadius: '12px',
            padding: '8px 12px',
            color: baseTheme.palette.info.dark,
            alignSelf: 'center',
            fontSize: '0.875rem',
            fontWeight: 500,
            margin: '8px 0',
            textAlign: 'center',
          },
        },
      ],
    },

    // Thread List Items
    MuiListItemButton: {
      variants: [
        {
          props: { className: 'ThreadListItem' },
          style: {
            borderRadius: '12px',
            margin: '2px 8px',
            background: 'transparent',
            backdropFilter: 'blur(8px)',
            border: '1px solid transparent',
            ...glassmorphismStyles.interactive,
            '&:hover': {
              background: 'rgba(99, 102, 241, 0.05)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(99, 102, 241, 0.15)',
              transform: 'translateX(2px)',
            },
            '&.Mui-selected': {
              background: 'rgba(99, 102, 241, 0.1)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              boxShadow: '0px 4px 16px rgba(99, 102, 241, 0.1)',
              transform: 'translateX(4px)',
              '&::before': {
                content: '""',
                position: 'absolute',
                left: 0,
                top: '20%',
                bottom: '20%',
                width: '3px',
                background: 'linear-gradient(180deg, #6366f1, #4f46e5, #4338ca)',
                borderRadius: '0 2px 2px 0',
              },
              '&:hover': {
                background: 'rgba(99, 102, 241, 0.15)',
              },
            },
          },
        },
      ],
    },

    // Message Composer
    MuiTextField: {
      variants: [
        {
          props: { className: 'MessageComposer' },
          style: {
            '& .MuiOutlinedInput-root': {
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px) saturate(180%)',
              borderRadius: '20px',
              border: '1px solid rgba(156, 163, 175, 0.2)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                '& fieldset': {
                  borderColor: 'transparent',
                },
              },
              '&.Mui-focused': {
                background: 'rgba(99, 102, 241, 0.05)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                boxShadow: '0px 4px 16px rgba(99, 102, 241, 0.1), 0 0 0 3px rgba(99, 102, 241, 0.1)',
                '& fieldset': {
                  borderColor: 'transparent',
                },
              },
              '& fieldset': {
                borderColor: 'transparent',
              },
              '& .MuiInputBase-input': {
                padding: '12px 16px',
              },
            },
            '& .MuiInputLabel-root': {
              color: baseTheme.palette.text.secondary,
              '&.Mui-focused': {
                color: baseTheme.palette.primary.main,
              },
            },
          },
        },
      ],
    },

    // Send Button
    MuiButton: {
      variants: [
        {
          props: { className: 'SendButton' },
          style: {
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '12px',
            padding: '10px 20px',
            minWidth: '48px',
            boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
              transform: 'translateY(-2px)',
              boxShadow: '0px 6px 20px rgba(0, 0, 0, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
            },
            '&:active': {
              transform: 'translateY(0)',
            },
            '&:disabled': {
              background: 'rgba(156, 163, 175, 0.1)',
              color: baseTheme.palette.text.disabled,
              border: '1px solid rgba(156, 163, 175, 0.2)',
              transform: 'none',
            },
          },
        },
        {
          props: { className: 'AttachmentButton' },
          style: {
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(156, 163, 175, 0.2)',
            borderRadius: '12px',
            padding: '8px',
            minWidth: '40px',
            color: baseTheme.palette.text.secondary,
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.15)',
              color: baseTheme.palette.primary.main,
              border: '1px solid rgba(99, 102, 241, 0.2)',
              transform: 'translateY(-1px)',
            },
          },
        },
      ],
    },

    // Typing Indicator
    MuiChip: {
      variants: [
        {
          props: { className: 'TypingIndicator' },
          style: {
            background: 'rgba(59, 130, 246, 0.1)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(59, 130, 246, 0.15)',
            borderRadius: '12px',
            color: baseTheme.palette.info.dark,
            fontSize: '0.75rem',
            height: 'auto',
            padding: '4px 8px',
            ...glassmorphismStyles.animations.typingIndicator,
            '& .MuiChip-label': {
              padding: 0,
            },
          },
        },
      ],
    },

    // Priority Badges
    MuiBadge: {
      variants: [
        {
          props: { className: 'PriorityBadge--urgent' },
          style: {
            '& .MuiBadge-badge': {
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              boxShadow: '0px 2px 8px rgba(239, 68, 68, 0.2)',
              animation: 'urgentPulse 2s infinite',
              '@keyframes urgentPulse': {
                '0%, 100%': {
                  transform: 'scale(1)',
                  opacity: 1,
                },
                '50%': {
                  transform: 'scale(1.1)',
                  opacity: 0.9,
                },
              },
            },
          },
        },
      ],
    },

    // Scrollbar Styling
    MuiCssBaseline: {
      styleOverrides: {
        '.MessagingContainer': {
          // Custom scrollbar for webkit browsers
          '& *::-webkit-scrollbar': {
            width: '6px',
          },
          '& *::-webkit-scrollbar-track': {
            background: 'rgba(156, 163, 175, 0.1)',
            borderRadius: '3px',
          },
          '& *::-webkit-scrollbar-thumb': {
            background: 'rgba(99, 102, 241, 0.2)',
            borderRadius: '3px',
            border: '1px solid rgba(99, 102, 241, 0.1)',
            '&:hover': {
              background: 'rgba(99, 102, 241, 0.3)',
            },
          },
          
          // Custom scrollbar for Firefox
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(99, 102, 241, 0.3) transparent',
        },
      },
    },
  };

  return {
    components: messagingComponents,
    glassmorphismStyles,
  };
};

// === RESPONSIVE DESIGN SYSTEM ===

export const createResponsiveMessagingTheme = (baseTheme: Theme) => {
  const { components, glassmorphismStyles } = createMessagingTheme(baseTheme);
  
  // Responsive overrides
  const responsiveComponents: Components<Theme> = {
    ...components,
    
    // Mobile message bubbles
    MuiPaper: {
      ...components.MuiPaper,
      variants: [
        ...(components.MuiPaper?.variants || []),
        {
          props: { className: 'MessageBubble--mobile' },
          style: {
            [baseTheme.breakpoints.down('sm')]: {
              maxWidth: '85%',
              fontSize: '0.875rem',
              padding: '10px 14px',
            },
          },
        },
      ],
    },
  };
  
  return {
    components: responsiveComponents,
    glassmorphismStyles,
  };
};

// === DARK MODE INTEGRATION ===

export const createDarkMessagingTheme = (baseTheme: Theme) => {
  const darkGlassStyles = {
    container: {
      background: 'rgba(26, 26, 26, 0.85)',
      backdropFilter: 'blur(24px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
    },
    messageBubble: {
      received: {
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      },
    },
  };

  const { components } = createMessagingTheme(baseTheme);
  
  // Apply dark mode overrides
  const darkComponents: Components<Theme> = {
    ...components,
  };

  return {
    components: darkComponents,
    glassmorphismStyles: { ...createMessagingTheme(baseTheme).glassmorphismStyles, ...darkGlassStyles },
  };
};

// Export default theme creator
export default createMessagingTheme;

// === ACCESSIBILITY ENHANCEMENTS ===

export const a11yMessagingStyles = {
  focusVisible: {
    outline: '2px solid #6366f1',
    outlineOffset: '2px',
    borderRadius: '4px',
  },
  
  highContrast: {
    messageBubble: {
      sent: {
        background: '#4f46e5',
        color: 'white',
        border: '2px solid #4338ca',
      },
      received: {
        background: '#f9fafb',
        color: '#111827',
        border: '2px solid #d1d5db',
      },
    },
  },
  
  reducedMotion: {
    '&, & *': {
      animationDuration: '0.01ms !important',
      animationIterationCount: '1 !important',
      transitionDuration: '0.01ms !important',
    },
  },
};