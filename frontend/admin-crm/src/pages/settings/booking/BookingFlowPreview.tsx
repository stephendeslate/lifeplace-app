// frontend/admin-crm/src/pages/settings/booking/BookingFlowPreview.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  AppBar,
  Toolbar,
  Container,
  Chip,
  Stack,
  Fab,
  Divider,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Computer as DesktopIcon,
  PhoneAndroid as MobileIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Timeline as StepsIcon,
  Payment as PaymentIcon,
  Security as SecurityIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useLayout } from '../../../contexts/LayoutContext';
import { useBookingFlows, useBookingFlowPaymentGateways } from '../../../hooks/useBookingFlows';
import type { BookingFlowDetail } from '../../../types/bookingflows.types';

// Modern Design System imports
import { ModernCard, ModernLoadingStates } from '../../../components/common';
import { tokens } from '../../../design-system';

type ViewMode = 'desktop' | 'mobile';

export const BookingFlowPreviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const flowId = parseInt(id || '0');

  // Use the evolved hooks
  const { useBookingFlow } = useBookingFlows();
  const { useFlowPaymentGateways } = useBookingFlowPaymentGateways();

  const {
    data: flow,
    isLoading: isLoadingFlow,
    error: flowError,
    refetch: refetchFlow,
  } = useBookingFlow(flowId);

  const { data: paymentGateways, isLoading: isLoadingPaymentGateways } =
    useFlowPaymentGateways(flowId);

  // Set breadcrumbs when flow loads
  useEffect(() => {
    if (flow) {
      setBreadcrumbs([
        { label: 'Settings', path: '/settings' },
        { label: 'Booking Configuration' },
        { label: 'Booking Flows', path: '/settings/booking/booking-flow' },
        { label: flow.name, path: `/settings/booking/booking-flow/${flow.id}` },
        { label: 'Preview' },
      ]);
    }
  }, [flow, setBreadcrumbs]);

  const handleViewModeChange = (_event: React.MouseEvent<HTMLElement>, newMode: ViewMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  const handleBackToFlow = () => {
    navigate(`/settings/booking/booking-flow/${flowId}`);
  };

  const handleEditFlow = () => {
    navigate(`/settings/booking/booking-flow/${flowId}`);
  };

  const handleRefresh = () => {
    refetchFlow();
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Loading state
  if (isLoadingFlow) {
    return <ModernLoadingStates.ModernPageLoadingSkeleton />;
  }

  // Error state
  if (flowError || !flow) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load booking flow preview. The flow may not exist or you may not have permission
          to view it.
        </Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/settings/booking/booking-flow')}>
          Back to Booking Flows
        </Button>
      </Container>
    );
  }

  const PreviewHeader = () => (
    <AppBar
      position="sticky"
      color="default"
      elevation={1}
      sx={{
        backgroundColor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ gap: 2 }}>
        <IconButton edge="start" onClick={handleBackToFlow} aria-label="back to flow details">
          <BackIcon />
        </IconButton>

        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" component="div" noWrap>
            Preview: {flow.name}
          </Typography>
          <Box display="flex" alignItems="center" gap={1} mt={0.5}>
            {/* Event Type Chip */}
            <Chip
              label={flow.event_type_name || 'Any Event Type'}
              size="small"
              color={flow.event_type ? 'primary' : 'default'}
              variant="outlined"
            />

            {/* Status Chip */}
            <Chip
              icon={flow.is_active ? <ActiveIcon /> : <InactiveIcon />}
              label={flow.is_test_mode ? 'Test Mode' : flow.is_active ? 'Active' : 'Inactive'}
              size="small"
              color={flow.is_test_mode ? 'warning' : flow.is_active ? 'success' : 'default'}
              variant={flow.is_active || flow.is_test_mode ? 'filled' : 'outlined'}
            />

            {/* Steps Count Chip */}
            <Chip
              icon={<StepsIcon />}
              label={`${flow.enabled_steps_count}/${flow.total_steps} steps`}
              size="small"
              color={flow.enabled_steps_count === flow.total_steps ? 'success' : 'warning'}
              variant="outlined"
            />
          </Box>
        </Box>

        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewModeChange}
          size="small"
          aria-label="view mode"
        >
          <ToggleButton value="desktop" aria-label="desktop view">
            <DesktopIcon />
          </ToggleButton>
          <ToggleButton value="mobile" aria-label="mobile view">
            <MobileIcon />
          </ToggleButton>
        </ToggleButtonGroup>

        <IconButton onClick={handleRefresh} aria-label="refresh preview">
          <RefreshIcon />
        </IconButton>

        <IconButton onClick={toggleFullscreen} aria-label="toggle fullscreen">
          {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
        </IconButton>

        <Button variant="outlined" startIcon={<SettingsIcon />} onClick={handleEditFlow}>
          Edit Flow
        </Button>
      </Toolbar>
    </AppBar>
  );

  const FlowStepsPreview = ({ flow }: { flow: BookingFlowDetail }) => (
    <ModernCard sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
        <StepsIcon color="primary" />
        Flow Steps ({flow.steps?.length || 0})
      </Typography>

      {flow.steps && flow.steps.length > 0 ? (
        <Stack spacing={1}>
          {flow.steps
            .sort((a, b) => a.order - b.order)
            .map((step, index) => (
              <Box
                key={step.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 1.5,
                  border: 1,
                  borderColor: step.is_enabled ? 'primary.light' : 'grey.300',
                  borderRadius: 1,
                  backgroundColor: step.is_enabled ? 'primary.50' : 'grey.50',
                  opacity: step.is_enabled ? 1 : 0.6,
                }}
              >
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: step.is_enabled ? 'primary.main' : 'grey.400',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                  }}
                >
                  {index + 1}
                </Box>

                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" fontWeight="medium">
                    {step.step_type_display}
                  </Typography>
                </Box>

                <Box display="flex" gap={1}>
                  {step.is_required && (
                    <Chip label="Required" size="small" color="error" variant="outlined" />
                  )}
                  {step.is_skippable && (
                    <Chip label="Skippable" size="small" color="primary" variant="outlined" />
                  )}
                  {!step.is_enabled && (
                    <Chip label="Disabled" size="small" color="default" variant="outlined" />
                  )}
                </Box>
              </Box>
            ))}
        </Stack>
      ) : (
        <Alert severity="warning">
          No steps configured for this booking flow. Add steps to provide a complete booking
          experience.
        </Alert>
      )}
    </ModernCard>
  );

  const PaymentGatewaysInfo = () => (
    <ModernCard sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
        <PaymentIcon color="primary" />
        Payment Configuration
      </Typography>

      {isLoadingPaymentGateways ? (
        <ModernLoadingStates.ModernListSkeleton />
      ) : paymentGateways ? (
        <Stack spacing={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Available Gateways:
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {paymentGateways.available_gateways.length} configured
            </Typography>
          </Box>

          {paymentGateways.available_gateways.length > 0 && (
            <Box display="flex" flexWrap="wrap" gap={1}>
              {paymentGateways.available_gateways.map((gateway) => (
                <Chip
                  key={gateway.id}
                  label={gateway.name}
                  size="small"
                  color={gateway.id === paymentGateways.default_gateway ? 'primary' : 'default'}
                  variant={gateway.id === paymentGateways.default_gateway ? 'filled' : 'outlined'}
                />
              ))}
            </Box>
          )}

          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Default Gateway:
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {paymentGateways.default_gateway
                ? paymentGateways.available_gateways.find(
                    (g) => g.id === paymentGateways.default_gateway,
                  )?.name || 'Unknown'
                : 'None (user choice)'}
            </Typography>
          </Box>

          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Immediate Payment:
            </Typography>
            <Chip
              label={paymentGateways.require_immediate_payment ? 'Required' : 'Optional'}
              size="small"
              color={paymentGateways.require_immediate_payment ? 'warning' : 'success'}
              variant="outlined"
            />
          </Box>
        </Stack>
      ) : (
        <Alert severity="info">No payment gateway configuration available for this flow.</Alert>
      )}
    </ModernCard>
  );

  const FlowConfigurationInfo = ({ flow }: { flow: BookingFlowDetail }) => (
    <ModernCard sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
        <SecurityIcon color="primary" />
        Flow Configuration
      </Typography>

      <Stack spacing={2}>
        <Box display="flex" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            Guest Booking:
          </Typography>
          <Chip
            label={flow.allow_guest_booking ? 'Allowed' : 'Requires Account'}
            size="small"
            color={flow.allow_guest_booking ? 'success' : 'warning'}
            variant="outlined"
          />
        </Box>

        <Box display="flex" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            Account Creation:
          </Typography>
          <Chip
            label={flow.require_account_creation ? 'Required' : 'Optional'}
            size="small"
            color={flow.require_account_creation ? 'error' : 'default'}
            variant="outlined"
          />
        </Box>

        <Box display="flex" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            Auto Approval:
          </Typography>
          <Chip
            label={flow.auto_approve_bookings ? 'Enabled' : 'Manual Review'}
            size="small"
            color={flow.auto_approve_bookings ? 'success' : 'info'}
            variant="outlined"
          />
        </Box>

        <Box display="flex" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            Progress Saving:
          </Typography>
          <Chip
            label={flow.enable_progress_saving ? 'Enabled' : 'Disabled'}
            size="small"
            color={flow.enable_progress_saving ? 'success' : 'default'}
            variant="outlined"
          />
        </Box>

        <Divider />

        <Box display="flex" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            Advance Booking:
          </Typography>
          <Typography variant="body2" fontWeight="medium">
            {flow.min_advance_booking_days}-{flow.max_advance_booking_days} days
          </Typography>
        </Box>

        <Box display="flex" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            Discounts:
          </Typography>
          <Chip
            label={flow.allow_discounts ? 'Allowed' : 'Not Allowed'}
            size="small"
            color={flow.allow_discounts ? 'success' : 'default'}
            variant="outlined"
          />
        </Box>

        {flow.redirect_url && (
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Success Redirect:
            </Typography>
            <Typography
              variant="body2"
              fontWeight="medium"
              sx={{
                maxWidth: 200,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {flow.redirect_url}
            </Typography>
          </Box>
        )}
      </Stack>
    </ModernCard>
  );

  const PreviewSimulationNote = () => (
    <Alert
      severity="info"
      sx={{
        mb: 3,
        ...(viewMode === 'mobile' && {
          '& .MuiAlert-message': {
            fontSize: '0.875rem',
          },
        }),
      }}
    >
      <Typography variant="body2">
        <strong>Preview Mode:</strong> This shows how your booking flow will appear to clients.
        Interactive elements are simulated for demonstration purposes only.
      </Typography>
    </Alert>
  );

  const FlowStatusWarnings = ({ flow }: { flow: BookingFlowDetail }) => (
    <>
      {!flow.is_active && (
        <Alert
          severity="warning"
          sx={{
            mb: 2,
            ...(viewMode === 'mobile' && {
              '& .MuiAlert-message': {
                fontSize: '0.875rem',
              },
            }),
          }}
        >
          <Typography variant="body2">
            <strong>Inactive Flow:</strong> This booking flow is currently inactive and not
            available to clients.
          </Typography>
        </Alert>
      )}

      {flow.enabled_steps_count === 0 && (
        <Alert
          severity="error"
          sx={{
            mb: 2,
            ...(viewMode === 'mobile' && {
              '& .MuiAlert-message': {
                fontSize: '0.875rem',
              },
            }),
          }}
        >
          <Typography variant="body2">
            <strong>No Enabled Steps:</strong> This booking flow has no enabled steps and cannot
            process bookings.
          </Typography>
        </Alert>
      )}

      {flow.enabled_steps_count < flow.total_steps && flow.enabled_steps_count > 0 && (
        <Alert
          severity="warning"
          sx={{
            mb: 2,
            ...(viewMode === 'mobile' && {
              '& .MuiAlert-message': {
                fontSize: '0.875rem',
              },
            }),
          }}
        >
          <Typography variant="body2">
            <strong>Incomplete Configuration:</strong> Some steps are disabled. Only{' '}
            {flow.enabled_steps_count} of {flow.total_steps} steps are active.
          </Typography>
        </Alert>
      )}
    </>
  );

  const PreviewContent = () => (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        backgroundColor: 'grey.50',
        py: { xs: 2, md: 4 },
        px: { xs: 1, md: 2 },
      }}
    >
      <Container
        maxWidth={viewMode === 'mobile' ? 'xs' : 'lg'}
        sx={{
          transition: 'max-width 0.3s ease-in-out',
        }}
      >
        <PreviewSimulationNote />
        <FlowStatusWarnings flow={flow} />

        {/* Main Preview Card - Placeholder for actual preview component */}
        <ModernCard
          variant="flat"
          size="large"
          color="primary"
          animation="none"
          title="Booking Flow Preview"
          sx={{
            ...(viewMode === 'mobile' && {
              maxWidth: 375,
              mx: 'auto',
            }),
            '&::before': {
              background: `linear-gradient(135deg, ${tokens.color.primary[500]}08 0%, ${tokens.color.primary[600]}06 100%)`,
            },
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom sx={{ color: tokens.color.neutral[600] }}>
              📋
            </Typography>
            <Typography variant="h5" gutterBottom sx={{ color: tokens.color.neutral[800] }}>
              {flow.name}
            </Typography>
            <Typography variant="body1" sx={{ color: tokens.color.neutral[600] }} paragraph>
              {flow.description || 'No description provided'}
            </Typography>

            <ModernCard
              variant="flat"
              color="primary"
              size="small"
              animation="none"
              sx={{
                mt: 3,
                '&::before': {
                  background: `linear-gradient(135deg, ${tokens.color.info[500]}06 0%, ${tokens.color.info[600]}04 100%)`,
                },
              }}
            >
              <Alert
                severity="info"
                sx={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  '& .MuiAlert-message': {
                    color: tokens.color.info[700],
                  },
                  '& .MuiAlert-icon': {
                    color: tokens.color.info[600],
                  },
                }}
              >
                <Typography variant="body2">
                  Interactive booking flow preview will be implemented here. This would show the
                  actual step-by-step client experience.
                </Typography>
              </Alert>
            </ModernCard>
          </Box>
        </ModernCard>

        {/* Flow Steps Information */}
        <FlowStepsPreview flow={flow} />

        {/* Payment Configuration */}
        <PaymentGatewaysInfo />

        {/* Flow Configuration */}
        <FlowConfigurationInfo flow={flow} />
      </Container>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'grey.50' }}>
      <PreviewHeader />
      <PreviewContent />

      {/* Floating Action Button for Mobile */}
      {viewMode === 'mobile' && (
        <Fab
          color="primary"
          aria-label="edit flow"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1000,
          }}
          onClick={handleEditFlow}
        >
          <SettingsIcon />
        </Fab>
      )}
    </Box>
  );
};
