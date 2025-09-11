// Client Portal Clean Aesthetic Messaging Theme Integration  
// Nature-inspired Material-UI theming that seamlessly integrates with existing organic design

// Client Portal Clean Aesthetic Messaging Theme Integration  
// Nature-inspired Material-UI theming that seamlessly integrates with existing organic design
import type { Theme, Components } from '@mui/material/styles';
import { tokens } from '../../../design-system/tokens';

// === NATURE-INSPIRED MESSAGING THEME INTEGRATION ===

export const createClientMessagingTheme = (_baseTheme: Theme) => {
  // Nature-inspired clean aesthetic styles for messaging components
  const organicStyles = {
    // Primary messaging container with nature-inspired design
    container: {
      background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(250,255,247,0.98) 100%)',
      borderRadius: '24px',
      border: '1px solid rgba(45, 80, 22, 0.08)',
      boxShadow: '0px 8px 32px rgba(45, 80, 22, 0.12), inset 0 1px 0 rgba(255,255,255,0.8)',
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `radial-gradient(800px circle at 50% 0%, 
          rgba(90, 124, 71, 0.03) 0%, 
          transparent 50%
        )`,
        pointerEvents: 'none',
      },
    } as const,

    // Clean interactive elements with organic feel
    interactive: {
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0px 12px 40px rgba(45, 80, 22, 0.15)',
        borderColor: 'rgba(45, 80, 22, 0.15)',
      },
      '&:active': {
        transform: 'translateY(-1px)',
        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.6, 1)',
      },
    } as const,

    // Message bubble designs with organic shapes and nature colors
    messageBubble: {
      sent: {
        background: `linear-gradient(135deg, 
          ${tokens.color.base.forest[600]} 0%, 
          ${tokens.color.base.forest[700]} 100%
        )`,
        color: 'white',
        borderRadius: '20px 20px 6px 20px',
        boxShadow: '0px 4px 16px rgba(45, 80, 22, 0.25), inset 0 1px 0 rgba(255,255,255,0.15)',
        border: '1px solid rgba(255,255,255,0.1)',
        position: 'relative',
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 70%)',
          borderRadius: 'inherit',
          pointerEvents: 'none',
        },
      },
      received: {
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(20px)',
        color: tokens.color.base.sage[800],
        borderRadius: '20px 20px 20px 6px',
        border: `1px solid ${tokens.color.base.sage[100]}`,
        boxShadow: '0px 2px 12px rgba(45, 80, 22, 0.08), inset 0 1px 0 rgba(255,255,255,0.6)',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at 20% 20%, 
            rgba(90, 124, 71, 0.02) 0%, 
            transparent 50%
          )`,
          borderRadius: 'inherit',
          pointerEvents: 'none',
        },
      },
      system: {
        background: `linear-gradient(135deg, 
          ${tokens.color.glass.coloredGlass.gold.background} 0%, 
          rgba(255, 251, 234, 0.6) 100%
        )`,
        backdropFilter: 'blur(16px)',
        color: tokens.color.base.earth[700],
        borderRadius: '16px',
        border: `1px solid ${tokens.color.base.gold[200]}`,
        boxShadow: '0px 2px 8px rgba(255, 215, 0, 0.1)',
        fontSize: '0.875rem',
        fontWeight: 500,
      },
    } as const,

    // Smooth, nature-inspired animations
    animations: {
      messageGrow: {
        animation: 'messageGrow 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        '@keyframes messageGrow': {
          '0%': {
            opacity: 0,
            transform: 'scale(0.8) translateY(10px)',
          },
          '50%': {
            opacity: 0.8,
            transform: 'scale(1.02) translateY(-2px)',
          },
          '100%': {
            opacity: 1,
            transform: 'scale(1) translateY(0)',
          },
        },
      },
      threadHighlight: {
        animation: 'threadHighlight 0.6s ease-out forwards',
        '@keyframes threadHighlight': {
          '0%': {
            background: 'transparent',
          },
          '30%': {
            background: 'rgba(90, 124, 71, 0.05)',
          },
          '100%': {
            background: 'rgba(90, 124, 71, 0.02)',
          },
        },
      },
      floatingLeaf: {
        animation: 'floatingLeaf 3s ease-in-out infinite',
        '@keyframes floatingLeaf': {
          '0%, 100%': {
            transform: 'translateY(0px) rotate(0deg)',
          },
          '50%': {
            transform: 'translateY(-4px) rotate(1deg)',
          },
        },
      },
    } as const,
  };

  // Material-UI component overrides for client portal messaging
  const clientMessagingComponents: Components<Theme> = {

    // Message Bubble Components
    MuiPaper: {
      variants: [
        {
          props: { className: 'ClientMessageBubble--sent' },
          style: {
            ...organicStyles.messageBubble.sent,
            padding: '14px 18px',
            maxWidth: '70%',
            alignSelf: 'flex-end',
            marginLeft: 'auto',
            ...organicStyles.animations.messageGrow,
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: '0px 6px 20px rgba(45, 80, 22, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
            },
          },
        },
        {
          props: { className: 'ClientMessageBubble--received' },
          style: {
            ...organicStyles.messageBubble.received,
            padding: '14px 18px',
            maxWidth: '70%',
            alignSelf: 'flex-start',
            ...organicStyles.animations.messageGrow,
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.95)',
              transform: 'translateY(-1px)',
              boxShadow: '0px 4px 16px rgba(45, 80, 22, 0.12), inset 0 1px 0 rgba(255,255,255,0.8)',
            },
          },
        },
        {
          props: { className: 'ClientMessageBubble--system' },
          style: {
            ...organicStyles.messageBubble.system,
            padding: '10px 16px',
            alignSelf: 'center',
            margin: '12px 0',
            textAlign: 'center',
            maxWidth: '80%',
          },
        },
      ],
    },

    // Thread List Items with organic styling
    MuiListItemButton: {
      variants: [
        {
          props: { className: 'ClientThreadListItem' },
          style: {
            borderRadius: '16px',
            margin: '4px 12px',
            background: 'transparent',
            border: '1px solid transparent',
            ...organicStyles.interactive,
            '&:hover': {
              background: 'rgba(90, 124, 71, 0.04)',
              border: `1px solid ${tokens.color.base.forest[200]}`,
              transform: 'translateX(4px)',
            },
            '&.Mui-selected': {
              background: `linear-gradient(135deg, 
                rgba(90, 124, 71, 0.08) 0%, 
                rgba(90, 124, 71, 0.04) 100%
              )`,
              border: `1px solid ${tokens.color.base.forest[300]}`,
              transform: 'translateX(6px)',
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                left: '-8px',
                top: '30%',
                bottom: '30%',
                width: '4px',
                background: `linear-gradient(180deg, 
                  ${tokens.color.base.forest[500]} 0%, 
                  ${tokens.color.base.forest[600]} 100%
                )`,
                borderRadius: '2px',
              },
              '&:hover': {
                background: `linear-gradient(135deg, 
                  rgba(90, 124, 71, 0.12) 0%, 
                  rgba(90, 124, 71, 0.06) 100%
                )`,
              },
            },
          },
        },
      ],
    },

    // Message Composer with nature-inspired styling
    MuiTextField: {
      variants: [
        {
          props: { className: 'ClientMessageComposer' },
          style: {
            '& .MuiOutlinedInput-root': {
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px',
              border: `2px solid ${tokens.color.base.sage[200]}`,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.95)',
                border: `2px solid ${tokens.color.base.forest[400]}`,
                '& fieldset': {
                  borderColor: 'transparent',
                },
              },
              '&.Mui-focused': {
                background: 'rgba(255, 255, 255, 1)',
                border: `2px solid ${tokens.color.base.forest[500]}`,
                boxShadow: `0 0 0 4px rgba(45, 80, 22, 0.1)`,
                '& fieldset': {
                  borderColor: 'transparent',
                },
              },
              '& fieldset': {
                borderColor: 'transparent',
              },
              '& .MuiInputBase-input': {
                padding: '14px 18px',
                fontSize: '1rem',
                lineHeight: 1.5,
              },
              '& .MuiInputBase-multiline': {
                padding: '12px 18px',
              },
            },
            '& .MuiInputLabel-root': {
              color: tokens.color.base.sage[600],
              '&.Mui-focused': {
                color: tokens.color.base.forest[600],
              },
            },
          },
        },
      ],
    },

    // Action Buttons with nature-inspired design
    MuiButton: {
      variants: [
        {
          props: { className: 'ClientSendButton' },
          style: {
            background: `linear-gradient(135deg, 
              ${tokens.color.base.forest[500]} 0%, 
              ${tokens.color.base.forest[600]} 100%
            )`,
            borderRadius: '16px',
            padding: '12px 24px',
            minWidth: '56px',
            height: '48px',
            boxShadow: '0px 4px 16px rgba(45, 80, 22, 0.2)',
            color: 'white',
            fontWeight: 600,
            letterSpacing: '0.5px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              background: `linear-gradient(135deg, 
                ${tokens.color.base.forest[600]} 0%, 
                ${tokens.color.base.forest[700]} 100%
              )`,
              transform: 'translateY(-2px)',
              boxShadow: '0px 8px 24px rgba(45, 80, 22, 0.3)',
            },
            '&:active': {
              transform: 'translateY(-1px)',
            },
            '&:disabled': {
              background: tokens.color.base.sage[300],
              color: tokens.color.base.sage[500],
              boxShadow: 'none',
              transform: 'none',
            },
          },
        },
        {
          props: { className: 'ClientAttachmentButton' },
          style: {
            background: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '12px',
            padding: '10px',
            minWidth: '44px',
            height: '44px',
            border: `2px solid ${tokens.color.base.sage[200]}`,
            color: tokens.color.base.sage[700],
            '&:hover': {
              background: 'rgba(90, 124, 71, 0.04)',
              border: `2px solid ${tokens.color.base.forest[400]}`,
              color: tokens.color.base.forest[600],
              transform: 'translateY(-1px)',
            },
          },
        },
        {
          props: { className: 'ClientQuickAction' },
          style: {
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(8px)',
            borderRadius: '12px',
            padding: '8px 16px',
            border: `1px solid ${tokens.color.base.sage[200]}`,
            color: tokens.color.base.sage[700],
            fontSize: '0.875rem',
            fontWeight: 500,
            '&:hover': {
              background: 'rgba(90, 124, 71, 0.05)',
              border: `1px solid ${tokens.color.base.forest[300]}`,
              color: tokens.color.base.forest[600],
            },
          },
        },
      ],
    },

    // Status Indicators with nature colors
    MuiChip: {
      variants: [
        {
          props: { className: 'ClientTypingIndicator' },
          style: {
            background: 'rgba(139, 69, 19, 0.1)',
            color: tokens.color.base.earth[700],
            border: `1px solid ${tokens.color.base.earth[200]}`,
            borderRadius: '12px',
            height: '28px',
            fontSize: '0.75rem',
            fontWeight: 500,
            ...organicStyles.animations.floatingLeaf,
            '& .MuiChip-label': {
              padding: '0 8px',
            },
          },
        },
        {
          props: { className: 'ClientOnlineStatus' },
          style: {
            background: tokens.color.semantic.success.glass,
            color: tokens.color.semantic.success.dark,
            border: `1px solid ${tokens.color.semantic.success.light}`,
            borderRadius: '10px',
            height: '24px',
            fontSize: '0.75rem',
          },
        },
      ],
    },

    // Priority and Status Badges
    MuiBadge: {
      variants: [
        {
          props: { className: 'ClientPriorityBadge--high' },
          style: {
            '& .MuiBadge-badge': {
              background: `linear-gradient(135deg, 
                ${tokens.color.semantic.warning.main} 0%, 
                ${tokens.color.base.gold[500]} 100%
              )`,
              color: 'white',
              fontWeight: 600,
              boxShadow: '0px 2px 8px rgba(255, 152, 0, 0.3)',
            },
          },
        },
        {
          props: { className: 'ClientUnreadBadge' },
          style: {
            '& .MuiBadge-badge': {
              background: tokens.color.base.forest[600],
              color: 'white',
              fontWeight: 600,
              fontSize: '0.75rem',
              minWidth: '20px',
              height: '20px',
            },
          },
        },
      ],
    },

    // Avatar styling for nature theme
    MuiAvatar: {
      variants: [
        {
          props: { className: 'ClientMessageAvatar' },
          style: {
            border: `2px solid ${tokens.color.base.sage[200]}`,
            background: `linear-gradient(135deg, 
              ${tokens.color.base.sage[100]} 0%, 
              ${tokens.color.base.sage[50]} 100%
            )`,
            color: tokens.color.base.sage[700],
          },
        },
      ],
    },

    // Divider with organic styling
    MuiDivider: {
      variants: [
        {
          props: { className: 'ClientMessageDivider' },
          style: {
            margin: '16px 0',
            '&::before, &::after': {
              borderColor: tokens.color.base.sage[200],
              borderWidth: '1px',
            },
            '& .MuiDivider-wrapper': {
              background: 'rgba(255, 255, 255, 0.9)',
              color: tokens.color.base.sage[600],
              fontSize: '0.75rem',
              fontWeight: 500,
              padding: '0 16px',
              borderRadius: '12px',
              border: `1px solid ${tokens.color.base.sage[200]}`,
            },
          },
        },
      ],
    },

    // Custom scrollbar styling for client portal
    MuiCssBaseline: {
      styleOverrides: {
        '.ClientMessagingContainer': {
          // Webkit scrollbar
          '& *::-webkit-scrollbar': {
            width: '8px',
          },
          '& *::-webkit-scrollbar-track': {
            background: 'rgba(245, 246, 244, 0.6)',
            borderRadius: '4px',
          },
          '& *::-webkit-scrollbar-thumb': {
            background: `linear-gradient(180deg, 
              ${tokens.color.base.sage[300]} 0%, 
              ${tokens.color.base.sage[400]} 100%
            )`,
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            '&:hover': {
              background: `linear-gradient(180deg, 
                ${tokens.color.base.forest[400]} 0%, 
                ${tokens.color.base.forest[500]} 100%
              )`,
            },
          },
          
          // Firefox scrollbar
          scrollbarWidth: 'thin',
          scrollbarColor: `${tokens.color.base.sage[400]} rgba(245, 246, 244, 0.6)`,
        },
      },
    },
  };

  return {
    components: clientMessagingComponents,
    organicStyles,
  };
};

// === RESPONSIVE CLIENT PORTAL THEME ===

export const createResponsiveClientMessagingTheme = (baseTheme: Theme) => {
  const { components, organicStyles } = createClientMessagingTheme(baseTheme);
  
  // Mobile-first responsive enhancements
  const responsiveComponents: Components<Theme> = {
    ...components,
    
    // Touch-friendly message bubbles
    MuiPaper: {
      ...components.MuiPaper,
      variants: [
        ...components.MuiPaper!.variants!,
        {
          props: { className: 'ClientMessageBubble--mobile' },
          style: {
            [baseTheme.breakpoints.down('sm')]: {
              maxWidth: '82%',
              padding: '12px 16px',
              fontSize: '0.9rem',
              lineHeight: 1.4,
            },
          },
        },
      ],
    },
    
    // Mobile composer enhancements
    MuiTextField: {
      ...components.MuiTextField,
      variants: [
        ...components.MuiTextField!.variants!,
        {
          props: { className: 'ClientMessageComposer--mobile' },
          style: {
            [baseTheme.breakpoints.down('sm')]: {
              '& .MuiOutlinedInput-root': {
                borderRadius: '16px',
                '& .MuiInputBase-input': {
                  padding: '12px 16px',
                  fontSize: '16px', // Prevents zoom on iOS
                },
              },
            },
          },
        },
      ],
    },
  };
  
  return {
    components: responsiveComponents,
    organicStyles,
  };
};

// Export default theme creator
export default createClientMessagingTheme;

// === ACCESSIBILITY AND CONTRAST ENHANCEMENTS ===

export const a11yClientMessagingStyles = {
  // High contrast mode adjustments
  highContrast: {
    messageBubble: {
      sent: {
        background: tokens.color.base.forest[700],
        color: 'white',
        border: `3px solid ${tokens.color.base.forest[800]}`,
        boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.3)',
      },
      received: {
        background: 'white',
        color: tokens.color.base.sage[900],
        border: `3px solid ${tokens.color.base.sage[400]}`,
        boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.15)',
      },
    },
  },
  
  // Focus indicators
  focusVisible: {
    outline: `3px solid ${tokens.color.base.forest[500]}`,
    outlineOffset: '2px',
    borderRadius: '4px',
  },
  
  // Reduced motion preferences
  reducedMotion: {
    '&, & *, & *::before, & *::after': {
      animationDuration: '0.01ms !important',
      animationIterationCount: '1 !important',
      transitionDuration: '0.01ms !important',
      scrollBehavior: 'auto !important',
    },
  },
};