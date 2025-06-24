// frontend/admin-crm/src/pages/settings/booking/BookingFlowPreview.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  AppBar,
  Toolbar,
  Container,
  Chip,
  Stack,
  Fab,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Computer as DesktopIcon,
  PhoneAndroid as MobileIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useLayout } from '../../../contexts/LayoutContext';
import { useBookingFlows } from '../../../hooks/useBookingFlows';
import { BookingFlowPreview } from '../../../components/bookingflows/flows';

type ViewMode = 'desktop' | 'mobile';

export const BookingFlowPreviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const flowId = parseInt(id || '0');

  const { useBookingFlow } = useBookingFlows();
  const { 
    data: flow, 
    isLoading: isLoadingFlow, 
    error: flowError,
    refetch: refetchFlow 
  } = useBookingFlow(flowId);

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

  const handleViewModeChange = (
    // @ts-ignore
    event: React.MouseEvent<HTMLElement>,
    newMode: ViewMode,
  ) => {
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

  if (isLoadingFlow) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (flowError || !flow) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load booking flow preview. Please check the URL and try again.
        </Alert>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/settings/booking/booking-flow')}
        >
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
        borderColor: 'divider'
      }}
    >
      <Toolbar sx={{ gap: 2 }}>
        <IconButton
          edge="start"
          onClick={handleBackToFlow}
          aria-label="back"
        >
          <BackIcon />
        </IconButton>

        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" component="div" noWrap>
            Preview: {flow.name}
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            {flow.event_type_name && (
              <Chip
                label={flow.event_type_name}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            <Chip
              label={flow.is_test_mode ? 'Test Mode' : flow.is_active ? 'Active' : 'Inactive'}
              size="small"
              color={flow.is_test_mode ? 'warning' : flow.is_active ? 'success' : 'default'}
              variant={flow.is_active ? 'filled' : 'outlined'}
            />
          </Box>
        </Box>

        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewModeChange}
          size="small"
        >
          <ToggleButton value="desktop" aria-label="desktop view">
            <DesktopIcon />
          </ToggleButton>
          <ToggleButton value="mobile" aria-label="mobile view">
            <MobileIcon />
          </ToggleButton>
        </ToggleButtonGroup>

        <IconButton onClick={handleRefresh} aria-label="refresh">
          <RefreshIcon />
        </IconButton>

        <IconButton onClick={toggleFullscreen} aria-label="fullscreen">
          {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
        </IconButton>

        <Button
          variant="outlined"
          startIcon={<SettingsIcon />}
          onClick={handleEditFlow}
        >
          Edit Flow
        </Button>
      </Toolbar>
    </AppBar>
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
        {/* Preview Instructions */}
        <Alert 
          severity="info" 
          sx={{ 
            mb: 3,
            ...(viewMode === 'mobile' && {
              '& .MuiAlert-message': {
                fontSize: '0.875rem',
              }
            })
          }}
        >
          <Typography variant="body2">
            This is a preview of how clients will experience your booking flow. 
            Interactive elements are simulated and non-functional.
          </Typography>
        </Alert>

        {/* Flow Status Warning */}
        {!flow.is_active && (
          <Alert 
            severity="warning" 
            sx={{ 
              mb: 3,
              ...(viewMode === 'mobile' && {
                '& .MuiAlert-message': {
                  fontSize: '0.875rem',
                }
              })
            }}
          >
            This booking flow is currently inactive and not available to clients.
          </Alert>
        )}

        {/* Preview Component */}
        <Card
          sx={{
            ...(viewMode === 'mobile' && {
              maxWidth: 375,
              mx: 'auto',
              boxShadow: 3,
              borderRadius: 3,
            })
          }}
        >
          <BookingFlowPreview
            flow={flow}
            compact={false}
            showMobileView={viewMode === 'mobile'}
          />
        </Card>

        {/* Flow Information */}
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Flow Information
            </Typography>
            <Stack spacing={2}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Total Steps:
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {flow.total_steps}
                </Typography>
              </Box>
              
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Enabled Steps:
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {flow.enabled_steps_count}
                </Typography>
              </Box>
              
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Completion Rate:
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {flow.total_steps > 0 
                    ? Math.round((flow.enabled_steps_count / flow.total_steps) * 100)
                    : 0}% configured
                </Typography>
              </Box>
              
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Guest Booking:
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {flow.allow_guest_booking ? 'Allowed' : 'Not Allowed'}
                </Typography>
              </Box>
              
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Auto Approval:
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {flow.auto_approve_bookings ? 'Enabled' : 'Manual Review'}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
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
          aria-label="edit"
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