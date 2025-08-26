// frontend/admin-crm/src/pages/settings/booking/BookingFlowDetails.tsx

import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Divider,
  Stack,
  Breadcrumbs,
  Link,
  Skeleton,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Settings as SettingsIcon,
  List as StepsIcon,
  Analytics as AnalyticsIcon,
  Preview as PreviewIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  ContentCopy as DuplicateIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  NavigateNext as NavigateNextIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useLayout } from '../../../contexts/LayoutContext';
import { 
  useBookingFlows, 
  useBookingFlowSteps,
  useBookingFlowStepConfiguration 
} from '../../../hooks/useBookingFlows';
import { 
  BookingFlowFormDialog,
  BookingFlowPreview 
} from '../../../components/bookingflows/flows';
import { 
  BookingFlowStepFormDialog,
  BookingFlowStepsTable,
  StepConfigurationPanel 
} from '../../../components/bookingflows/steps';
import type { 
  BookingFlowStep,
  CreateBookingFlowStepData,
  UpdateBookingFlowStepData,
  UpdateBookingFlowData 
} from '../../../types/bookingflows.types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`flow-detail-tabpanel-${index}`}
    aria-labelledby={`flow-detail-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

export const BookingFlowDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();
  const [activeTab, setActiveTab] = useState(0);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<BookingFlowStep | null>(null);
  const [selectedStepForConfig, setSelectedStepForConfig] = useState<BookingFlowStep | null>(null);
  const [reorderDialogOpen, setReorderDialogOpen] = useState(false);

  // Refs for focus management
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const addStepButtonRef = useRef<HTMLButtonElement>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  const flowId = parseInt(id || '0');

  // FIXED: Use evolved hooks with proper error handling
  const { 
    useBookingFlow, 
    updateFlow, 
    deleteFlow, 
    duplicateFlow, 
    isUpdatingFlow, 
    isDeletingFlow,
    isDuplicatingFlow,
    updateError,
    deleteError,
    duplicateError,
  } = useBookingFlows();

  const { 
    data: flow, 
    isLoading: isLoadingFlow, 
    error: flowError,
    refetch: refetchFlow,
  } = useBookingFlow(flowId);

  const {
    useFlowSteps,
    createStep,
    updateStep,
    reorderSteps,
    isCreatingStep,
    isUpdatingStep,
    isReorderingSteps,
    createStepError,
    updateStepError,
    deleteStepError,
    reorderStepsError,
  } = useBookingFlowSteps();

  const { 
    data: steps = [], 
    isLoading: isLoadingSteps,
    error: stepsError,
    refetch: refetchSteps 
  } = useFlowSteps(flowId);

  // FIXED: Add step configuration hook
  const {
    updateConfigurationError,
  } = useBookingFlowStepConfiguration();

  useEffect(() => {
    if (flow) {
      setBreadcrumbs([
        { label: 'Settings', path: '/settings' },
        { label: 'Booking Configuration' },
        { label: 'Booking Flows', path: '/settings/booking/booking-flow' },
        { label: flow.name },
      ]);
    }
  }, [flow, setBreadcrumbs]);

  // @ts-ignore
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleEditFlow = () => {
    lastFocusedElementRef.current = document.activeElement as HTMLElement;
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleDuplicateFlow = () => {
    if (flow) {
      duplicateFlow({ 
        id: flow.id, 
        data: { 
          name: `${flow.name} (Copy)`,
          copy_steps: true,
          copy_configuration: true 
        } 
      }, {
        onSuccess: (newFlow) => {
          navigate(`/settings/booking/booking-flow/${newFlow.id}`);
        }
      });
    }
    handleMenuClose();
  };

  const handleDeleteFlow = () => {
    lastFocusedElementRef.current = document.activeElement as HTMLElement;
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = () => {
    if (flow) {
      deleteFlow(flow.id, {
        onSuccess: () => {
          navigate('/settings/booking/booking-flow');
        }
      });
    }
  };

  const handleDeleteCancel = () => {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement.blur && activeElement !== document.body) {
      activeElement.blur();
    }

    setDeleteDialogOpen(false);

    setTimeout(() => {
      if (lastFocusedElementRef.current && document.contains(lastFocusedElementRef.current)) {
        try {
          lastFocusedElementRef.current.focus();
        } catch (error) {
          menuButtonRef.current?.focus();
        }
      } else {
        menuButtonRef.current?.focus();
      }
      lastFocusedElementRef.current = null;
    }, 100);
  };

  const handlePreviewFlow = () => {
    if (flow) {
      navigate(`/settings/booking/booking-flow/preview/${flow.id}`);
    }
    handleMenuClose();
  };

  const handleUpdateFlow = (data: UpdateBookingFlowData) => {
    if (flow) {
      updateFlow({ id: flow.id, data }, {
        onSuccess: () => {
          handleEditDialogClose();
          refetchFlow();
        }
      });
    }
  };

  const handleEditDialogClose = () => {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement.blur && activeElement !== document.body) {
      const dialogElement = activeElement.closest('[role="dialog"]');
      if (dialogElement) {
        activeElement.blur();
      }
    }
    
    setEditDialogOpen(false);

    setTimeout(() => {
      if (lastFocusedElementRef.current && document.contains(lastFocusedElementRef.current)) {
        try {
          lastFocusedElementRef.current.focus();
        } catch (error) {
          menuButtonRef.current?.focus();
        }
      } else {
        menuButtonRef.current?.focus();
      }
      lastFocusedElementRef.current = null;
    }, 100);
  };

  const handleCreateStep = () => {
    lastFocusedElementRef.current = document.activeElement as HTMLElement;
    setEditingStep(null);
    setStepDialogOpen(true);
  };

  const handleEditStep = (step: BookingFlowStep) => {
    lastFocusedElementRef.current = document.activeElement as HTMLElement;
    setEditingStep(step);
    setStepDialogOpen(true);
  };

  const handleConfigureStep = (step: BookingFlowStep) => {
    setSelectedStepForConfig(step);
    setActiveTab(2);
  };

  const handleStepDialogClose = () => {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement.blur && activeElement !== document.body) {
      const dialogElement = activeElement.closest('[role="dialog"]');
      if (dialogElement) {
        activeElement.blur();
      }
    }
    
    setStepDialogOpen(false);
    setEditingStep(null);

    setTimeout(() => {
      if (lastFocusedElementRef.current && document.contains(lastFocusedElementRef.current)) {
        try {
          lastFocusedElementRef.current.focus();
        } catch (error) {
          addStepButtonRef.current?.focus();
        }
      } else {
        addStepButtonRef.current?.focus();
      }
      lastFocusedElementRef.current = null;
    }, 100);
  };

  const handleStepSubmit = (data: CreateBookingFlowStepData | UpdateBookingFlowStepData) => {
    if (editingStep) {
      updateStep({ 
        id: editingStep.id, 
        data: data as UpdateBookingFlowStepData 
      }, {
        onSuccess: () => {
          handleStepDialogClose();
          refetchSteps();
        }
      });
    } else {
      createStep({
        ...data as CreateBookingFlowStepData,
        booking_flow: flowId
      }, {
        onSuccess: () => {
          handleStepDialogClose();
          refetchSteps();
        }
      });
    }
  };

  const handleStepReorder = () => {
    setReorderDialogOpen(true);
  };


  // FIXED: Add step configuration update handler
  const handleStepConfigurationUpdate = (updatedStep: BookingFlowStep) => {
    refetchSteps();
    setSelectedStepForConfig(updatedStep);
  };

  const getTabLabel = (label: string, count?: number) => (
    <Box display="flex" alignItems="center" gap={1}>
      {label}
      {count !== undefined && (
        <Chip label={count} size="small" color="primary" />
      )}
    </Box>
  );

  // FIXED: Enhanced error display
  const hasErrors = flowError || stepsError || updateError || deleteError || duplicateError || 
                   createStepError || updateStepError || deleteStepError || reorderStepsError || 
                   updateConfigurationError;

  if (flowError || !id || isNaN(flowId)) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {flowError ? 
            `Failed to load booking flow: ${flowError instanceof Error ? flowError.message : 'Unknown error'}` :
            'Invalid booking flow ID'
          }
        </Alert>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/settings/booking/booking-flow')}
        >
          Back to Booking Flows
        </Button>
      </Box>
    );
  }

  if (isLoadingFlow) {
    return (
      <Box>
        {/* Header Skeleton */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
          <Box flex={1}>
            <Box display="flex" alignItems="center" gap={2} mb={1}>
              <Skeleton variant="circular" width={40} height={40} />
              <Skeleton variant="text" width={300} height={40} />
              <Skeleton variant="rectangular" width={80} height={32} />
            </Box>
            <Skeleton variant="text" width={400} height={24} />
            <Box display="flex" gap={1} mt={1}>
              <Skeleton variant="rectangular" width={100} height={24} />
              <Skeleton variant="text" width={150} height={24} />
            </Box>
          </Box>
          <Box display="flex" gap={1}>
            <Skeleton variant="rectangular" width={100} height={36} />
            <Skeleton variant="circular" width={40} height={40} />
          </Box>
        </Box>

        {/* Tabs Skeleton */}
        <Card sx={{ mb: 3 }}>
          <Box display="flex" gap={2} p={2}>
            {[...Array(5)].map((_, index) => (
              <Skeleton key={index} variant="rectangular" width={120} height={40} />
            ))}
          </Box>
        </Card>

        {/* Content Skeleton */}
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (!flow) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          Booking flow not found. It may have been deleted or you may not have permission to view it.
        </Alert>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/settings/booking/booking-flow')}
        >
          Back to Booking Flows
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Enhanced Error Display */}
      {hasErrors && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Operation Failed
          </Typography>
          {updateError && <Typography variant="body2">Update: {updateError instanceof Error ? updateError.message : 'Unknown error'}</Typography>}
          {deleteError && <Typography variant="body2">Delete: {deleteError instanceof Error ? deleteError.message : 'Unknown error'}</Typography>}
          {duplicateError && <Typography variant="body2">Duplicate: {duplicateError instanceof Error ? duplicateError.message : 'Unknown error'}</Typography>}
          {createStepError && <Typography variant="body2">Create Step: {createStepError instanceof Error ? createStepError.message : 'Unknown error'}</Typography>}
          {updateStepError && <Typography variant="body2">Update Step: {updateStepError instanceof Error ? updateStepError.message : 'Unknown error'}</Typography>}
          {deleteStepError && <Typography variant="body2">Delete Step: {deleteStepError instanceof Error ? deleteStepError.message : 'Unknown error'}</Typography>}
          {reorderStepsError && <Typography variant="body2">Reorder Steps: {reorderStepsError instanceof Error ? reorderStepsError.message : 'Unknown error'}</Typography>}
          {updateConfigurationError && <Typography variant="body2">Configuration: {updateConfigurationError instanceof Error ? updateConfigurationError.message : 'Unknown error'}</Typography>}
        </Alert>
      )}

      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Box display="flex" alignItems="center" gap={2} mb={1}>
            <IconButton
              onClick={() => navigate('/settings/booking/booking-flow')}
              size="small"
              disabled={isDeletingFlow}
            >
              <BackIcon />
            </IconButton>
            <Typography variant="h4" fontWeight="bold">
              {flow.name}
            </Typography>
            <Chip
              label={flow.is_test_mode ? 'Test Mode' : flow.is_active ? 'Active' : 'Inactive'}
              size="small"
              color={flow.is_test_mode ? 'warning' : flow.is_active ? 'success' : 'default'}
              variant={flow.is_active ? 'filled' : 'outlined'}
            />
          </Box>
          {flow.description && (
            <Typography variant="body1" color="text.secondary">
              {flow.description}
            </Typography>
          )}
          <Box display="flex" alignItems="center" gap={2} mt={1}>
            <Chip
              label={flow.event_type_name}
              size="small"
              color="primary"
              variant="outlined"
            />
            <Typography variant="caption" color="text.secondary">
              {flow.enabled_steps_count} of {flow.total_steps} steps enabled
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Last updated {new Date(flow.updated_at).toLocaleDateString()}
            </Typography>
          </Box>

          {/* Configuration Breadcrumb */}
          {selectedStepForConfig && activeTab === 2 && (
            <Box mt={2}>
              <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />}>
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => {
                    setSelectedStepForConfig(null);
                    setActiveTab(1);
                  }}
                  sx={{ textDecoration: 'none' }}
                >
                  Steps
                </Link>
                <Typography variant="body2" color="text.primary">
                  Configure: {selectedStepForConfig.name}
                </Typography>
              </Breadcrumbs>
            </Box>
          )}
        </Box>

        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              refetchFlow();
              refetchSteps();
            }}
            disabled={isLoadingFlow || isLoadingSteps}
          >
            Refresh
          </Button>

          <Button
            variant="outlined"
            startIcon={<PreviewIcon />}
            onClick={handlePreviewFlow}
            disabled={isDeletingFlow}
          >
            Preview
          </Button>

          <IconButton 
            ref={menuButtonRef} 
            onClick={handleMenuOpen}
            disabled={isDeletingFlow}
          >
            <MoreVertIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditFlow} disabled={isUpdatingFlow}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Flow Details</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handlePreviewFlow}>
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Full Preview</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleDuplicateFlow} disabled={isDuplicatingFlow}>
          <ListItemIcon>
            <DuplicateIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            {isDuplicatingFlow ? 'Duplicating...' : 'Duplicate Flow'}
          </ListItemText>
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={handleDeleteFlow} sx={{ color: 'error.main' }} disabled={isDeletingFlow}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete Flow</ListItemText>
        </MenuItem>
      </Menu>

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab 
            icon={<SettingsIcon />} 
            label="Overview"
            iconPosition="start"
          />
          <Tab 
            icon={<StepsIcon />} 
            label={getTabLabel("Steps", steps.length)}
            iconPosition="start"
          />
          <Tab 
            icon={<SettingsIcon />} 
            label={selectedStepForConfig ? `Configure: ${selectedStepForConfig.name}` : "Configuration"}
            iconPosition="start"
            disabled={!selectedStepForConfig}
          />
          <Tab 
            icon={<PreviewIcon />} 
            label="Preview"
            iconPosition="start"
          />
          <Tab 
            icon={<AnalyticsIcon />} 
            label="Analytics"
            iconPosition="start"
            disabled
          />
        </Tabs>
      </Card>

      {/* Tab Content */}
      <TabPanel value={activeTab} index={0}>
        <Stack spacing={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Flow Information
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Name
                  </Typography>
                  <Typography variant="body1">
                    {flow.name}
                  </Typography>
                </Box>
                
                {flow.description && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Description
                    </Typography>
                    <Typography variant="body1">
                      {flow.description}
                    </Typography>
                  </Box>
                )}
                
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Event Type
                  </Typography>
                  <Typography variant="body1">
                    {flow.event_type_name}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status
                  </Typography>
                  <Box display="flex" gap={1}>
                    <Chip
                      label={flow.is_active ? 'Active' : 'Inactive'}
                      size="small"
                      color={flow.is_active ? 'success' : 'default'}
                      variant={flow.is_active ? 'filled' : 'outlined'}
                    />
                    {flow.is_test_mode && (
                      <Chip
                        label="Test Mode"
                        size="small"
                        color="warning"
                        variant="filled"
                      />
                    )}
                  </Box>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Configuration Summary
              </Typography>
              <Stack spacing={2}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Steps Configured:</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {flow.enabled_steps_count} of {flow.total_steps}
                  </Typography>
                </Box>
                
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Guest Booking:</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {flow.allow_guest_booking ? 'Allowed' : 'Not Allowed'}
                  </Typography>
                </Box>
                
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Auto Approval:</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {flow.auto_approve_bookings ? 'Enabled' : 'Disabled'}
                  </Typography>
                </Box>
                
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Booking Window:</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {flow.min_advance_booking_days} - {flow.max_advance_booking_days} days
                  </Typography>
                </Box>
                
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Discounts:</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {flow.allow_discounts ? 'Enabled' : 'Disabled'}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Payment Processing:</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {flow.require_immediate_payment ? 'Immediate' : 'Deferred'}
                  </Typography>
                </Box>

                {flow.default_payment_gateway && (
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Default Payment Gateway:</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      Configured
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Stack spacing={3}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Booking Flow Steps ({steps.length})
            </Typography>
            <Box display="flex" gap={1}>
              {steps.length > 1 && (
                <Button
                  variant="outlined"
                  onClick={handleStepReorder}
                  disabled={isReorderingSteps}
                >
                  {isReorderingSteps ? 'Reordering...' : 'Reorder Steps'}
                </Button>
              )}
              <Button
                ref={addStepButtonRef}
                variant="contained"
                startIcon={<StepsIcon />}
                onClick={handleCreateStep}
                disabled={isCreatingStep}
              >
                {isCreatingStep ? 'Adding...' : 'Add Step'}
              </Button>
            </Box>
          </Box>

          {stepsError && (
            <Alert severity="error">
              Failed to load steps: {stepsError instanceof Error ? stepsError.message : 'Unknown error'}
            </Alert>
          )}

          {steps.length === 0 && !isLoadingSteps ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <StepsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No steps configured
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  Add steps to guide clients through the booking process
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<StepsIcon />}
                  onClick={handleCreateStep}
                  disabled={isCreatingStep}
                >
                  {isCreatingStep ? 'Adding...' : 'Add First Step'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <BookingFlowStepsTable
              flowId={flowId}
              onEdit={handleEditStep}
              onConfigure={handleConfigureStep}
              onReorder={handleStepReorder}
            />
          )}
        </Stack>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        {selectedStepForConfig ? (
          <Box>
            <Box mb={3}>
              <Button
                startIcon={<BackIcon />}
                onClick={() => {
                  setSelectedStepForConfig(null);
                  setActiveTab(1);
                }}
                variant="outlined"
                size="small"
              >
                Back to Steps
              </Button>
            </Box>

            <StepConfigurationPanel
              step={selectedStepForConfig}
              onUpdate={handleStepConfigurationUpdate}
            />
          </Box>
        ) : (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <SettingsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Select a step to configure
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Choose a step from the Steps tab to configure its specific settings and behavior
              </Typography>
              <Button
                variant="outlined"
                onClick={() => setActiveTab(1)}
              >
                Go to Steps
              </Button>
            </CardContent>
          </Card>
        )}
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        {flow && (
          <BookingFlowPreview
            flow={flow}
            compact={false}
            showMobileView={false}
          />
        )}
      </TabPanel>

      <TabPanel value={activeTab} index={4}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <AnalyticsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Analytics Coming Soon
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View booking flow performance, conversion rates, and step completion analytics
            </Typography>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Dialogs */}
      <BookingFlowFormDialog
        open={editDialogOpen}
        onClose={handleEditDialogClose}
        editingFlow={flow}
        onSubmit={handleUpdateFlow}
        isLoading={isUpdatingFlow}
      />

      <BookingFlowStepFormDialog
        open={stepDialogOpen}
        onClose={handleStepDialogClose}
        editingStep={editingStep}
        flowId={flowId}
        onSubmit={handleStepSubmit}
        isLoading={isCreatingStep || isUpdatingStep}
      />

      {/* Enhanced Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        disableRestoreFocus
        disableEnforceFocus={false}
        keepMounted={false}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Booking Flow</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>"{flow.name}"</strong>?
          </DialogContentText>
          <Box mt={2}>
            <Alert severity="warning">
              <Typography variant="subtitle2" gutterBottom>
                This action cannot be undone and will:
              </Typography>
              <Typography variant="body2" component="div">
                • Delete all {flow.total_steps} configured steps
              </Typography>
              <Typography variant="body2" component="div">
                • Mark any active booking sessions as abandoned
              </Typography>
              <Typography variant="body2" component="div">
                • Remove all analytics data for this flow
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={isDeletingFlow}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={isDeletingFlow}
            startIcon={isDeletingFlow ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
          >
            {isDeletingFlow ? 'Deleting...' : 'Delete Flow'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Step Reorder Dialog */}
      <Dialog
        open={reorderDialogOpen}
        onClose={() => setReorderDialogOpen(false)}
        maxWidth="md"
        fullWidth
        disableEscapeKeyDown={isReorderingSteps}
      >
        <DialogTitle>Reorder Booking Flow Steps</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Drag and drop steps to change their order in the booking flow.
          </Typography>
          
          {/* REMOVED: StepReorderList component since it's not in evolved codebase */}
          <Box mt={2}>
            <Alert severity="info">
              Step reordering interface will be implemented when the StepReorderList component is available.
              For now, you can edit individual step order values in the step edit dialog.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setReorderDialogOpen(false)}
            disabled={isReorderingSteps}
          >
            Cancel
          </Button>
          <Button 
            variant="contained"
            disabled={isReorderingSteps}
            onClick={() => {
              // PLACEHOLDER: Will be implemented when reorder component is available
              setReorderDialogOpen(false);
            }}
          >
            {isReorderingSteps ? 'Saving...' : 'Save Order'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};