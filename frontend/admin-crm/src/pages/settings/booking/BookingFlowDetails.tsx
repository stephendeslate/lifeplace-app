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
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useLayout } from '../../../contexts/LayoutContext';
import { useBookingFlows, useBookingFlowSteps } from '../../../hooks/useBookingFlows';
import { 
  BookingFlowFormDialog,
  BookingFlowPreview 
} from '../../../components/bookingflows/flows';
import { 
  BookingFlowStepFormDialog,
  BookingFlowStepsTable,
  StepConfigurationPanel,
  StepReorderList 
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

  // Refs for focus management
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const addStepButtonRef = useRef<HTMLButtonElement>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  const flowId = parseInt(id || '0');

  const { useBookingFlow, updateFlow, deleteFlow, duplicateFlow, isUpdatingFlow, isDeletingFlow } = useBookingFlows();
  const { 
    data: flow, 
    isLoading: isLoadingFlow, 
    error: flowError 
  } = useBookingFlow(flowId);

  const {
    useFlowSteps,
    createStep,
    updateStep,
    deleteStep,
    reorderSteps,
    isCreatingStep,
    isUpdatingStep,
    isDeletingStep,
  } = useBookingFlowSteps();

  const { 
    data: steps = [], 
    isLoading: isLoadingSteps,
    refetch: refetchSteps 
  } = useFlowSteps(flowId);

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
    // Store the currently focused element
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
    // Store the currently focused element
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
    // Clear any focused elements before closing
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement.blur && activeElement !== document.body) {
      activeElement.blur();
    }

    // Close dialog first
    setDeleteDialogOpen(false);

    // Restore focus after a brief delay
    setTimeout(() => {
      if (lastFocusedElementRef.current && document.contains(lastFocusedElementRef.current)) {
        try {
          lastFocusedElementRef.current.focus();
        } catch (error) {
          // Fallback to menu button
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
      updateFlow({ id: flow.id, data });
      handleEditDialogClose();
    }
  };

  const handleEditDialogClose = () => {
    // Clear any focused elements before closing
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement.blur && activeElement !== document.body) {
      const dialogElement = activeElement.closest('[role="dialog"]');
      if (dialogElement) {
        activeElement.blur();
      }
    }
    
    // Close dialog first
    setEditDialogOpen(false);

    // Restore focus after a brief delay
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
    // Store the currently focused element
    lastFocusedElementRef.current = document.activeElement as HTMLElement;
    setEditingStep(null);
    setStepDialogOpen(true);
  };

  // This is for editing step PROPERTIES (name, description, etc.)
  const handleEditStep = (step: BookingFlowStep) => {
    // Store the currently focused element
    lastFocusedElementRef.current = document.activeElement as HTMLElement;
    setEditingStep(step);
    setStepDialogOpen(true);
  };

  // This is for configuring step BEHAVIOR (questionnaires, packages, etc.)
  const handleConfigureStep = (step: BookingFlowStep) => {
    setSelectedStepForConfig(step);
    setActiveTab(2); // Switch to configuration tab
  };

  const handleDeleteStep = (stepId: number) => {
    deleteStep(stepId, {
      onSuccess: () => {
        refetchSteps();
        // Clear selected step if it was deleted
        if (selectedStepForConfig?.id === stepId) {
          setSelectedStepForConfig(null);
        }
      }
    });
  };

  const handleStepDialogClose = () => {
    // Clear any focused elements before closing
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement.blur && activeElement !== document.body) {
      const dialogElement = activeElement.closest('[role="dialog"]');
      if (dialogElement) {
        activeElement.blur();
      }
    }
    
    // Close dialog first
    setStepDialogOpen(false);

    // Restore focus after a brief delay
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

  const handleStepReorder = (reorderedSteps: BookingFlowStep[]) => {
    const orderMapping: Record<string, number> = {};
    reorderedSteps.forEach((step, index) => {
      orderMapping[step.id.toString()] = index + 1;
    });

    reorderSteps({
      flow_id: flowId,
      order_mapping: orderMapping
    }, {
      onSuccess: () => {
        refetchSteps();
      }
    });
  };

  const getTabLabel = (label: string, count?: number) => (
    <Box display="flex" alignItems="center" gap={1}>
      {label}
      {count !== undefined && (
        <Chip label={count} size="small" color="primary" />
      )}
    </Box>
  );

  if (isLoadingFlow) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (flowError || !flow) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load booking flow. Please check the URL and try again.
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
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Box display="flex" alignItems="center" gap={2} mb={1}>
            <IconButton
              onClick={() => navigate('/settings/booking/booking-flow')}
              size="small"
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
            {flow.event_type_name && (
              <Chip
                label={flow.event_type_name}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
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
            startIcon={<PreviewIcon />}
            onClick={handlePreviewFlow}
          >
            Preview
          </Button>

          <IconButton ref={menuButtonRef} onClick={handleMenuOpen}>
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
        <MenuItem onClick={handleEditFlow}>
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
        
        <MenuItem onClick={handleDuplicateFlow}>
          <ListItemIcon>
            <DuplicateIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Duplicate Flow</ListItemText>
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={handleDeleteFlow} sx={{ color: 'error.main' }}>
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
        {/* Overview Tab */}
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
                    {flow.event_type_name || 'Any Event Type'}
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
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {/* Steps Tab */}
        <Stack spacing={3}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Booking Flow Steps ({steps.length})
            </Typography>
            <Button
              ref={addStepButtonRef}
              variant="contained"
              startIcon={<StepsIcon />}
              onClick={handleCreateStep}
            >
              Add Step
            </Button>
          </Box>

          {steps.length === 0 ? (
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
                >
                  Add First Step
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Instructions */}
              <Alert severity="info">
                <Typography variant="body2" gutterBottom>
                  <strong>Step Management:</strong>
                </Typography>
                <Typography variant="body2">
                  • <strong>Edit Properties:</strong> Change step name, description, order, and basic settings
                </Typography>
                <Typography variant="body2">
                  • <strong>Configure:</strong> Set up step-specific behavior like questionnaires, packages, payment options
                </Typography>
              </Alert>

              <BookingFlowStepsTable
                steps={steps}
                isLoading={isLoadingSteps}
                onEdit={handleEditStep} // For editing basic properties
                onConfigure={handleConfigureStep} // For configuring step behavior
                onDelete={handleDeleteStep}
                isDeleting={isDeletingStep}
              />

              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Reorder Steps
                  </Typography>
                  <StepReorderList
                    steps={steps}
                    onReorder={handleStepReorder}
                    isLoading={false}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </Stack>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        {/* Configuration Tab */}
        {selectedStepForConfig ? (
          <Box>
            {/* Back to Steps Button */}
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

            {/* Step Configuration Panel */}
            <StepConfigurationPanel
              step={selectedStepForConfig}
              onUpdate={(updatedStep) => {
                refetchSteps();
                // Update the selected step with new data
                setSelectedStepForConfig(updatedStep);
              }}
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
        {/* Preview Tab */}
        <BookingFlowPreview
          flow={flow}
          compact={false}
          showMobileView={false}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={4}>
        {/* Analytics Tab - Coming Soon */}
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

      {/* Edit Flow Dialog */}
      <BookingFlowFormDialog
        open={editDialogOpen}
        onClose={handleEditDialogClose}
        editingFlow={flow}
        onSubmit={handleUpdateFlow}
        isLoading={isUpdatingFlow}
      />

      {/* Step Properties Dialog (for editing basic step info) */}
      <BookingFlowStepFormDialog
        open={stepDialogOpen}
        onClose={handleStepDialogClose}
        editingStep={editingStep}
        flowId={flowId}
        onSubmit={handleStepSubmit}
        isLoading={isCreatingStep || isUpdatingStep}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        disableRestoreFocus
        disableEnforceFocus={false}
        keepMounted={false}
      >
        <DialogTitle>Delete Booking Flow</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{flow.name}"? This action cannot be undone and will affect any active booking sessions.
          </DialogContentText>
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
          >
            {isDeletingFlow ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};