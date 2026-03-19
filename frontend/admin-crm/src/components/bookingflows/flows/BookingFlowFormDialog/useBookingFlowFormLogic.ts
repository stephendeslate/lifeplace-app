// frontend/admin-crm/src/components/bookingflows/flows/BookingFlowFormDialog/useBookingFlowFormLogic.ts

import { useState, useEffect, useRef } from 'react';
import type { SelectChangeEvent } from '@mui/material/Select';
import type {
  BookingFlowFormDialogProps,
  BookingFlowFormData,
  CreateBookingFlowData,
  UpdateBookingFlowData,
} from '@/types/bookingflows';
import { useEventTypes } from '@/hooks/useEvents';
import { useWorkflowTemplates } from '@/hooks/useWorkflows';
import { useCommunications } from '@/hooks/useCommunications';
import { useDiscounts } from '@/hooks/useProducts';
import { usePaymentGateways } from '@/hooks/usePayments';

// Enhanced form data interface to match evolved backend
export interface EnhancedBookingFlowFormData extends BookingFlowFormData {
  // Payment gateway fields from evolved backend
  allowed_payment_gateways: number[];
  default_payment_gateway: string; // String for form handling
  require_immediate_payment: boolean;
}

export const defaultFormData: EnhancedBookingFlowFormData = {
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

export function useBookingFlowFormLogic({
  open,
  onClose,
  editingFlow,
  onSubmit,
  isLoading,
}: BookingFlowFormDialogProps) {
  const [formData, setFormData] = useState<EnhancedBookingFlowFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState(0);

  // Ref for the first input field to focus when dialog opens
  const firstInputRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  // Load dependencies using existing hooks
  const { eventTypes: eventTypesData = [], isLoadingEventTypes } = useEventTypes({
    is_active: true,
  });

  const { templates: workflowTemplatesData = [], isLoadingTemplates: isLoadingWorkflows } =
    useWorkflowTemplates({ is_active: true });

  // Get email templates - filtering communication templates by EMAIL channel
  const { useTemplates } = useCommunications();

  const { data: emailTemplatesData = [], isLoading: isLoadingEmailTemplates } = useTemplates({
    channel: 'EMAIL',
    category: 'SYSTEM',
  });

  const { discounts: discountsData = [], isLoadingDiscounts } = useDiscounts({
    is_active: true,
  });

  const { data: paymentGatewaysData = [], isLoading: isLoadingPaymentGateways } =
    usePaymentGateways();

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

  const handleInputChange =
    (field: keyof EnhancedBookingFlowFormData) =>
    (
      event:
        | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
        | SelectChangeEvent<string | number[]>
        | { target: { value: unknown } },
    ) => {
      const value = event.target.value;
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: '',
        }));
      }
    };

  const handleSwitchChange =
    (field: keyof EnhancedBookingFlowFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.checked,
      }));
    };

  // Handler for multi-select fields like payment gateways and discounts
  const handleMultiSelectChange =
    (field: keyof EnhancedBookingFlowFormData) => (event: SelectChangeEvent<number[]>) => {
      const value = event.target.value as number[];
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Clear error when user makes selection
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: '',
        }));
      }
    };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
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
      newErrors.allowed_payment_gateways =
        'At least one payment gateway is required when immediate payment is enabled';
    }

    if (
      formData.default_payment_gateway &&
      !formData.allowed_payment_gateways.includes(parseInt(formData.default_payment_gateway))
    ) {
      newErrors.default_payment_gateway =
        'Default payment gateway must be in the allowed gateways list';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleClose = () => {
    if (!isLoading) {
      // Clear focus from any focused elements within the dialog before closing
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && activeElement.blur && activeElement !== document.body) {
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
      event_type:
        formData.event_type === '' || formData.event_type === 'null'
          ? null
          : parseInt(formData.event_type) || null,
      workflow_template: formData.workflow_template ? parseInt(formData.workflow_template) : null,
      confirmation_email_template: formData.confirmation_email_template
        ? parseInt(formData.confirmation_email_template)
        : null,
      reminder_email_template: formData.reminder_email_template
        ? parseInt(formData.reminder_email_template)
        : null,
      is_active: formData.is_active,
      allow_guest_booking: formData.allow_guest_booking,
      require_account_creation: formData.require_account_creation,
      auto_approve_bookings: formData.auto_approve_bookings,
      enable_progress_saving: formData.enable_progress_saving,
      max_advance_booking_days: parseInt(formData.max_advance_booking_days) || 365,
      min_advance_booking_days: parseInt(formData.min_advance_booking_days) || 1,
      allow_discounts: formData.allow_discounts,
      available_discounts: formData.available_discounts,
      allowed_payment_gateways: formData.allowed_payment_gateways,
      default_payment_gateway: formData.default_payment_gateway
        ? parseInt(formData.default_payment_gateway)
        : null,
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

  return {
    formData,
    errors,
    activeTab,
    firstInputRef,
    submitButtonRef,
    isLoadingDependencies,
    eventTypesData,
    workflowTemplatesData,
    emailTemplatesData,
    discountsData,
    paymentGatewaysData,
    handleInputChange,
    handleSwitchChange,
    handleMultiSelectChange,
    handleTabChange,
    handleClose,
    handleSubmit,
    handleKeyDown,
  };
}
