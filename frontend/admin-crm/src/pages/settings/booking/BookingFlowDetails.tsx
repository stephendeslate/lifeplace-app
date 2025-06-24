// frontend/admin-crm/src/pages/settings/booking/BookingFlowDetails.tsx
// FIXED: Routing and parameter parsing issues

import {
  ArrowBack as ArrowBackIcon,
  Analytics as AnalyticsIcon,
  Preview as PreviewIcon,
  Science as TestIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { format } from "date-fns";
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { DropResult } from "@hello-pangea/dnd";
import { useLayout } from "../../../contexts/LayoutContext";
import { useEventTypes } from "../../../hooks/useEvents";
import { useBookingFlow, useBookingFlowSteps, useBookingFlows } from "../../../hooks/useBookingFlows";
import { FlowGeneralSettings } from "../../../components/bookingflow/FlowGeneralSettings";
import { FlowStepsManager } from "../../../components/bookingflow/FlowStepsManager";
import { StepDialog } from "../../../components/bookingflow/StepDialog";
import { BookingStepConfiguration } from "../../../components/bookingflow/BookingStepConfiguration";
import { BookingSessions } from "../../../components/bookingflow/BookingSessions";
import type {
  BookingFlowStep,
  CreateBookingFlowData,
  UpdateBookingFlowData,
  CreateBookingFlowStepData,
  BookingFlowFormErrors,
} from "../../../types/bookingflows.types";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`flow-tabpanel-${index}`}
      aria-labelledby={`flow-tab-${index}`}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

export const BookingFlowDetails: React.FC = () => {
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();
  const { id } = useParams<{ id: string }>();
  
  // FIXED: Proper routing logic
  const isNewFlow = id === 'new';
  const flowId = isNewFlow ? undefined : (id ? parseInt(id, 10) : undefined);
  
  console.log('🔄 BookingFlowDetails params:', { 
    urlId: id, 
    isNewFlow, 
    flowId,
    isValidId: !isNaN(Number(id))
  });
  
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState<CreateBookingFlowData | UpdateBookingFlowData>({
    name: '',
    description: '',
    event_type: 0,
    is_active: true,
    allow_guest_booking: true,
    require_account_creation: false,
    auto_approve_bookings: false,
    enable_progress_saving: true,
    max_advance_booking_days: 365,
    min_advance_booking_days: 1,
    allow_discounts: true,
  });
  const [formErrors, setFormErrors] = useState<BookingFlowFormErrors>({});
  const [stepDialog, setStepDialog] = useState<{
    open: boolean;
    step: BookingFlowStep | null;
    editMode: boolean;
  }>({ open: false, step: null, editMode: false });
  const [configurationDialog, setConfigurationDialog] = useState<{
    open: boolean;
    step: BookingFlowStep | null;
  }>({ open: false, step: null });

  // Hooks
  const { flow, isLoading, error } = useBookingFlow(flowId);
  const {
    steps,
    createStep,
    isCreating: isCreatingStep,
    updateStep,
    isUpdating: isUpdatingStep,
    deleteStep,
    reorderSteps,
    isReordering: isReorderingSteps,
    refetch: refetchSteps,
  } = useBookingFlowSteps(flowId);
  
  const {
    createFlow,
    isCreating: isCreatingFlow,
    updateFlow,
    isUpdating: isUpdatingFlow,
  } = useBookingFlows();
  
  const { eventTypes } = useEventTypes();

  console.log('🔧 Hooks status:', {
    createFlow: typeof createFlow,
    updateFlow: typeof updateFlow,
    isCreatingFlow,
    isUpdatingFlow,
    eventTypesCount: eventTypes.length,
    flowLoaded: !!flow,
    stepsCount: steps.length
  });

  // Set breadcrumbs
  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings', path: '/settings' },
      { label: 'Booking Configuration' },
      { label: 'Booking Flows', path: '/settings/booking/booking-flow' },
      { label: isNewFlow ? 'New Flow' : flow?.name || 'Flow Details' },
    ]);
  }, [setBreadcrumbs, isNewFlow, flow?.name]);

  // Initialize form data
  useEffect(() => {
    if (flow && !isNewFlow) {
      console.log('📝 Initializing form data with flow:', flow);
      setFormData({
        name: flow.name,
        description: flow.description,
        event_type: typeof flow.event_type === 'object' ? flow.event_type.id : flow.event_type,
        is_active: flow.is_active,
        allow_guest_booking: flow.allow_guest_booking,
        require_account_creation: flow.require_account_creation,
        auto_approve_bookings: flow.auto_approve_bookings,
        enable_progress_saving: flow.enable_progress_saving,
        max_advance_booking_days: flow.max_advance_booking_days,
        min_advance_booking_days: flow.min_advance_booking_days,
        allow_discounts: flow.allow_discounts,
        redirect_url: flow.redirect_url,
        success_message: flow.success_message,
      });
    }
  }, [flow, isNewFlow]);

  // Form validation
  const validateForm = (): boolean => {
    const errors: BookingFlowFormErrors = {};
    
    if (!formData.name?.trim()) {
      errors.name = 'Flow name is required';
    }
    
    if (!formData.event_type || formData.event_type === 0) {
      errors.event_type = 'Event type is required';
    }
    
    if (formData.min_advance_booking_days && 
        formData.max_advance_booking_days && 
        formData.min_advance_booking_days >= formData.max_advance_booking_days) {
      errors.max_advance_booking_days = 'Maximum days must be greater than minimum days';
    }

    if (formData.redirect_url && !isValidUrl(formData.redirect_url)) {
      errors.redirect_url = 'Please enter a valid URL';
    }
    
    console.log('✅ Form validation result:', { errors, hasErrors: Object.keys(errors).length > 0 });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Helper function to validate URL
  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  // Handlers
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let processedValue: any = value;
    
    if (type === 'checkbox') {
      processedValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
      processedValue = value ? parseInt(value, 10) : undefined;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue,
    }));
    
    // Clear error when user starts typing
    if (formErrors[name as keyof BookingFlowFormErrors]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;
    const processedValue = name === 'event_type' ? parseInt(value, 10) : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue,
    }));
    
    // Clear error when user selects
    if (formErrors[name as keyof BookingFlowFormErrors]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleBack = () => {
    navigate('/settings/booking/booking-flow');
  };

  // FIXED: Proper save logic with detailed debugging
  const handleSave = async () => {
    console.log('=== HANDLE SAVE START ===');
    console.log('📊 Save context:', {
      isNewFlow,
      flowId,
      hasFormData: !!formData,
      formDataKeys: Object.keys(formData),
      createFlowType: typeof createFlow,
      updateFlowType: typeof updateFlow
    });
    console.log('📦 Form data to save:', formData);
    
    if (!validateForm()) {
      console.log('❌ Form validation failed:', formErrors);
      return;
    }

    try {
      console.log('✅ Form validation passed, proceeding with save...');
      
      if (isNewFlow) {
        console.log('🆕 Creating new flow...');
        
        if (typeof createFlow !== 'function') {
          console.error('❌ createFlow is not a function!', createFlow);
          return;
        }
        
        const result = await createFlow(formData as CreateBookingFlowData);
        console.log('✅ Flow created successfully:', result);
        navigate(`/settings/booking/booking-flow/${result.id}`);
        
      } else if (flowId && flowId > 0) {
        console.log('📝 Updating existing flow with ID:', flowId);
        
        if (typeof updateFlow !== 'function') {
          console.error('❌ updateFlow is not a function!', updateFlow);
          return;
        }
        
        const result = await updateFlow(flowId, formData as UpdateBookingFlowData);
        console.log('✅ Flow updated successfully:', result);
        
      } else {
        console.error('❌ Invalid state: not new flow but no valid flowId', {
          isNewFlow,
          flowId,
          urlId: id
        });
        // This might happen if we're on an invalid URL - redirect to create new
        navigate('/settings/booking/booking-flow/new');
        return;
      }
      
    } catch (error) {
      console.error('❌ Save operation failed:', error);
      console.error('Error details:', {
        message: (error as any)?.message,
        response: (error as any)?.response?.data,
        status: (error as any)?.response?.status
      });
    }
    
    console.log('=== HANDLE SAVE END ===');
  };

  const handleAddStep = () => {
    if (!flowId && isNewFlow) {
      alert('Please save the flow first before adding steps');
      return;
    }
    setStepDialog({ open: true, step: null, editMode: false });
  };

  const handleEditStep = (step: BookingFlowStep) => {
    setStepDialog({ open: true, step, editMode: true });
  };

  const handleDeleteStep = async (step: BookingFlowStep) => {
    if (window.confirm(`Are you sure you want to delete the step "${step.name}"? This action cannot be undone.`)) {
      try {
        await deleteStep(step.id);
      } catch (error) {
        console.error('Delete step failed:', error);
      }
    }
  };

  const handleConfigureStep = (step: BookingFlowStep) => {
    setConfigurationDialog({ open: true, step });
  };

  const handleStepSave = async (stepData: CreateBookingFlowStepData) => {
    try {
      if (stepDialog.editMode && stepDialog.step) {
        await updateStep(stepDialog.step.id, stepData);
      } else {
        await createStep(stepData);
      }
      
      setStepDialog({ open: false, step: null, editMode: false });
    } catch (error) {
      console.error('Step save operation failed:', error);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !flowId) return;

    const items = Array.from(steps);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Create order mapping
    const orderMapping: Record<number, number> = {};
    items.forEach((item, index) => {
      orderMapping[item.id] = index + 1;
    });

    try {
      await reorderSteps({
        flow_id: flowId,
        order_mapping: orderMapping,
      });
    } catch (error) {
      console.error('Reorder failed:', error);
      refetchSteps();
    }
  };

  const handlePreview = () => {
    if (flow) {
      window.open(`/booking/${flow.id}/preview`, '_blank');
    }
  };

  const handleViewAnalytics = () => {
    if (flow) {
      navigate(`/settings/booking/flows/${flow.id}/analytics`);
    }
  };

  // Loading state for edit mode
  if (isLoading && !isNewFlow) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Error state for edit mode
  if (error && !isNewFlow) {
    return (
      <Box sx={{ mt: 3 }}>
        <Alert severity="error">
          Error loading booking flow. The flow may not exist or you may not have permission to view it.
        </Alert>
      </Box>
    );
  }

  // Invalid ID state
  if (!isNewFlow && (!id || (id !== 'new' && isNaN(Number(id))))) {
    return (
      <Box sx={{ mt: 3 }}>
        <Alert severity="warning">
          Invalid flow ID. Please check the URL or create a new flow.
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => navigate('/settings/booking/booking-flow/new')}
          sx={{ mt: 2 }}
        >
          Create New Flow
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 4 }}>
      {/* DEBUG INFO */}
      <Alert severity="info" sx={{ mb: 2 }}>
        <strong>Debug Info:</strong> 
        URL ID: {id || 'undefined'} | 
        isNewFlow: {String(isNewFlow)} | 
        flowId: {flowId || 'undefined'} | 
        createFlow: {typeof createFlow} |
        event_type: {formData.event_type}
      </Alert>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={handleBack} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            {isNewFlow ? 'Create Booking Flow' : flow?.name || 'Booking Flow'}
          </Typography>
          {flow && (
            <Typography variant="body2" color="textSecondary">
              Created {format(new Date(flow.created_at), 'MMM dd, yyyy')} • 
              Last updated {format(new Date(flow.updated_at), 'MMM dd, yyyy')}
            </Typography>
          )}
        </Box>
        
        {flow && !isNewFlow && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<PreviewIcon />}
              onClick={handlePreview}
            >
              Preview
            </Button>
            <Button
              variant="outlined"
              startIcon={<AnalyticsIcon />}
              onClick={handleViewAnalytics}
            >
              Analytics
            </Button>
          </Box>
        )}
      </Box>

      {/* Status Chips */}
      {flow && !isNewFlow && (
        <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
          <Chip
            label={flow.is_active ? 'Active' : 'Inactive'}
            color={flow.is_active ? 'success' : 'default'}
          />
          {flow.is_test_mode && (
            <Chip
              label="Test Mode"
              color="warning"
              icon={<TestIcon />}
            />
          )}
          <Chip
            label={`${flow.total_steps} steps`}
            variant="outlined"
          />
          <Chip
            label={`${flow.enabled_steps_count} enabled`}
            variant="outlined"
            color="primary"
          />
        </Box>
      )}

      {/* Tabs */}
      <Card>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="booking flow tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="General Settings" />
          <Tab label="Steps" disabled={isNewFlow} />
          <Tab label="Analytics" disabled={isNewFlow} />
          <Tab label="Sessions" disabled={isNewFlow} />
        </Tabs>

        {/* General Settings Tab */}
        <TabPanel value={activeTab} index={0}>
          <FlowGeneralSettings
            formData={formData}
            formErrors={formErrors}
            eventTypes={eventTypes}
            isNewFlow={isNewFlow}
            isCreating={isCreatingFlow}
            isUpdating={isUpdatingFlow}
            onInputChange={handleInputChange}
            onSelectChange={handleSelectChange}
            onSave={handleSave}
            onCancel={handleBack}
          />
        </TabPanel>

        {/* Steps Tab */}
        <TabPanel value={activeTab} index={1}>
          <FlowStepsManager
            steps={steps}
            flowId={flowId}
            isLoading={isLoading}
            isReordering={isReorderingSteps}
            onAddStep={handleAddStep}
            onEditStep={handleEditStep}
            onDeleteStep={handleDeleteStep}
            onConfigureStep={handleConfigureStep}
            onDragEnd={handleDragEnd}
          />
        </TabPanel>

        {/* Analytics Tab */}
        <TabPanel value={activeTab} index={2}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Analytics
          </Typography>
          <Alert severity="info">
            Analytics data will be displayed here. This includes conversion rates, 
            step completion rates, and session analytics.
          </Alert>
        </TabPanel>

        {/* Sessions Tab */}
        <TabPanel value={activeTab} index={3}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Booking Sessions
          </Typography>
          {flowId ? (
            <BookingSessions flowId={flowId} />
          ) : (
            <Alert severity="info">
              Active and completed booking sessions will be displayed here.
            </Alert>
          )}
        </TabPanel>
      </Card>

      {/* Step Dialog */}
      <StepDialog
        open={stepDialog.open}
        step={stepDialog.step}
        onClose={() => setStepDialog({ open: false, step: null, editMode: false })}
        onSave={handleStepSave}
        isLoading={isCreatingStep || isUpdatingStep}
        editMode={stepDialog.editMode}
        flowId={flowId}
        existingSteps={steps}
      />

      {/* Step Configuration Dialog */}
      <Dialog 
        open={configurationDialog.open} 
        onClose={() => setConfigurationDialog({ open: false, step: null })}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Step Configuration
        </DialogTitle>
        <DialogContent>
          {configurationDialog.step && (
            <BookingStepConfiguration
              step={configurationDialog.step}
              onConfigurationSaved={() => {
                // Optionally refresh steps or show success message
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigurationDialog({ open: false, step: null })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};