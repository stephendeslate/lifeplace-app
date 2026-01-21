// Booking Flows Settings Page - Standardized Version
// Migrated to use the unified settings system

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RouteSharp as BookingFlowIcon } from '@mui/icons-material';
import { PermissionAwareSettingsPage, type SettingsPageConfig, type SettingsTableColumn } from '../../../components/common/settings';
import { useBookingFlows } from '../../../hooks/useBookingFlows';
import { useEventTypes } from '../../../hooks/useEvents';
import type { BookingFlow, CreateBookingFlowData, UpdateBookingFlowData } from '../../../types/bookingflows.types';
import type { ModernFormSection } from '../../../components/common/ModernForm';

// Table columns configuration
const columns: SettingsTableColumn<BookingFlow>[] = [
  {
    key: 'name',
    label: 'Flow Name',
    sortable: true,
    searchable: true,
  },
  {
    key: 'event_type_name',
    label: 'Event Type',
    render: (value) => {
      const eventTypeName = value as BookingFlow['event_type_name'];
      return eventTypeName || 'Any Event Type';
    },
  },
  {
    key: 'total_steps',
    label: 'Steps',
    align: 'center',
    render: (value) => String(value || 0),
  },
  {
    key: 'enabled_steps_count',
    label: 'Enabled Steps',
    align: 'center',
    render: (value) => String(value || 0),
  },
  {
    key: 'is_active',
    label: 'Status',
    align: 'center',
    render: (value) => value ? 'Active' : 'Inactive',
  },
  {
    key: 'updated_at',
    label: 'Last Modified',
    sortable: true,
    render: (value) => value ? new Date(String(value)).toLocaleDateString() : '-',
  },
];

// Create form sections dynamically with event types
const createFormSections = (eventTypes: Array<{ id: number; name: string }>): ModernFormSection[] => [
  {
    title: 'Basic Information',
    fields: [
      {
        name: 'name',
        label: 'Flow Name',
        type: 'text',
        required: true,
        placeholder: 'e.g., Wedding Booking Flow',
        helperText: 'A descriptive name for this booking flow',
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        multiline: true,
        rows: 3,
        placeholder: 'Describe the purpose of this booking flow...',
        helperText: 'Optional description for internal reference',
      },
      {
        name: 'event_type',
        label: 'Event Type',
        type: 'select',
        helperText: 'Leave empty to use for any event type',
        options: [
          { value: '', label: 'Any Event Type' },
          ...eventTypes.map(et => ({ value: et.id, label: et.name })),
        ],
      },
    ],
  },
  {
    title: 'Flow Settings',
    fields: [
      {
        name: 'allow_guest_booking',
        label: 'Allow Guest Booking',
        type: 'switch',
        helperText: 'Allow bookings without requiring account creation',
      },
      {
        name: 'require_account_creation',
        label: 'Require Account Creation',
        type: 'switch',
        helperText: 'Require users to create an account during booking',
      },
      {
        name: 'auto_approve_bookings',
        label: 'Auto Approve Bookings',
        type: 'switch',
        helperText: 'Automatically approve bookings without manual review',
      },
      {
        name: 'enable_progress_saving',
        label: 'Enable Progress Saving',
        type: 'switch',
        helperText: 'Allow users to save their progress and return later',
      },
    ],
  },
  {
    title: 'Status',
    fields: [
      {
        name: 'is_active',
        label: 'Active',
        type: 'switch',
        helperText: 'Active flows are available for client bookings',
      },
    ],
  },
];

// Default values for new booking flows
const defaultBookingFlow: BookingFlow = {
  id: 0,
  name: '',
  description: '',
  event_type: null,
  event_type_name: '',
  workflow_template: null,
  confirmation_email_template: null,
  reminder_email_template: null,
  is_active: true,
  allow_guest_booking: false,
  require_account_creation: false,
  auto_approve_bookings: false,
  enable_progress_saving: true,
  max_advance_booking_days: 365,
  min_advance_booking_days: 1,
  allow_discounts: false,
  available_discounts: [],
  allowed_payment_gateways: [],
  default_payment_gateway: null,
  require_immediate_payment: false,
  redirect_url: '',
  success_message: '',
  is_test_mode: false,
  conversion_tracking_code: '',
  total_steps: 0,
  enabled_steps_count: 0,
  created_at: '',
  updated_at: '',
};

export const BookingFlows = () => {
  const navigate = useNavigate();
  
  // Get booking flows
  const {
    bookingFlows = [],
    isLoadingFlows,
    flowsError,
    createFlow,
    updateFlow,
    deleteFlow,
    refetchFlows,
    isCreatingFlow,
    isUpdatingFlow,
    isDeletingFlow,
  } = useBookingFlows();

  // Get event types for the form dropdown
  const { eventTypes = [] } = useEventTypes();

  // Settings page configuration
  const config: SettingsPageConfig<BookingFlow> = {
    page: {
      title: 'Booking Flows',
      subtitle: 'Manage multi-step booking flows for different event types',
      icon: React.createElement(BookingFlowIcon),
      breadcrumbs: [
        { label: 'Settings', href: '/settings' },
        { label: 'Booking', href: '/settings/booking' },
        { label: 'Booking Flows' },
      ],
    },

    table: {
      columns,
      searchFields: ['name', 'description'],
      defaultSort: { key: 'name', order: 'asc' },
      emptyState: {
        icon: React.createElement(BookingFlowIcon),
        title: 'No Booking Flows Found',
        description: 'Create your first booking flow to customize the client booking experience.',
      },
    },

    form: {
      title: 'Booking Flow',
      subtitle: 'Configure booking flow settings. Steps can be managed after creation.',
      sections: createFormSections(eventTypes),
      maxWidth: 'lg',
    },

    features: {
      create: true,
      edit: true,
      delete: true,
      duplicate: true,
      search: true,
      refresh: true,
    },
  };

  // Action handlers
  const handleRefresh = () => refetchFlows();

  const handleCreate = async (data: BookingFlow) => {
    const createData: CreateBookingFlowData = {
      name: data.name,
      description: data.description,
      event_type: data.event_type,
      is_active: data.is_active,
      allow_guest_booking: data.allow_guest_booking,
      require_account_creation: data.require_account_creation,
      auto_approve_bookings: data.auto_approve_bookings,
      enable_progress_saving: data.enable_progress_saving,
    };

    return new Promise<void>((resolve, reject) => {
      createFlow(createData, {
        onSuccess: () => resolve(),
        onError: reject,
      });
    });
  };

  const handleUpdate = async (id: string | number, data: BookingFlow) => {
    const updateData: UpdateBookingFlowData = {
      name: data.name,
      description: data.description,
      event_type: data.event_type,
      is_active: data.is_active,
      allow_guest_booking: data.allow_guest_booking,
      require_account_creation: data.require_account_creation,
      auto_approve_bookings: data.auto_approve_bookings,
      enable_progress_saving: data.enable_progress_saving,
    };

    return new Promise<void>((resolve, reject) => {
      updateFlow({
        id: Number(id),
        data: updateData
      }, {
        onSuccess: () => resolve(),
        onError: reject,
      });
    });
  };

  const handleDelete = async (id: string | number) => {
    return new Promise<void>((resolve, reject) => {
      deleteFlow(Number(id), {
        onSuccess: () => resolve(),
        onError: reject,
      });
    });
  };

  // Handle row click to navigate to booking flow details
  const handleRowClick = (bookingFlow: BookingFlow) => {
    navigate(`/settings/booking/booking-flow/${bookingFlow.id}`);
  };

  // Custom table actions for quick navigation
  const customTableActions = [
    {
      label: 'Manage Steps',
      icon: React.createElement(BookingFlowIcon),
      onClick: (bookingFlow: BookingFlow) => {
        navigate(`/settings/booking/booking-flow/${bookingFlow.id}`, { state: { activeTab: 1 } });
      },
      color: 'primary' as const,
    },
    {
      label: 'Configure',
      icon: React.createElement(BookingFlowIcon),
      onClick: (bookingFlow: BookingFlow) => {
        navigate(`/settings/booking/booking-flow/${bookingFlow.id}`);
      },
      color: 'default' as const,
    },
  ];

  // Fetch fresh booking flow data before editing to ensure we have the latest values
  const handleFetchItem = async (id: string | number): Promise<BookingFlow> => {
    const { bookingFlowsApi } = await import('../../../apis/bookingflows.api');
    // getBookingFlow returns BookingFlowDetail which extends BookingFlow
    return bookingFlowsApi.getBookingFlow(Number(id));
  };

  return (
    <PermissionAwareSettingsPage
      config={config}
      requiredPermissions={['can_manage_booking_flows']}
      data={bookingFlows}
      defaultValues={defaultBookingFlow}
      isLoading={isLoadingFlows}
      error={flowsError?.message}
      onRefresh={handleRefresh}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      onFetchItem={handleFetchItem}
      isCreating={isCreatingFlow}
      isUpdating={isUpdatingFlow}
      isDeleting={isDeletingFlow}
      onRowClick={handleRowClick}
      customTableActions={customTableActions}
    />
  );
};

export default BookingFlows;