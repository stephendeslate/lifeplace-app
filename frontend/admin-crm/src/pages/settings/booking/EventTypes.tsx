// Event Types Settings Page - Standardized Version
// Migrated to use the unified settings system

import React from 'react';
import { Description as EventTypeIcon } from '@mui/icons-material';
import { PermissionAwareSettingsPage, type SettingsPageConfig, type SettingsTableColumn } from '../../../components/common/settings';
import { useEventTypes } from '../../../hooks/useEvents';
import type { CreateEventTypeData, UpdateEventTypeData } from '../../../types/events.types';
import type { ModernFormSection } from '../../../components/common/ModernForm';

// Event Type interface (from the API)
interface EventType {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Table columns configuration
const columns: SettingsTableColumn<EventType>[] = [
  {
    key: 'name',
    label: 'Event Type',
    sortable: true,
    searchable: true,
  },
  {
    key: 'description',
    label: 'Description',
    searchable: true,
    render: (value) => String(value) || '-',
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

// Form sections configuration
const formSections: ModernFormSection[] = [
  {
    title: 'Basic Information',
    fields: [
      {
        name: 'name',
        label: 'Event Type Name',
        type: 'text',
        required: true,
        placeholder: 'e.g., Wedding, Corporate Event, Birthday Party',
        helperText: 'A descriptive name for this type of event',
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        multiline: true,
        rows: 3,
        placeholder: 'Describe this event type and when it would be used...',
        helperText: 'Optional description to help staff understand when to use this event type',
      },
    ],
  },
  {
    title: 'Settings',
    fields: [
      {
        name: 'is_active',
        label: 'Active',
        type: 'switch',
        helperText: 'Active event types are available for selection when creating new events',
      },
    ],
  },
];

// Default values for new event types
const defaultEventType: EventType = {
  id: 0,
  name: '',
  description: '',
  is_active: true,
};

// Settings page configuration
const config: SettingsPageConfig<EventType> = {
  page: {
    title: 'Event Types',
    subtitle: 'Manage the types of events your business offers',
    icon: React.createElement(EventTypeIcon),
    breadcrumbs: [
      { label: 'Settings', href: '/settings' },
      { label: 'Booking', href: '/settings/booking' },
      { label: 'Event Types' },
    ],
  },

  table: {
    columns,
    searchFields: ['name', 'description'],
    defaultSort: { key: 'name', order: 'asc' },
    emptyState: {
      icon: React.createElement(EventTypeIcon),
      title: 'No Event Types Found',
      description: 'Create your first event type to start organizing your events.',
    },
  },

  form: {
    title: 'Event Type',
    subtitle: 'Configure the event type settings and availability.',
    sections: formSections,
    maxWidth: 'md',
  },

  features: {
    create: true,
    edit: true,
    delete: true,
    duplicate: false,
    search: true,
    refresh: true,
  },
};

export const EventTypes = () => {
  // Get the event types hook
  const eventTypesHook = useEventTypes();
  
  // Extract data from the hook
  const {
    eventTypes = [],
    isLoadingEventTypes,
    eventTypesError,
    createEventType,
    updateEventType,
    deleteEventType,
    refetchEventTypes,
    isCreatingEventType,
    isUpdatingEventType,
    isDeletingEventType,
  } = eventTypesHook;

  // Action handlers
  const handleRefresh = () => refetchEventTypes();

  const handleCreate = async (data: EventType) => {
    const createData: CreateEventTypeData = {
      name: data.name,
      description: data.description,
      is_active: data.is_active,
    };

    return new Promise<void>((resolve, reject) => {
      createEventType(createData, {
        onSuccess: () => resolve(),
        onError: reject,
      });
    });
  };

  const handleUpdate = async (id: string | number, data: EventType) => {
    const updateData: UpdateEventTypeData = {
      name: data.name,
      description: data.description,
      is_active: data.is_active,
    };

    return new Promise<void>((resolve, reject) => {
      updateEventType({
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
      deleteEventType(Number(id), {
        onSuccess: () => resolve(),
        onError: reject,
      });
    });
  };

  // Fetch fresh event type data before editing to ensure we have the latest values
  const handleFetchItem = async (id: string | number): Promise<EventType> => {
    const { eventsApi } = await import('../../../apis/events.api');
    return eventsApi.getEventType(Number(id));
  };

  return (
    <PermissionAwareSettingsPage
      config={config}
      requiredPermissions={['can_manage_booking_flows']}
      data={eventTypes}
      defaultValues={defaultEventType}
      isLoading={isLoadingEventTypes}
      error={eventTypesError?.message}
      onRefresh={handleRefresh}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      onFetchItem={handleFetchItem}
      isCreating={isCreatingEventType}
      isUpdating={isUpdatingEventType}
      isDeleting={isDeletingEventType}
    />
  );
};

export default EventTypes;