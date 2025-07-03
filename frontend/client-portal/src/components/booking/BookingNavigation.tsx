// frontend/client-portal/src/components/booking/BookingNavigation.tsx

import React from 'react';
import {
  Box,
  Button,
  Stack,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Save as SaveIcon,
} from '@mui/icons-material';

interface BookingNavigationProps {
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  isLoading?: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
  onSave?: () => void;
  nextLabel?: string;
  previousLabel?: string;
  saveLabel?: string;
  showSaveButton?: boolean;
  nextButtonProps?: Record<string, any>;
  previousButtonProps?: Record<string, any>;
  saveButtonProps?: Record<string, any>;
}

export const BookingNavigation: React.FC<BookingNavigationProps> = ({
  canGoNext = true,
  canGoPrevious = true,
  isLoading = false,
  onNext,
  onPrevious,
  onSave,
  nextLabel = 'Next',
  previousLabel = 'Back',
  saveLabel = 'Save Progress',
  showSaveButton = false,
  nextButtonProps = {},
  previousButtonProps = {},
  saveButtonProps = {},
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Mobile layout - stacked buttons
  if (isMobile) {
    return (
      <Box sx={{ mt: 3 }}>
        {/* Primary action button (Next/Complete) */}
        {onNext && (
          <Button
            variant="contained"
            onClick={onNext}
            disabled={!canGoNext || isLoading}
            fullWidth
            size="large"
            endIcon={
              isLoading ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <ArrowForwardIcon />
              )
            }
            sx={{ mb: 2 }}
            {...nextButtonProps}
          >
            {isLoading ? 'Loading...' : nextLabel}
          </Button>
        )}

        {/* Secondary actions */}
        <Stack direction="row" spacing={1}>
          {/* Previous button */}
          {onPrevious && (
            <Button
              variant="outlined"
              onClick={onPrevious}
              disabled={!canGoPrevious || isLoading}
              startIcon={<ArrowBackIcon />}
              size="large"
              sx={{ flex: 1 }}
              {...previousButtonProps}
            >
              {previousLabel}
            </Button>
          )}

          {/* Save button */}
          {showSaveButton && onSave && (
            <Button
              variant="outlined"
              onClick={onSave}
              disabled={isLoading}
              startIcon={<SaveIcon />}
              size="large"
              sx={{ flex: 1 }}
              {...saveButtonProps}
            >
              {saveLabel}
            </Button>
          )}
        </Stack>
      </Box>
    );
  }

  // Desktop layout - horizontal with space between
  return (
    <Box 
      sx={{ 
        mt: 4,
        pt: 3,
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Stack 
        direction="row" 
        justifyContent="space-between" 
        alignItems="center"
        spacing={2}
      >
        {/* Left side - Previous button */}
        <Box>
          {onPrevious ? (
            <Button
              variant="outlined"
              onClick={onPrevious}
              disabled={!canGoPrevious || isLoading}
              startIcon={<ArrowBackIcon />}
              size="large"
              {...previousButtonProps}
            >
              {previousLabel}
            </Button>
          ) : (
            <Box /> // Empty space to maintain layout
          )}
        </Box>

        {/* Right side - Save and Next buttons */}
        <Stack direction="row" spacing={2}>
          {/* Save button */}
          {showSaveButton && onSave && (
            <Button
              variant="outlined"
              onClick={onSave}
              disabled={isLoading}
              startIcon={<SaveIcon />}
              size="large"
              {...saveButtonProps}
            >
              {saveLabel}
            </Button>
          )}

          {/* Next/Complete button */}
          {onNext && (
            <Button
              variant="contained"
              onClick={onNext}
              disabled={!canGoNext || isLoading}
              endIcon={
                isLoading ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <ArrowForwardIcon />
                )
              }
              size="large"
              sx={{ minWidth: 140 }}
              {...nextButtonProps}
            >
              {isLoading ? 'Loading...' : nextLabel}
            </Button>
          )}
        </Stack>
      </Stack>
    </Box>
  );
};