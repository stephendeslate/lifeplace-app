// frontend/client-portal/src/components/booking/MobileBookingNavigation.tsx

import React, { useState } from 'react';
import {
  Box,
  Button,
  Fab,
  SwipeableDrawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Chip,
  useTheme,
  useMediaQuery,
  Alert,
  IconButton,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  ArrowForward as ForwardIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  CheckCircle as CompletedIcon,
  RadioButtonUnchecked as PendingIcon,
  Error as ErrorIcon,
  Save as SaveIcon,
} from '@mui/icons-material';

interface BookingStep {
  id: string;
  label: string;
  shortLabel?: string;
  isCompleted: boolean;
  isCurrent: boolean;
  hasErrors?: boolean;
  isOptional?: boolean;
}

interface MobileBookingNavigationProps {
  steps: BookingStep[];
  currentStepIndex: number;
  completedSteps: string[];
  canGoBack: boolean;
  canGoNext: boolean;
  isValidating?: boolean;
  isSaving?: boolean;
  onStepChange?: (stepIndex: number) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onSave?: () => void;
  validationErrors?: Record<string, string>;
  className?: string;
}

export const MobileBookingNavigation: React.FC<MobileBookingNavigationProps> = ({
  steps,
  currentStepIndex,
  completedSteps,
  canGoBack,
  canGoNext,
  isValidating = false,
  isSaving = false,
  onStepChange,
  onNext,
  onPrevious,
  onSave,
  validationErrors = {},
  className,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const hasErrors = Object.keys(validationErrors).length > 0;

  if (!isMobile) {
    return null; // Only show on mobile
  }

  const getStepStatus = (step: BookingStep, index: number) => {
    if (step.hasErrors || (index === currentStepIndex && hasErrors)) return 'error';
    if (completedSteps.includes(step.id)) return 'completed';
    if (index === currentStepIndex) return 'current';
    return 'pending';
  };

  const getStepIcon = (step: BookingStep, index: number) => {
    const status = getStepStatus(step, index);
    switch (status) {
      case 'completed':
        return <CompletedIcon sx={{ color: 'success.main' }} />;
      case 'error':
        return <ErrorIcon sx={{ color: 'error.main' }} />;
      case 'current':
        return <PendingIcon sx={{ color: 'primary.main' }} />;
      default:
        return <PendingIcon sx={{ color: 'grey.400' }} />;
    }
  };

  const handleStepClick = (stepIndex: number) => {
    // Only allow navigation to completed steps or the next step
    if (stepIndex <= currentStepIndex + 1 || completedSteps.includes(steps[stepIndex].id)) {
      onStepChange?.(stepIndex);
      setDrawerOpen(false);
    }
  };

  const toggleDrawer = (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
    if (
      event &&
      event.type === 'keydown' &&
      ((event as React.KeyboardEvent).key === 'Tab' ||
        (event as React.KeyboardEvent).key === 'Shift')
    ) {
      return;
    }
    setDrawerOpen(open);
  };

  const currentStep = steps[currentStepIndex];

  return (
    <>
      {/* Fixed top navigation bar */}
      <Box
        className={className}
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          zIndex: theme.zIndex.appBar,
          px: 2,
          py: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton
            onClick={toggleDrawer(true)}
            size="small"
            sx={{ color: 'primary.main' }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ flex: 1, mx: 2, minWidth: 0 }}>
            <Typography 
              variant="subtitle1" 
              fontWeight={600}
              noWrap
              sx={{ color: 'primary.main' }}
            >
              {currentStep?.shortLabel || currentStep?.label}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Chip
                label={`${currentStepIndex + 1}/${steps.length}`}
                size="small"
                color="primary"
                variant="outlined"
              />
              {hasErrors && (
                <Chip
                  label="Needs attention"
                  size="small"
                  color="error"
                  variant="outlined"
                />
              )}
              {isValidating && (
                <Chip
                  label="Validating..."
                  size="small"
                  color="warning"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>

          {onSave && (
            <IconButton
              onClick={onSave}
              disabled={isSaving}
              size="small"
              sx={{ color: 'success.main' }}
            >
              <SaveIcon />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Bottom navigation buttons */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          bgcolor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
          p: 2,
          zIndex: theme.zIndex.appBar,
        }}
      >
        {hasErrors && (
          <Alert severity="error" sx={{ mb: 2, fontSize: '0.875rem' }}>
            Please fix the errors above before continuing
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Button
            onClick={onPrevious}
            disabled={!canGoBack || isValidating}
            startIcon={<BackIcon />}
            variant="outlined"
            size="large"
            sx={{ flex: 1, maxWidth: 150 }}
          >
            Back
          </Button>
          
          <Button
            onClick={onNext}
            disabled={!canGoNext || isValidating || hasErrors}
            endIcon={<ForwardIcon />}
            variant="contained"
            size="large"
            sx={{ flex: 2 }}
          >
            {currentStepIndex === steps.length - 1 ? 'Complete' : 'Continue'}
          </Button>
        </Box>
      </Box>

      {/* Steps overview drawer */}
      <SwipeableDrawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
        onOpen={toggleDrawer(true)}
        PaperProps={{
          sx: { width: '80%', maxWidth: 300 }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" color="primary.main" fontWeight={600}>
            Booking Progress
          </Typography>
          <IconButton onClick={toggleDrawer(false)} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />
        
        <List>
          {steps.map((step, index) => {
            const status = getStepStatus(step, index);
            const isAccessible = index <= currentStepIndex + 1 || completedSteps.includes(step.id);
            
            return (
              <ListItem key={step.id} disablePadding>
                <ListItemButton
                  onClick={() => handleStepClick(index)}
                  disabled={!isAccessible}
                  selected={index === currentStepIndex}
                  sx={{
                    '&.Mui-selected': {
                      bgcolor: 'primary.50',
                      borderRight: 3,
                      borderColor: 'primary.main',
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {getStepIcon(step, index)}
                  </ListItemIcon>
                  <ListItemText
                    primary={step.label}
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Chip
                          label={index + 1}
                          size="small"
                          variant="outlined"
                          color={status === 'current' ? 'primary' : 'default'}
                          sx={{ height: 20, fontSize: '0.75rem' }}
                        />
                        {step.isOptional && (
                          <Chip
                            label="Optional"
                            size="small"
                            variant="outlined"
                            color="default"
                            sx={{ height: 20, fontSize: '0.75rem' }}
                          />
                        )}
                      </Box>
                    }
                    primaryTypographyProps={{
                      fontWeight: index === currentStepIndex ? 600 : 400,
                      color: status === 'error' ? 'error.main' 
                        : status === 'completed' ? 'success.main'
                        : status === 'current' ? 'primary.main'
                        : 'text.secondary'
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
        
        <Box sx={{ mt: 'auto', p: 2 }}>
          <Box sx={{ 
            bgcolor: 'grey.50', 
            p: 2, 
            borderRadius: 2,
            textAlign: 'center'
          }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Overall Progress
            </Typography>
            <Typography variant="h6" color="primary.main" fontWeight={600}>
              {Math.round((completedSteps.length / steps.length) * 100)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {completedSteps.length} of {steps.length} completed
            </Typography>
          </Box>
        </Box>
      </SwipeableDrawer>

      {/* Floating save button */}
      {onSave && (
        <Fab
          onClick={onSave}
          disabled={isSaving}
          color="success"
          size="small"
          sx={{
            position: 'fixed',
            bottom: 100,
            right: 16,
            zIndex: theme.zIndex.fab,
          }}
        >
          <SaveIcon />
        </Fab>
      )}
    </>
  );
};