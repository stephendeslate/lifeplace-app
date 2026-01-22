// frontend/admin-crm/src/components/walkthrough/WalkthroughTooltip.tsx

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import {
  Box,
  Typography,
  Button,
  IconButton,
  LinearProgress,
  Stack,
  useTheme,
} from '@mui/material';
import {
  Close as CloseIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  Check as DoneIcon,
} from '@mui/icons-material';
import { tokens, createTransition } from '../../design-system/tokens';
import type { WalkthroughTooltipProps, StepPlacement } from '../../types/walkthrough.types';

const TOOLTIP_Z_INDEX = 10002;

// Map our placement type to tippy placement
const mapPlacement = (placement?: StepPlacement): TippyInstance['props']['placement'] => {
  if (!placement) return 'bottom';
  return placement as TippyInstance['props']['placement'];
};

export const WalkthroughTooltip: React.FC<WalkthroughTooltipProps> = ({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  onClose,
  isFirstStep,
  isLastStep,
  targetRect,
}) => {
  const theme = useTheme();
  const tippyInstance = useRef<TippyInstance | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  const isDark = theme.palette.mode === 'dark';
  const progress = ((stepIndex + 1) / totalSteps) * 100;

  // Create and manage tippy instance with a container element
  useEffect(() => {
    if (!targetRect) return;

    // Create a container div for tippy to manage
    if (!containerRef.current) {
      containerRef.current = document.createElement('div');
      containerRef.current.className = 'walkthrough-tooltip-container';
    }

    // Destroy existing instance
    if (tippyInstance.current) {
      tippyInstance.current.destroy();
      tippyInstance.current = null;
    }

    // Create new tippy instance with the container
    const instance = tippy(document.body, {
      getReferenceClientRect: () => targetRect,
      content: containerRef.current,
      showOnCreate: true,
      interactive: true,
      trigger: 'manual',
      placement: mapPlacement(step.placement),
      animation: 'shift-away',
      duration: [200, 150],
      offset: [0, 16],
      zIndex: TOOLTIP_Z_INDEX,
      appendTo: document.body,
      popperOptions: {
        modifiers: [
          {
            name: 'flip',
            options: {
              fallbackPlacements: ['top', 'left', 'right', 'bottom'],
            },
          },
          {
            name: 'preventOverflow',
            options: {
              padding: 16,
              boundary: 'viewport',
            },
          },
        ],
      },
      onShow: () => {
        setIsVisible(true);
      },
      onHide: () => {
        setIsVisible(false);
      },
      onMount: () => {
        // Set portal container after tippy mounts
        setPortalContainer(containerRef.current);
      },
    });

    tippyInstance.current = instance;

    return () => {
      if (tippyInstance.current) {
        tippyInstance.current.destroy();
        tippyInstance.current = null;
      }
    };
  }, [targetRect, step.placement]);

  // Update position when targetRect changes
  useEffect(() => {
    if (tippyInstance.current && targetRect) {
      tippyInstance.current.setProps({
        getReferenceClientRect: () => targetRect,
        placement: mapPlacement(step.placement),
      });
    }
  }, [targetRect, step.placement]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case 'ArrowRight':
      case 'Enter':
        e.preventDefault();
        if (isLastStep) {
          onClose();
        } else {
          onNext();
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (!isFirstStep) {
          onPrev();
        }
        break;
    }
  }, [onNext, onPrev, onClose, isFirstStep, isLastStep]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Focus the next/done button when visible
  useEffect(() => {
    if (isVisible && portalContainer) {
      const focusButton = portalContainer.querySelector<HTMLButtonElement>('[data-autofocus]');
      focusButton?.focus();
    }
  }, [isVisible, stepIndex, portalContainer]);

  // Render tooltip content into the portal container
  const tooltipContent = (
    <Box
      sx={{
        maxWidth: 380,
        minWidth: 320,
        backgroundColor: isDark ? tokens.color.neutral[800] : 'white',
        borderRadius: `${tokens.spacing.radius.xl}px`,
        boxShadow: `
          0 25px 50px -12px rgba(0, 0, 0, 0.25),
          0 0 0 1px ${isDark ? tokens.color.neutral[700] : tokens.color.neutral[200]}
        `,
        overflow: 'hidden',
        visibility: isVisible ? 'visible' : 'hidden',
        opacity: isVisible ? 1 : 0,
        transition: ['opacity', 'visibility'].map(prop => createTransition(prop, 'fast')).join(', '),
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Tour step ${stepIndex + 1} of ${totalSteps}: ${step.title}`}
    >
      {/* Progress bar */}
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 3,
          backgroundColor: isDark ? tokens.color.neutral[700] : tokens.color.neutral[100],
          '& .MuiLinearProgress-bar': {
            backgroundColor: tokens.color.primary[500],
            transition: createTransition('transform', 'normal'),
          },
        }}
      />

      {/* Header with close button */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          p: 2.5,
          pb: 0,
        }}
      >
        <Box sx={{ flex: 1, pr: 1 }}>
          <Typography
            variant="subtitle1"
            fontWeight={600}
            sx={{
              color: isDark ? tokens.color.neutral[50] : tokens.color.neutral[900],
              lineHeight: 1.3,
            }}
          >
            {step.title}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: isDark ? tokens.color.neutral[400] : tokens.color.neutral[500],
              mt: 0.5,
              display: 'block',
            }}
          >
            Step {stepIndex + 1} of {totalSteps}
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={onClose}
          aria-label="Close tour"
          sx={{
            ml: 1,
            color: isDark ? tokens.color.neutral[400] : tokens.color.neutral[500],
            '&:hover': {
              backgroundColor: isDark ? tokens.color.neutral[700] : tokens.color.neutral[100],
            },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ px: 2.5, py: 2 }}>
        <Typography
          variant="body2"
          sx={{
            color: isDark ? tokens.color.neutral[300] : tokens.color.neutral[600],
            lineHeight: 1.6,
          }}
        >
          {step.content}
        </Typography>
      </Box>

      {/* Actions */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2.5,
          py: 2,
          pt: 0,
          gap: 1,
        }}
      >
        <Button
          size="small"
          onClick={onSkip}
          sx={{
            color: isDark ? tokens.color.neutral[400] : tokens.color.neutral[500],
            textTransform: 'none',
            fontWeight: 500,
            '&:hover': {
              backgroundColor: 'transparent',
              color: isDark ? tokens.color.neutral[300] : tokens.color.neutral[600],
            },
          }}
        >
          Skip tour
        </Button>

        <Stack direction="row" spacing={1}>
          {!isFirstStep && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<PrevIcon />}
              onClick={onPrev}
              sx={{
                textTransform: 'none',
                fontWeight: 500,
                borderColor: isDark ? tokens.color.neutral[600] : tokens.color.neutral[300],
                color: isDark ? tokens.color.neutral[300] : tokens.color.neutral[700],
                '&:hover': {
                  borderColor: isDark ? tokens.color.neutral[500] : tokens.color.neutral[400],
                  backgroundColor: isDark ? tokens.color.neutral[700] : tokens.color.neutral[50],
                },
              }}
            >
              Back
            </Button>
          )}
          <Button
            size="small"
            variant="contained"
            endIcon={isLastStep ? <DoneIcon /> : <NextIcon />}
            onClick={isLastStep ? onClose : onNext}
            data-autofocus
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              backgroundColor: tokens.color.primary[600],
              '&:hover': {
                backgroundColor: tokens.color.primary[700],
              },
            }}
          >
            {isLastStep ? 'Done' : 'Next'}
          </Button>
        </Stack>
      </Box>
    </Box>
  );

  // Use createPortal to render into the tippy-managed container
  return portalContainer ? createPortal(tooltipContent, portalContainer) : null;
};

export default WalkthroughTooltip;
