// frontend/client-portal/src/components/booking/BookingContainer/BookingNavigation.tsx

import React from 'react';
import { Box, Button, alpha } from '@mui/material';
import { ArrowBack, ArrowForward, SkipNext, RequestQuote } from '@mui/icons-material';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import type { BookingContainerLogic } from './useBookingContainerLogic';

interface BookingNavigationProps {
  logic: BookingContainerLogic;
}

export const BookingNavigation: React.FC<BookingNavigationProps> = ({ logic }) => {
  const { theme, state, actions, showQuickQuoteExitRamp, nextButtonLabel, showNextButton } = logic;

  return (
    <AnimatedElement animation="slideUp" delay={400}>
      <Box
        sx={{
          mt: 4,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
        }}
      >
        {/* Back Button */}
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={actions.previousStep}
          disabled={!state.progress.canGoBack || state.ui.isSubmitting}
          sx={{ minWidth: 120 }}
        >
          Back
        </Button>

        {/* Center: Skip Button */}
        <Box sx={{ flex: 1, textAlign: 'center' }}>
          {state.progress.canSkip && (
            <Button
              variant="text"
              startIcon={<SkipNext />}
              onClick={actions.skipStep}
              disabled={state.ui.isSubmitting}
              sx={{
                color: 'text.secondary',
                backgroundColor: alpha('#fff', 0.05),
                backdropFilter: 'blur(5px)',
                '&:hover': {
                  backgroundColor: alpha('#fff', 0.1),
                },
              }}
            >
              Skip This Step
            </Button>
          )}
        </Box>

        {/* Next Button - Hidden on confirmation step */}
        {showNextButton && (
          <Button
            variant="contained"
            endIcon={<ArrowForward />}
            onClick={actions.nextStep}
            disabled={!state.progress.canGoNext || state.ui.isSubmitting || state.ui.isValidating}
            sx={{
              minWidth: 120,
              backgroundColor: alpha(theme.palette.primary.main, 0.9),
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 1),
                transform: 'translateY(-2px)',
                boxShadow: '0 12px 35px rgba(0,0,0,0.2)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            {nextButtonLabel}
          </Button>
        )}
      </Box>

      {/* Quick Quote Exit Ramp */}
      {showQuickQuoteExitRamp && (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Button
            variant="text"
            size="small"
            startIcon={<RequestQuote sx={{ fontSize: 16 }} />}
            onClick={actions.requestQuote}
            disabled={state.ui.isSubmitting}
            sx={{
              color: 'text.secondary',
              textTransform: 'none',
              fontWeight: 400,
              fontSize: '0.85rem',
              '&:hover': {
                color: 'primary.main',
                backgroundColor: 'transparent',
              },
            }}
          >
            Not ready to decide? Request a personalized quote instead
          </Button>
        </Box>
      )}
    </AnimatedElement>
  );
};
