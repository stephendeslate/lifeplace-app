// frontend/admin-crm/src/pages/settings/booking/BookingFlowDetails.tsx

import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Tabs,
  Tab,
  Alert,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
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
  Edit as EditIcon,
  ContentCopy as DuplicateIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  NavigateNext as NavigateNextIcon,
  PlayArrow as PlayIcon,
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
  StepConfigurationPanel,
  ImprovedStepReorderList 
} from '../../../components/bookingflows/steps';
import type { 
  BookingFlowStep,
  CreateBookingFlowStepData,
  UpdateBookingFlowStepData,
  UpdateBookingFlowData 
} from '../../../types/bookingflows.types';

// Modern Design System imports
import { 
  ModernSettingsLayout,
  ModernGlassCard,
  ModernMetricCard,
  ModernEmptyState,
  ModernPageHeader,
  ModernPageLoadingSkeleton,
  createRefreshAction
} from '../../../components/common/ModernDesignSystem';
import { ModernDialog, createDeleteActions } from '../../../components/common';
import { tokens } from '../../../design-system';
import { glassPresets } from '../../../design-system/utils/glassmorphism';
import { 
  getEventTypeDisplayName, 
  getEventTypeChipColor,
  getEventTypeChipStyles
} from '../../../utils/bookingFlowUtils';


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

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleMenuButtonClick = () => {
    // Create a synthetic event for the menu button
    if (menuButtonRef.current) {
      setMenuAnchor(menuButtonRef.current);
    }
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
        } catch {
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
        } catch {
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
        } catch {
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
    return <ModernPageLoadingSkeleton />;
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
    <ModernSettingsLayout>
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

      {/* Modern Header */}
      <ModernPageHeader
        title={flow.name}
        subtitle={flow.description}
        icon={<SettingsIcon />}
        status={{
          label: flow.is_test_mode ? 'Test Mode' : flow.is_active ? 'Active' : 'Inactive',
          color: flow.is_test_mode ? 'warning' : flow.is_active ? 'success' : 'secondary',
          variant: flow.is_active ? 'filled' : 'outlined'
        }}
        stats={[
          {
            label: 'Steps Enabled',
            value: `${flow.enabled_steps_count}/${flow.total_steps}`
          },
          {
            label: 'Event Type',
            value: getEventTypeDisplayName(flow)
          },
          {
            label: 'Last Updated',
            value: new Date(flow.updated_at).toLocaleDateString()
          }
        ]}
        primaryAction={{
          icon: <PlayIcon />,
          label: 'Preview',
          onClick: handlePreviewFlow,
          disabled: isDeletingFlow,
          color: 'primary'
        }}
        secondaryActions={[
          createRefreshAction(() => {
            refetchFlow();
            refetchSteps();
          }),
          {
            icon: <BackIcon />,
            label: 'Back',
            variant: 'outlined',
            onClick: () => navigate('/settings/booking/booking-flow'),
            disabled: isDeletingFlow,
          },
          {
            icon: <SettingsIcon />,
            label: 'Settings',
            variant: 'icon',
            onClick: handleMenuButtonClick,
            tooltip: 'Open settings'
          }
        ]}
        glass
        gradient
      />
      
      {/* Configuration Breadcrumb */}
      {selectedStepForConfig && activeTab === 2 && (
        <Box mb={3}>
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

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            ...glassPresets.medium,
            borderRadius: tokens.spacing.radius.xl,
            border: `1px solid ${tokens.color.borders.glass}`,
            boxShadow: tokens.shadow.component.dropdown,
            mt: 1,
          },
        }}
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

      {/* Modern Tabs */}
      <ModernGlassCard 
        size="medium" 
        borderRadius="xxl"
        sx={{ mb: 4 }}
      >
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTabs-indicator': {
              backgroundColor: tokens.color.primary[500],
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
            '& .MuiTab-root': {
              fontWeight: 600,
              textTransform: 'none',
              color: tokens.color.neutral[600],
              borderRadius: tokens.spacing.radius.lg,
              mx: 0.5,
              transition: 'all 0.2s ease',
              '&:hover': {
                color: tokens.color.primary[600],
                backgroundColor: tokens.color.primary[50],
              },
              '&.Mui-selected': {
                color: tokens.color.primary[700],
                backgroundColor: `${tokens.color.primary[50]}80`,
              },
            },
          }}
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
      </ModernGlassCard>

      {/* Tab Content */}
      <TabPanel value={activeTab} index={0}>
        <Stack spacing={4}>
          {/* Flow Metrics Grid */}
          <Box 
            display="grid" 
            gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }}
            gap={3}
          >
            <ModernMetricCard
              title="Flow Status"
              value={flow.is_active ? 'Active' : 'Inactive'}
              description={flow.is_test_mode ? 'Test Mode Enabled' : 'Production Ready'}
              color={flow.is_active ? 'success' : 'warning'}
              icon={<SettingsIcon />}
            />
            
            <ModernMetricCard
              title="Steps Progress"
              value={`${flow.enabled_steps_count}/${flow.total_steps}`}
              description="Steps Configured"
              color="primary"
              icon={<StepsIcon />}
            />
            
            <ModernMetricCard
              title="Guest Booking"
              value={flow.allow_guest_booking ? 'Allowed' : 'Restricted'}
              description="Access Control"
              color={flow.allow_guest_booking ? 'success' : 'warning'}
              icon={<SettingsIcon />}
            />
            
            <ModernMetricCard
              title="Auto Approval"
              value={flow.auto_approve_bookings ? 'Enabled' : 'Manual'}
              description="Approval Process"
              color={flow.auto_approve_bookings ? 'success' : 'warning'}
              icon={<SettingsIcon />}
            />
          </Box>

          {/* Flow Information */}
          <ModernGlassCard 
            title="Flow Information"
            size="large"
            borderRadius="xxl"
          >
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Name
                </Typography>
                <Typography variant="h6" fontWeight="600">
                  {flow.name}
                </Typography>
              </Box>
              
              {flow.description && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Description
                  </Typography>
                  <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                    {flow.description}
                  </Typography>
                </Box>
              )}
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Event Type
                </Typography>
                <Chip
                  label={getEventTypeDisplayName(flow)}
                  size="medium"
                  color={getEventTypeChipColor(flow)}
                  variant="outlined"
                  sx={getEventTypeChipStyles(flow)}
                />
              </Box>
            </Stack>
          </ModernGlassCard>

          {/* Configuration Summary */}
          <ModernGlassCard 
            title="Configuration Summary"
            size="large"
            borderRadius="xxl"
          >
            <Stack spacing={2.5}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" fontWeight="500">Booking Window:</Typography>
                <Typography variant="body2" fontWeight="600" color="primary.main">
                  {flow.min_advance_booking_days} - {flow.max_advance_booking_days} days
                </Typography>
              </Box>
              
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" fontWeight="500">Discounts:</Typography>
                <Chip 
                  label={flow.allow_discounts ? 'Enabled' : 'Disabled'} 
                  size="small" 
                  color={flow.allow_discounts ? 'success' : 'default'}
                  variant={flow.allow_discounts ? 'filled' : 'outlined'}
                />
              </Box>

              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" fontWeight="500">Payment Processing:</Typography>
                <Chip 
                  label={flow.require_immediate_payment ? 'Immediate' : 'Deferred'} 
                  size="small" 
                  color={flow.require_immediate_payment ? 'success' : 'warning'}
                  variant="outlined"
                />
              </Box>

              {flow.default_payment_gateway && (
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" fontWeight="500">Payment Gateway:</Typography>
                  <Chip 
                    label="Configured" 
                    size="small" 
                    color="success"
                    variant="filled"
                  />
                </Box>
              )}
            </Stack>
          </ModernGlassCard>
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
            <ModernEmptyState
              icon={StepsIcon}
              title="No steps configured"
              description="Add steps to guide clients through the booking process and create a seamless booking experience."
              primaryAction={{
                label: isCreatingStep ? 'Adding...' : 'Add First Step',
                onClick: handleCreateStep,
                icon: <StepsIcon />,
                color: 'primary'
              }}
              tip={{
                text: "Start with basic steps like Contact Info, DateTime, and Package Selection for a complete booking flow.",
                type: 'info'
              }}
              size="medium"
              color="primary"
            />
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
          <ModernEmptyState
            icon={SettingsIcon}
            title="Select a step to configure"
            description="Choose a step from the Steps tab to configure its specific settings, validation rules, and behavior customizations."
            primaryAction={{
              label: 'Go to Steps',
              onClick: () => setActiveTab(1),
              icon: <StepsIcon />,
              color: 'primary'
            }}
            tip={{
              text: "Each step can be customized with unique settings, conditional logic, and validation rules to match your business needs.",
              type: 'info'
            }}
            size="medium"
            color="secondary"
          />
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
        <ModernEmptyState
          icon={AnalyticsIcon}
          title="Analytics Coming Soon"
          description="Advanced analytics dashboard will show booking flow performance, conversion rates, step completion metrics, and detailed user behavior insights."
          tip={{
            text: "Analytics will include conversion funnels, A/B testing capabilities, user journey mapping, and performance optimization recommendations.",
            type: 'pro'
          }}
          size="large"
          color="primary"
          illustration="gradient"
        />
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
      <ModernDialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        title="Delete Booking Flow"
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={isDeletingFlow}
        disableBackdropClick={isDeletingFlow}
        actions={createDeleteActions(handleDeleteCancel, handleDeleteConfirm, isDeletingFlow)}
      >
        <Stack spacing={3}>
          <Typography variant="body1" sx={{ fontSize: '1rem', lineHeight: 1.6 }}>
            Are you sure you want to delete <strong>"{flow.name}"</strong>?
          </Typography>
          <Alert 
            severity="warning"
            sx={{
              ...glassPresets.light,
              borderRadius: tokens.spacing.radius.lg,
              border: `1px solid ${tokens.color.warning[300]}`,
              '& .MuiAlert-icon': {
                color: tokens.color.warning[600]
              }
            }}
          >
            <Typography variant="subtitle2" gutterBottom fontWeight="600">
              This action cannot be undone and will:
            </Typography>
            <Typography variant="body2" component="div" sx={{ mb: 0.5 }}>
              • Delete all {flow.total_steps} configured steps
            </Typography>
            <Typography variant="body2" component="div" sx={{ mb: 0.5 }}>
              • Mark any active booking sessions as abandoned
            </Typography>
            <Typography variant="body2" component="div">
              • Remove all analytics data for this flow
            </Typography>
          </Alert>
        </Stack>
      </ModernDialog>

      {/* Step Reorder Dialog */}
      <ModernDialog
        open={reorderDialogOpen}
        onClose={() => setReorderDialogOpen(false)}
        title="Reorder Booking Flow Steps"
        maxWidth="md"
        fullWidth
        disableEscapeKeyDown={isReorderingSteps}
        disableBackdropClick={isReorderingSteps}
        actions={[
          {
            label: 'Cancel',
            onClick: () => setReorderDialogOpen(false),
            variant: 'outlined',
            disabled: isReorderingSteps,
          },
          {
            label: isReorderingSteps ? 'Saving...' : 'Save Order',
            onClick: () => setReorderDialogOpen(false),
            variant: 'contained',
            color: 'primary',
            loading: isReorderingSteps,
          },
        ]}
      >
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
            Drag and drop steps to change their order in the booking flow. The order affects how clients progress through your booking process.
          </Typography>
          
          <Box>
            <ImprovedStepReorderList 
              flowId={Number(id)}
              steps={steps}
              onReorderComplete={() => {
                refetchSteps();
                setReorderDialogOpen(false);
              }}
            />
          </Box>
        </Stack>
      </ModernDialog>
    </ModernSettingsLayout>
  );
};