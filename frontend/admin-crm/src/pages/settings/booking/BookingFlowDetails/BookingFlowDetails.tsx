// frontend/admin-crm/src/pages/settings/booking/BookingFlowDetails/BookingFlowDetails.tsx

import React from 'react';
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
import { BookingFlowFormDialog, BookingFlowPreview } from '@/components/bookingflows/flows';
import {
  BookingFlowStepFormDialog,
  StepConfigurationPanel,
  ImprovedStepReorderList,
} from '@/components/bookingflows/steps';
import BookingFlowSteps from '../BookingFlowSteps';
import {
  ModernSettingsLayout,
  ModernEmptyState,
  ModernPageHeader,
  ModernPageLoadingSkeleton,
  createRefreshAction,
} from '@/components/common/ModernDesignSystem';
import { ModernDialog, createDeleteActions } from '@/components/common';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { getEventTypeDisplayName } from '@/utils/bookingFlowUtils';
import { useBookingFlowDetailsLogic } from './useBookingFlowDetailsLogic';
import { OverviewTab } from './OverviewTab';

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
  const {
    id,
    flowId,
    flow,
    steps,
    isLoadingFlow,
    flowError,
    activeTab,
    menuAnchor,
    editDialogOpen,
    stepDialogOpen,
    deleteDialogOpen,
    editingStep,
    selectedStepForConfig,
    reorderDialogOpen,
    isUpdatingFlow,
    isDeletingFlow,
    isDuplicatingFlow,
    isCreatingStep,
    isUpdatingStep,
    isReorderingSteps,
    updateError,
    deleteError,
    duplicateError,
    createStepError,
    updateStepError,
    deleteStepError,
    reorderStepsError,
    updateConfigurationError,
    refetchFlow,
    refetchSteps,
    navigate,
    setActiveTab,
    setSelectedStepForConfig,
    setReorderDialogOpen,
    handleTabChange,
    handleMenuClose,
    handleMenuButtonClick,
    handleEditFlow,
    handleDuplicateFlow,
    handleDeleteFlow,
    handleDeleteConfirm,
    handleDeleteCancel,
    handlePreviewFlow,
    handleUpdateFlow,
    handleEditDialogClose,
    handleStepDialogClose,
    handleStepSubmit,
    handleStepConfigurationUpdate,
  } = useBookingFlowDetailsLogic();

  const getTabLabel = (label: string, count?: number) => (
    <Box display="flex" alignItems="center" gap={1}>
      {label}
      {count !== undefined && <Chip label={count} size="small" color="primary" />}
    </Box>
  );

  if (flowError || !id || isNaN(flowId)) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {flowError
            ? `Failed to load booking flow: ${flowError instanceof Error ? flowError.message : 'Unknown error'}`
            : 'Invalid booking flow ID'}
        </Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/settings/booking/booking-flow')}>
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
          Booking flow not found. It may have been deleted or you may not have permission to view
          it.
        </Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/settings/booking/booking-flow')}>
          Back to Booking Flows
        </Button>
      </Box>
    );
  }

  return (
    <ModernSettingsLayout maxWidth="xl">
      {/* Enhanced Error Display */}
      <ErrorDisplay
        errors={{
          ...(updateError ? { update: updateError } : {}),
          ...(deleteError ? { delete: deleteError } : {}),
          ...(duplicateError ? { duplicate: duplicateError } : {}),
          ...(createStepError ? { createStep: createStepError } : {}),
          ...(updateStepError ? { updateStep: updateStepError } : {}),
          ...(deleteStepError ? { deleteStep: deleteStepError } : {}),
          ...(reorderStepsError ? { reorderSteps: reorderStepsError } : {}),
          ...(updateConfigurationError ? { configuration: updateConfigurationError } : {}),
        }}
        title="Operation Failed"
        variant="inline"
      />

      {/* Modern Header */}
      <ModernPageHeader
        title={flow.name}
        subtitle={flow.description}
        icon={<SettingsIcon />}
        status={{
          label: flow.is_test_mode ? 'Test Mode' : flow.is_active ? 'Active' : 'Inactive',
          color: flow.is_test_mode ? 'warning' : flow.is_active ? 'success' : 'secondary',
          variant: flow.is_active ? 'filled' : 'outlined',
        }}
        stats={[
          {
            label: 'Steps Enabled',
            value: `${flow.enabled_steps_count}/${flow.total_steps}`,
          },
          {
            label: 'Event Type',
            value: getEventTypeDisplayName(flow),
          },
          {
            label: 'Last Updated',
            value: new Date(flow.updated_at).toLocaleDateString(),
          },
        ]}
        primaryAction={{
          icon: <PlayIcon />,
          label: 'Preview',
          onClick: handlePreviewFlow,
          disabled: isDeletingFlow,
          color: 'primary',
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
            tooltip: 'Open settings',
          },
        ]}
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
              Configure: {selectedStepForConfig.step_type_display}
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
            borderRadius: 2,
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
          <ListItemText>{isDuplicatingFlow ? 'Duplicating...' : 'Duplicate Flow'}</ListItemText>
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
      <Box sx={{ mb: 4, borderRadius: 1, bgcolor: 'background.paper' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              fontWeight: 600,
              textTransform: 'none',
            },
          }}
        >
          <Tab icon={<SettingsIcon />} label="Overview" iconPosition="start" />
          <Tab
            icon={<StepsIcon />}
            label={getTabLabel('Steps', steps.length)}
            iconPosition="start"
          />
          <Tab
            icon={<SettingsIcon />}
            label={
              selectedStepForConfig
                ? `Configure: ${selectedStepForConfig.step_type_display}`
                : 'Configuration'
            }
            iconPosition="start"
            disabled={!selectedStepForConfig}
          />
          <Tab icon={<PreviewIcon />} label="Preview" iconPosition="start" />
          <Tab icon={<AnalyticsIcon />} label="Analytics" iconPosition="start" disabled />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <TabPanel value={activeTab} index={0}>
        <OverviewTab flow={flow} />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <BookingFlowSteps embedded={true} />
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
              color: 'primary',
            }}
            tip={{
              text: 'Each step can be customized with unique settings, conditional logic, and validation rules to match your business needs.',
              type: 'info',
            }}
            size="medium"
            color="secondary"
          />
        )}
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        {flow && <BookingFlowPreview flow={flow} compact={false} showMobileView={false} />}
      </TabPanel>

      <TabPanel value={activeTab} index={4}>
        <ModernEmptyState
          icon={AnalyticsIcon}
          title="Analytics Coming Soon"
          description="Advanced analytics dashboard will show booking flow performance, conversion rates, step completion metrics, and detailed user behavior insights."
          tip={{
            text: 'Analytics will include conversion funnels, A/B testing capabilities, user journey mapping, and performance optimization recommendations.',
            type: 'pro',
          }}
          size="large"
          color="primary"
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
              borderRadius: 2,
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
            Drag and drop steps to change their order in the booking flow. The order affects how
            clients progress through your booking process.
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
