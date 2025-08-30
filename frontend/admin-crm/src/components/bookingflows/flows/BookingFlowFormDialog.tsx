// frontend/admin-crm/src/components/bookingflows/flows/BookingFlowFormDialog.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  Tabs,
  Tab,
  Divider,
  Chip,
  OutlinedInput,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  EventNote as FlowIcon,
  Settings as ConfigIcon,
  Analytics as AnalyticsIcon,
  Email as EmailIcon,
  Payment as PaymentIcon,
} from '@mui/icons-material';
// Modern Design System imports
import { tokens } from '../../../design-system';
import { glassPresets } from '../../../design-system/utils/glassmorphism';
import { 
  type BookingFlowFormDialogProps,
  type BookingFlowFormData,
  type CreateBookingFlowData,
  type UpdateBookingFlowData,
} from '../../../types/bookingflows.types';
import { useEventTypes } from '../../../hooks/useEvents';
import { useWorkflowTemplates } from '../../../hooks/useWorkflows';
import { useCommunications } from '../../../hooks/useCommunications';
import { useDiscounts } from '../../../hooks/useProducts';
import { usePaymentGateways } from '../../../hooks/usePayments';

// Modern Design System imports

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`booking-flow-tabpanel-${index}`}
    aria-labelledby={`booking-flow-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
  </div>
);

// Enhanced form data interface to match evolved backend
interface EnhancedBookingFlowFormData extends BookingFlowFormData {
  // Payment gateway fields from evolved backend
  allowed_payment_gateways: number[];
  default_payment_gateway: string; // String for form handling
  require_immediate_payment: boolean;
}

const defaultFormData: EnhancedBookingFlowFormData = {
  name: '',
  description: '',
  event_type: '', // Empty string for "Any Event Type"
  workflow_template: '',
  confirmation_email_template: '',
  reminder_email_template: '',
  is_active: true,
  allow_guest_booking: true,
  require_account_creation: false,
  auto_approve_bookings: false,
  enable_progress_saving: true,
  max_advance_booking_days: '365',
  min_advance_booking_days: '1',
  allow_discounts: true,
  available_discounts: [],
  // Payment gateway fields from evolved backend
  allowed_payment_gateways: [],
  default_payment_gateway: '',
  require_immediate_payment: false,
  redirect_url: '',
  success_message: '',
  conversion_tracking_code: '',
};

export const BookingFlowFormDialog: React.FC<BookingFlowFormDialogProps> = ({
  open,
  onClose,
  editingFlow,
  onSubmit,
  isLoading,
}) => {
  const [formData, setFormData] = useState<EnhancedBookingFlowFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState(0);
  
  // Ref for the first input field to focus when dialog opens
  const firstInputRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  // Load dependencies using existing hooks
  const { 
    eventTypes: eventTypesData = [], 
    isLoadingEventTypes 
  } = useEventTypes({ is_active: true });

  const { 
    templates: workflowTemplatesData = [], 
    isLoadingTemplates: isLoadingWorkflows 
  } = useWorkflowTemplates({ is_active: true });

  // Get email templates - filtering communication templates by EMAIL channel
  const { 
    useTemplates 
  } = useCommunications();
  
  const { 
    data: emailTemplatesData = [], 
    isLoading: isLoadingEmailTemplates 
  } = useTemplates({ 
    channel: 'EMAIL',
    category: 'SYSTEM' // or 'MANUAL' depending on your needs
  });

  const { 
    discounts: discountsData = [], 
    isLoadingDiscounts 
  } = useDiscounts({ is_active: true });

  const { 
    data: paymentGatewaysData = [], 
    isLoading: isLoadingPaymentGateways 
  } = usePaymentGateways();

  // Check if any dependencies are still loading
  const isLoadingDependencies = 
    isLoadingEventTypes || 
    isLoadingWorkflows || 
    isLoadingEmailTemplates || 
    isLoadingDiscounts || 
    isLoadingPaymentGateways;

  useEffect(() => {
    if (open) {
      if (editingFlow) {
        setFormData({
          name: editingFlow.name || '',
          description: editingFlow.description || '',
          // Handle null event_type properly
          event_type: editingFlow.event_type?.toString() || '',
          workflow_template: editingFlow.workflow_template?.toString() || '',
          confirmation_email_template: editingFlow.confirmation_email_template?.toString() || '',
          reminder_email_template: editingFlow.reminder_email_template?.toString() || '',
          is_active: editingFlow.is_active ?? true,
          allow_guest_booking: editingFlow.allow_guest_booking ?? true,
          require_account_creation: editingFlow.require_account_creation ?? false,
          auto_approve_bookings: editingFlow.auto_approve_bookings ?? false,
          enable_progress_saving: editingFlow.enable_progress_saving ?? true,
          max_advance_booking_days: editingFlow.max_advance_booking_days?.toString() || '365',
          min_advance_booking_days: editingFlow.min_advance_booking_days?.toString() || '1',
          allow_discounts: editingFlow.allow_discounts ?? true,
          available_discounts: editingFlow.available_discounts || [],
          // Payment gateway fields from evolved backend
          allowed_payment_gateways: editingFlow.allowed_payment_gateways || [],
          default_payment_gateway: editingFlow.default_payment_gateway?.toString() || '',
          require_immediate_payment: editingFlow.require_immediate_payment ?? false,
          redirect_url: editingFlow.redirect_url || '',
          success_message: editingFlow.success_message || '',
          conversion_tracking_code: editingFlow.conversion_tracking_code || '',
        });
      } else {
        setFormData(defaultFormData);
      }
      setErrors({});
      setActiveTab(0);

      // Focus the first input after dialog animation completes
      setTimeout(() => {
        if (firstInputRef.current && document.contains(firstInputRef.current)) {
          firstInputRef.current.focus();
        }
      }, 150);
    }
  }, [editingFlow, open]);

  const handleInputChange = (field: keyof EnhancedBookingFlowFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | 
           SelectChangeEvent<string | number[]> |
           { target: { value: unknown } }
  ) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleSwitchChange = (field: keyof EnhancedBookingFlowFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.checked,
    }));
  };

  // Handler for multi-select fields like payment gateways and discounts
  const handleMultiSelectChange = (field: keyof EnhancedBookingFlowFormData) => (
    event: SelectChangeEvent<number[]>
  ) => {
    const value = event.target.value as number[];
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error when user makes selection
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  // @ts-expect-error - Legacy code requiring type fix
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    const maxDays = parseInt(formData.max_advance_booking_days) || 0;
    const minDays = parseInt(formData.min_advance_booking_days) || 0;

    if (minDays < 1) {
      newErrors.min_advance_booking_days = 'Minimum days must be at least 1';
    }

    if (maxDays < 1) {
      newErrors.max_advance_booking_days = 'Maximum days must be at least 1';
    }

    if (minDays >= maxDays) {
      newErrors.max_advance_booking_days = 'Maximum days must be greater than minimum days';
    }

    // Validate payment gateway configuration
    if (formData.require_immediate_payment && formData.allowed_payment_gateways.length === 0) {
      newErrors.allowed_payment_gateways = 'At least one payment gateway is required when immediate payment is enabled';
    }

    if (formData.default_payment_gateway && 
        !formData.allowed_payment_gateways.includes(parseInt(formData.default_payment_gateway))) {
      newErrors.default_payment_gateway = 'Default payment gateway must be in the allowed gateways list';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleClose = () => {
    if (!isLoading) {
      // Clear focus from any focused elements within the dialog before closing
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && activeElement.blur && activeElement !== document.body) {
        // Only blur if the element is within this dialog
        const dialogElement = activeElement.closest('[role="dialog"]');
        if (dialogElement) {
          activeElement.blur();
        }
      }
      
      // Small delay to ensure blur completes before dialog closes
      setTimeout(() => {
        onClose();
      }, 10);
    }
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      // Switch to the tab with errors
      if (errors.name) setActiveTab(0);
      else if (errors.min_advance_booking_days || errors.max_advance_booking_days) setActiveTab(1);
      else if (errors.allowed_payment_gateways || errors.default_payment_gateway) setActiveTab(2);
      return;
    }

    // Convert form data to API data format matching evolved backend
    const submitData: CreateBookingFlowData | UpdateBookingFlowData = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      // Convert empty string to null for "Any Event Type"
      event_type: formData.event_type === '' || formData.event_type === 'null' 
        ? null 
        : parseInt(formData.event_type) || null,
      workflow_template: formData.workflow_template ? parseInt(formData.workflow_template) : null,
      confirmation_email_template: formData.confirmation_email_template ? parseInt(formData.confirmation_email_template) : null,
      reminder_email_template: formData.reminder_email_template ? parseInt(formData.reminder_email_template) : null,
      is_active: formData.is_active,
      allow_guest_booking: formData.allow_guest_booking,
      require_account_creation: formData.require_account_creation,
      auto_approve_bookings: formData.auto_approve_bookings,
      enable_progress_saving: formData.enable_progress_saving,
      max_advance_booking_days: parseInt(formData.max_advance_booking_days) || 365,
      min_advance_booking_days: parseInt(formData.min_advance_booking_days) || 1,
      allow_discounts: formData.allow_discounts,
      available_discounts: formData.available_discounts,
      // Payment gateway fields for evolved backend
      allowed_payment_gateways: formData.allowed_payment_gateways,
      default_payment_gateway: formData.default_payment_gateway ? parseInt(formData.default_payment_gateway) : null,
      require_immediate_payment: formData.require_immediate_payment,
      redirect_url: formData.redirect_url.trim() || undefined,
      success_message: formData.success_message.trim() || undefined,
      conversion_tracking_code: formData.conversion_tracking_code.trim() || undefined,
    };

    onSubmit(submitData);
  };

  // Handle escape key
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && !isLoading) {
      handleClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { 
          minHeight: '80vh',
          ...glassPresets.light,
          borderRadius: tokens.spacing.radius.xxl,
          border: `1px solid ${tokens.color.borders.glass}`,
          background: `linear-gradient(135deg, ${tokens.color.neutral[50]} 0%, ${tokens.color.neutral[100]} 100%)`,
        },
        onKeyDown: handleKeyDown
      }}
      // Enhanced focus management props
      disableRestoreFocus={false}
      disableEnforceFocus={false}
      keepMounted={false}
      // Additional accessibility props
      aria-labelledby="booking-flow-dialog-title"
      aria-describedby="booking-flow-dialog-description"
    >
      {open && (
        <>
          <DialogTitle id="booking-flow-dialog-title">
            <Box display="flex" alignItems="center" gap={1}>
              <FlowIcon color="primary" />
              {editingFlow ? 'Edit Booking Flow' : 'Create New Booking Flow'}
            </Box>
          </DialogTitle>
      
          <DialogContent id="booking-flow-dialog-description">
            {isLoadingDependencies ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ mt: 1 }}>
                {/* Tab Navigation */}
                <Tabs 
                  value={activeTab} 
                  onChange={handleTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  <Tab 
                    icon={<FlowIcon />} 
                    label="Basic Info" 
                    iconPosition="start"
                  />
                  <Tab 
                    icon={<ConfigIcon />} 
                    label="Configuration" 
                    iconPosition="start"
                  />
                  <Tab 
                    icon={<PaymentIcon />} 
                    label="Payment" 
                    iconPosition="start"
                  />
                  <Tab 
                    icon={<EmailIcon />} 
                    label="Templates" 
                    iconPosition="start"
                  />
                  <Tab 
                    icon={<AnalyticsIcon />} 
                    label="Advanced" 
                    iconPosition="start"
                  />
                </Tabs>

                {/* Basic Information Tab */}
                <TabPanel value={activeTab} index={0}>
                  <Stack spacing={3}>
                    <TextField
                      inputRef={firstInputRef}
                      fullWidth
                      label="Flow Name"
                      value={formData.name}
                      onChange={handleInputChange('name')}
                      error={!!errors.name}
                      helperText={errors.name || 'A descriptive name for this booking flow'}
                      required
                      autoComplete="off"
                    />
                    
                    <TextField
                      fullWidth
                      label="Description"
                      value={formData.description}
                      onChange={handleInputChange('description')}
                      multiline
                      rows={3}
                      helperText="Optional description explaining when to use this flow"
                      autoComplete="off"
                    />
                    
                    <FormControl fullWidth>
                      <InputLabel>Event Type</InputLabel>
                      <Select
                        value={formData.event_type}
                        onChange={handleInputChange('event_type')}
                        label="Event Type"
                      >
                        <MenuItem value="">
                          <em>Any Event Type</em>
                        </MenuItem>
                        {eventTypesData.map((eventType) => (
                          <MenuItem key={eventType.id} value={eventType.id.toString()}>
                            {eventType.name}
                          </MenuItem>
                        ))}
                      </Select>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                        Only one active booking flow is allowed per event type. 
                        Choose "Any Event Type" for a universal flow.
                      </Typography>
                    </FormControl>

                    <Box>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.is_active}
                            onChange={handleSwitchChange('is_active')}
                          />
                        }
                        label="Active"
                      />
                      <Typography variant="caption" color="text.secondary" display="block">
                        Only active flows are available for client bookings
                      </Typography>
                    </Box>
                  </Stack>
                </TabPanel>

                {/* Configuration Tab */}
                <TabPanel value={activeTab} index={1}>
                  <Stack spacing={3}>
                    <Typography variant="h6" gutterBottom>
                      Booking Settings
                    </Typography>
                    
                    <Box display="flex" flexDirection="column" gap={2}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.allow_guest_booking}
                            onChange={handleSwitchChange('allow_guest_booking')}
                          />
                        }
                        label="Allow Guest Booking"
                      />
                      <Typography variant="caption" color="text.secondary">
                        Allow clients to book without creating an account
                      </Typography>
                    </Box>

                    <Box display="flex" flexDirection="column" gap={2}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.require_account_creation}
                            onChange={handleSwitchChange('require_account_creation')}
                          />
                        }
                        label="Require Account Creation"
                      />
                      <Typography variant="caption" color="text.secondary">
                        Force clients to create an account during booking
                      </Typography>
                    </Box>

                    <Box display="flex" flexDirection="column" gap={2}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.auto_approve_bookings}
                            onChange={handleSwitchChange('auto_approve_bookings')}
                          />
                        }
                        label="Auto-approve Bookings"
                      />
                      <Typography variant="caption" color="text.secondary">
                        Automatically approve bookings without manual review
                      </Typography>
                    </Box>

                    <Box display="flex" flexDirection="column" gap={2}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.enable_progress_saving}
                            onChange={handleSwitchChange('enable_progress_saving')}
                          />
                        }
                        label="Enable Progress Saving"
                      />
                      <Typography variant="caption" color="text.secondary">
                        Allow clients to save progress and return later
                      </Typography>
                    </Box>

                    <Divider />

                    <Typography variant="h6" gutterBottom>
                      Booking Window
                    </Typography>
                    
                    <Box display="flex" gap={2}>
                      <TextField
                        label="Minimum Advance Days"
                        value={formData.min_advance_booking_days}
                        onChange={handleInputChange('min_advance_booking_days')}
                        error={!!errors.min_advance_booking_days}
                        helperText={errors.min_advance_booking_days || 'Minimum days in advance'}
                        type="number"
                        sx={{ flex: 1 }}
                        autoComplete="off"
                      />
                      
                      <TextField
                        label="Maximum Advance Days"
                        value={formData.max_advance_booking_days}
                        onChange={handleInputChange('max_advance_booking_days')}
                        error={!!errors.max_advance_booking_days}
                        helperText={errors.max_advance_booking_days || 'Maximum days in advance'}
                        type="number"
                        sx={{ flex: 1 }}
                        autoComplete="off"
                      />
                    </Box>

                    <Box display="flex" flexDirection="column" gap={2}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.allow_discounts}
                            onChange={handleSwitchChange('allow_discounts')}
                          />
                        }
                        label="Allow Discounts"
                      />
                      <Typography variant="caption" color="text.secondary">
                        Enable discount codes and promotional offers
                      </Typography>
                    </Box>

                    {/* Discounts multi-select */}
                    {formData.allow_discounts && (
                      <FormControl fullWidth>
                        <InputLabel>Available Discounts</InputLabel>
                        <Select
                          multiple
                          value={formData.available_discounts}
                          onChange={handleMultiSelectChange('available_discounts')}
                          input={<OutlinedInput label="Available Discounts" />}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {(selected as number[]).map((value) => {
                                const discount = discountsData.find(d => d.id === value);
                                return (
                                  <Chip 
                                    key={value} 
                                    label={discount?.name || `Discount ${value}`} 
                                    size="small" 
                                  />
                                );
                              })}
                            </Box>
                          )}
                        >
                          {discountsData.map((discount) => (
                            <MenuItem key={discount.id} value={discount.id}>
                              <Box>
                                <Typography variant="body2">{discount.name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Code: {discount.code || 'No code required'}
                                </Typography>
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  </Stack>
                </TabPanel>

                {/* Payment Configuration Tab */}
                <TabPanel value={activeTab} index={2}>
                  <Stack spacing={3}>
                    <Typography variant="h6" gutterBottom>
                      Payment Gateway Configuration
                    </Typography>
                    
                    <Alert severity="info">
                      Configure payment processing for this booking flow. These settings control which payment methods are available to clients.
                    </Alert>

                    <FormControl fullWidth error={!!errors.allowed_payment_gateways}>
                      <InputLabel>Allowed Payment Gateways</InputLabel>
                      <Select
                        multiple
                        value={formData.allowed_payment_gateways}
                        onChange={handleMultiSelectChange('allowed_payment_gateways')}
                        input={<OutlinedInput label="Allowed Payment Gateways" />}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {(selected as number[]).map((value) => {
                              const gateway = paymentGatewaysData.find(g => g.id === value);
                              return (
                                <Chip 
                                  key={value} 
                                  label={gateway?.name || `Gateway ${value}`} 
                                  size="small" 
                                  color="primary"
                                  variant="outlined"
                                />
                              );
                            })}
                          </Box>
                        )}
                      >
                        {paymentGatewaysData.filter(g => g.is_active).map((gateway) => (
                          <MenuItem key={gateway.id} value={gateway.id}>
                            <Box>
                              <Typography variant="body2">{gateway.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {gateway.code}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.allowed_payment_gateways && (
                        <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                          {errors.allowed_payment_gateways}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                        Leave empty to use all active payment gateways
                      </Typography>
                    </FormControl>

                    <FormControl 
                      fullWidth 
                      error={!!errors.default_payment_gateway}
                      disabled={formData.allowed_payment_gateways.length === 0}
                    >
                      <InputLabel>Default Payment Gateway</InputLabel>
                      <Select
                        value={formData.default_payment_gateway}
                        onChange={handleInputChange('default_payment_gateway')}
                        label="Default Payment Gateway"
                      >
                        <MenuItem value="">
                          <em>No Default</em>
                        </MenuItem>
                        {paymentGatewaysData
                          .filter(g => 
                            g.is_active && 
                            (formData.allowed_payment_gateways.length === 0 || 
                             formData.allowed_payment_gateways.includes(g.id))
                          )
                          .map((gateway) => (
                            <MenuItem key={gateway.id} value={gateway.id.toString()}>
                              {gateway.name}
                            </MenuItem>
                          ))
                        }
                      </Select>
                      {errors.default_payment_gateway && (
                        <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                          {errors.default_payment_gateway}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                        Preferred payment gateway that will be pre-selected for clients
                      </Typography>
                    </FormControl>

                    <Box display="flex" flexDirection="column" gap={2}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.require_immediate_payment}
                            onChange={handleSwitchChange('require_immediate_payment')}
                          />
                        }
                        label="Require Immediate Payment"
                      />
                      <Typography variant="caption" color="text.secondary">
                        Process payment during booking completion instead of generating invoices
                      </Typography>
                    </Box>

                    {formData.require_immediate_payment && (
                      <Alert severity="warning">
                        When immediate payment is required, clients must complete payment to finish the booking process. 
                        Ensure you have at least one payment gateway configured and tested.
                      </Alert>
                    )}
                  </Stack>
                </TabPanel>

                {/* Templates Tab */}
                <TabPanel value={activeTab} index={3}>
                  <Stack spacing={3}>
                    <Alert severity="info">
                      Configure email templates and workflow automation for this booking flow.
                    </Alert>

                    <FormControl fullWidth>
                      <InputLabel>Workflow Template</InputLabel>
                      <Select
                        value={formData.workflow_template}
                        onChange={handleInputChange('workflow_template')}
                        label="Workflow Template"
                      >
                        <MenuItem value="">
                          <em>No Workflow</em>
                        </MenuItem>
                        {workflowTemplatesData.map((template) => (
                          <MenuItem key={template.id} value={template.id.toString()}>
                            {template.name}
                          </MenuItem>
                        ))}
                      </Select>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                        Automatic workflow to assign when booking is completed
                      </Typography>
                    </FormControl>

                    <FormControl fullWidth>
                      <InputLabel>Confirmation Email Template</InputLabel>
                      <Select
                        value={formData.confirmation_email_template}
                        onChange={handleInputChange('confirmation_email_template')}
                        label="Confirmation Email Template"
                      >
                        <MenuItem value="">
                          <em>No Email</em>
                        </MenuItem>
                        {emailTemplatesData.map((template) => (
                          <MenuItem key={template.id} value={template.id.toString()}>
                            {template.name}
                          </MenuItem>
                        ))}
                      </Select>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                        Email sent immediately after booking confirmation
                      </Typography>
                    </FormControl>

                    <FormControl fullWidth>
                      <InputLabel>Reminder Email Template</InputLabel>
                      <Select
                        value={formData.reminder_email_template}
                        onChange={handleInputChange('reminder_email_template')}
                        label="Reminder Email Template"
                      >
                        <MenuItem value="">
                          <em>No Reminders</em>
                        </MenuItem>
                        {emailTemplatesData.map((template) => (
                          <MenuItem key={template.id} value={template.id.toString()}>
                            {template.name}
                          </MenuItem>
                        ))}
                      </Select>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                        Automated reminder emails before the event
                      </Typography>
                    </FormControl>
                  </Stack>
                </TabPanel>

                {/* Advanced Tab */}
                <TabPanel value={activeTab} index={4}>
                  <Stack spacing={3}>
                    <Typography variant="h6" gutterBottom>
                      Completion Settings
                    </Typography>

                    <TextField
                      fullWidth
                      label="Success Message"
                      value={formData.success_message}
                      onChange={handleInputChange('success_message')}
                      multiline
                      rows={3}
                      helperText="Message shown to clients after successful booking"
                      autoComplete="off"
                    />

                    <TextField
                      fullWidth
                      label="Redirect URL"
                      value={formData.redirect_url}
                      onChange={handleInputChange('redirect_url')}
                      helperText="Optional URL to redirect clients after booking completion"
                      autoComplete="off"
                    />

                    <Divider />

                    <Typography variant="h6" gutterBottom>
                      Analytics & Tracking
                    </Typography>

                    <TextField
                      fullWidth
                      label="Conversion Tracking Code"
                      value={formData.conversion_tracking_code}
                      onChange={handleInputChange('conversion_tracking_code')}
                      multiline
                      rows={3}
                      helperText="JavaScript code for tracking conversions (Google Analytics, Facebook Pixel, etc.)"
                      autoComplete="off"
                    />

                    <Alert severity="warning">
                      Advanced settings should only be modified if you understand their impact on the booking process.
                    </Alert>
                  </Stack>
                </TabPanel>
              </Box>
            )}
          </DialogContent>
          
          <DialogActions sx={{ p: 3 }}>
            <Button 
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              ref={submitButtonRef}
              onClick={handleSubmit}
              variant="contained"
              disabled={isLoading || isLoadingDependencies}
              startIcon={isLoading ? <CircularProgress size={20} /> : undefined}
            >
              {isLoading ? 'Saving...' : editingFlow ? 'Update Flow' : 'Create Flow'}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};