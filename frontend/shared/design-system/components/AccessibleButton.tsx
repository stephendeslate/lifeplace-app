// Accessible Button Component
// Enhanced Material-UI Button with comprehensive accessibility features

import React, { forwardRef } from 'react';
import { Button, type ButtonProps, CircularProgress, Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import { designTokens } from '../tokens/base';

// Enhanced button props with accessibility features
export interface AccessibleButtonProps extends Omit<ButtonProps, 'color'> {
  // Accessibility props
  loading?: boolean;
  loadingText?: string;
  description?: string;
  keyboardShortcut?: string;

  // Visual enhancements
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'inherit';
  glass?: boolean;
  elevated?: boolean;
  rounded?: boolean;

  // Interaction feedback
  hapticFeedback?: boolean;
  soundFeedback?: boolean;
}

const StyledAccessibleButton = styled(Button, {
  shouldForwardProp: (prop) =>
    !['glass', 'elevated', 'rounded', 'hapticFeedback', 'soundFeedback'].includes(prop as string),
})<AccessibleButtonProps>(({
  theme,
  glass = false,
  elevated = false,
  rounded = false,
  color = 'primary',
}) => {
  const isDark = theme.palette.mode === 'dark';

  // Get color configuration
  const getColorConfig = () => {
    switch (color) {
      case 'primary':
        return {
          main: theme.palette.primary.main,
          light: theme.palette.primary.light,
          dark: theme.palette.primary.dark,
          contrast: theme.palette.primary.contrastText,
        };
      case 'secondary':
        return {
          main: theme.palette.secondary.main,
          light: theme.palette.secondary.light,
          dark: theme.palette.secondary.dark,
          contrast: theme.palette.secondary.contrastText,
        };
      case 'success':
        return {
          main: theme.palette.success.main,
          light: theme.palette.success.light,
          dark: theme.palette.success.dark,
          contrast: theme.palette.success.contrastText,
        };
      case 'warning':
        return {
          main: theme.palette.warning.main,
          light: theme.palette.warning.light,
          dark: theme.palette.warning.dark,
          contrast: theme.palette.warning.contrastText,
        };
      case 'error':
        return {
          main: theme.palette.error.main,
          light: theme.palette.error.light,
          dark: theme.palette.error.dark,
          contrast: theme.palette.error.contrastText,
        };
      case 'inherit':
      default:
        return {
          main: theme.palette.grey[600],
          light: theme.palette.grey[400],
          dark: theme.palette.grey[800],
          contrast: theme.palette.getContrastText(theme.palette.grey[600]),
        };
    }
  };

  const colorConfig = getColorConfig();

  return {
    // Base styling
    position: 'relative',
    borderRadius: rounded ? '50px' : designTokens.spacing.radius.lg,
    textTransform: 'none',
    fontWeight: designTokens.typography.fontWeight.semibold,
    fontSize: designTokens.typography.fontSize.sm,
    lineHeight: designTokens.typography.lineHeight.normal,
    padding: `${designTokens.spacing.space[3]} ${designTokens.spacing.space[6]}`,
    minHeight: '44px', // WCAG touch target size
    minWidth: '44px',
    transition: designTokens.animations.transitions.all,

    // Glass morphism effects
    ...(glass && {
      backgroundColor: isDark
        ? designTokens.glass.dark.medium.background
        : designTokens.glass.light.medium.background,
      backdropFilter: designTokens.glass.light.medium.blur,
      WebkitBackdropFilter: designTokens.glass.light.medium.blur,
      border: `1px solid ${
        isDark ? designTokens.glass.dark.medium.border : designTokens.glass.light.medium.border
      }`,
    }),

    // Elevation
    ...(elevated && {
      boxShadow: designTokens.shadows.elevation.md,
    }),

    // Enhanced focus styles for accessibility
    '&:focus': {
      outline: `3px solid ${colorConfig.light}`,
      outlineOffset: '2px',
      boxShadow: `0 0 0 3px ${colorConfig.light}33`, // 20% opacity
    },

    // Focus visible for keyboard navigation
    '&:focus-visible': {
      outline: `3px solid ${colorConfig.main}`,
      outlineOffset: '2px',
      boxShadow: `0 0 0 3px ${colorConfig.main}33`,
    },

    // Enhanced hover effects
    '&:hover': {
      transform: elevated ? 'translateY(-2px)' : 'translateY(-1px)',
      boxShadow: elevated ? designTokens.shadows.elevation.lg : designTokens.shadows.elevation.sm,

      ...(glass && {
        backgroundColor: isDark
          ? designTokens.glass.dark.strong.background
          : designTokens.glass.light.strong.background,
        backdropFilter: designTokens.glass.light.strong.blur,
      }),
    },

    // Active state
    '&:active': {
      transform: 'translateY(0)',
      transition: designTokens.animations.transitions.all.replace('250ms', '100ms'),
    },

    // Disabled state with better accessibility
    '&:disabled': {
      opacity: 0.6,
      cursor: 'not-allowed',
      transform: 'none',

      '&:focus': {
        outline: `2px solid ${theme.palette.grey[400]}`,
        outlineOffset: '2px',
      },
    },

    // Loading state
    '&.loading': {
      color: 'transparent',
      cursor: 'not-allowed',

      '&:hover': {
        transform: 'none',
      },
    },

    // High contrast mode support
    '@media (prefers-contrast: high)': {
      border: `2px solid ${colorConfig.main}`,

      '&:focus': {
        outline: `4px solid ${colorConfig.main}`,
        outlineOffset: '3px',
      },
    },

    // Reduced motion support
    '@media (prefers-reduced-motion: reduce)': {
      transition: 'none',

      '&:hover': {
        transform: 'none',
      },

      '&:active': {
        transform: 'none',
      },
    },

    // Mobile touch optimization
    [theme.breakpoints.down('sm')]: {
      minHeight: '48px', // Larger touch target on mobile
      minWidth: '48px',
      padding: `${designTokens.spacing.space[4]} ${designTokens.spacing.space[6]}`,
    },
  };
});

const LoadingOverlay = styled(Box)(() => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  display: 'flex',
  alignItems: 'center',
  gap: designTokens.spacing.space[2],
}));

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  (
    {
      children,
      loading = false,
      loadingText = 'Loading...',
      description,
      keyboardShortcut,
      disabled,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedby,
      onClick,
      hapticFeedback = false,
      soundFeedback = false,
      ...props
    },
    ref,
  ) => {
    // Generate unique IDs for accessibility
    const descriptionId = React.useId();
    const shortcutId = React.useId();

    // Enhanced click handler with feedback
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) {
        event.preventDefault();
        return;
      }

      // Haptic feedback for supported devices
      if (hapticFeedback && 'vibrate' in navigator) {
        navigator.vibrate(50);
      }

      // Sound feedback (would need audio context in real implementation)
      if (soundFeedback) {
        // Play subtle click sound
        // This would typically use Web Audio API
        console.log('Button click sound');
      }

      onClick?.(event);
    };

    // Build aria-describedby
    const buildAriaDescribedBy = () => {
      const ids = [];
      if (ariaDescribedby) ids.push(ariaDescribedby);
      if (description) ids.push(descriptionId);
      if (keyboardShortcut) ids.push(shortcutId);
      return ids.length > 0 ? ids.join(' ') : undefined;
    };

    return (
      <>
        <StyledAccessibleButton
          ref={ref}
          {...props}
          disabled={disabled || loading}
          onClick={handleClick}
          aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
          aria-describedby={buildAriaDescribedBy()}
          aria-busy={loading}
          className={`${props.className || ''} ${loading ? 'loading' : ''}`.trim()}
          role="button"
          tabIndex={disabled ? -1 : 0}
        >
          {children}

          {loading && (
            <LoadingOverlay role="status" aria-live="polite">
              <CircularProgress size={16} color="inherit" aria-label={loadingText} />
              <span className="sr-only">{loadingText}</span>
            </LoadingOverlay>
          )}
        </StyledAccessibleButton>

        {/* Hidden descriptions for screen readers */}
        {description && (
          <span id={descriptionId} className="sr-only">
            {description}
          </span>
        )}

        {keyboardShortcut && (
          <span id={shortcutId} className="sr-only">
            Keyboard shortcut: {keyboardShortcut}
          </span>
        )}
      </>
    );
  },
);

AccessibleButton.displayName = 'AccessibleButton';

// Convenience components for common use cases
export const PrimaryButton: React.FC<Omit<AccessibleButtonProps, 'color'>> = (
  props: Omit<AccessibleButtonProps, 'color'>,
) => <AccessibleButton color="primary" {...props} />;

export const SecondaryButton: React.FC<Omit<AccessibleButtonProps, 'color'>> = (
  props: Omit<AccessibleButtonProps, 'color'>,
) => <AccessibleButton color="secondary" variant="outlined" {...props} />;

export const GlassButton: React.FC<AccessibleButtonProps> = (props: AccessibleButtonProps) => (
  <AccessibleButton glass elevated {...props} />
);

export const RoundedButton: React.FC<AccessibleButtonProps> = (props: AccessibleButtonProps) => (
  <AccessibleButton rounded {...props} />
);

export const LoadingButton: React.FC<AccessibleButtonProps> = ({
  loading = true,
  ...props
}: AccessibleButtonProps) => <AccessibleButton loading={loading} {...props} />;

export default AccessibleButton;
