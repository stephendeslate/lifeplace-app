// Notification Types — constants, column definitions, and page config

import React from 'react';
import { Notifications as NotificationTypeIcon } from '@mui/icons-material';
import { Chip, Typography } from '@mui/material';
import type { SettingsPageConfig, SettingsTableColumn } from '@/components/common/settings';
import type {
  NotificationType,
  NotificationCategory,
  NotificationPriority,
} from '@/types/notifications.types';
import { NOTIFICATION_CATEGORIES } from '@/types/notifications.types';

export const priorityColorMap: Record<
  NotificationPriority,
  'default' | 'info' | 'warning' | 'error'
> = {
  LOW: 'default',
  NORMAL: 'info',
  HIGH: 'warning',
  URGENT: 'error',
};

export const categoryColorMap: Record<NotificationCategory, string> = {
  SYSTEM: '#9e9e9e',
  EVENT: '#2196f3',
  TASK: '#ff9800',
  PAYMENT: '#4caf50',
  CLIENT: '#9c27b0',
  CONTRACT: '#795548',
  WORKFLOW: '#00bcd4',
  COMMUNICATION: '#3f51b5',
  MARKETING: '#e91e63',
};

// Table columns
export const columns: SettingsTableColumn<NotificationType>[] = [
  {
    key: 'name',
    label: 'Name',
    sortable: true,
    searchable: true,
  },
  {
    key: 'code',
    label: 'Code',
    sortable: true,
    searchable: true,
    render: (value) =>
      React.createElement(
        Typography,
        { variant: 'body2', sx: { fontFamily: 'monospace', fontSize: '0.8rem' } },
        String(value),
      ),
  },
  {
    key: 'category',
    label: 'Category',
    align: 'center',
    render: (value) => {
      const cat = String(value) as NotificationCategory;
      const label = NOTIFICATION_CATEGORIES.find((c) => c.value === cat)?.label || cat;
      return React.createElement(Chip, {
        label,
        size: 'small',
        sx: {
          bgcolor: `${categoryColorMap[cat]}20`,
          color: categoryColorMap[cat],
          fontWeight: 500,
        },
      });
    },
  },
  {
    key: 'priority',
    label: 'Priority',
    align: 'center',
    render: (value) => {
      const p = String(value) as NotificationPriority;
      return React.createElement(Chip, {
        label: p,
        size: 'small',
        color: priorityColorMap[p],
      });
    },
  },
  {
    key: 'is_active',
    label: 'Active',
    align: 'center',
    render: (value) =>
      React.createElement(Chip, {
        label: value ? 'Active' : 'Inactive',
        size: 'small',
        color: value ? 'success' : 'default',
        variant: value ? 'filled' : 'outlined',
      }),
  },
  {
    key: 'is_system',
    label: 'System',
    align: 'center',
    render: (value) =>
      value
        ? React.createElement(Chip, {
            label: 'System',
            size: 'small',
            variant: 'outlined',
            color: 'warning',
          })
        : React.createElement(Typography, { variant: 'body2', color: 'text.secondary' }, 'Custom'),
  },
];

// Default values for new notification type
export const defaultNotificationType: NotificationType = {
  id: 0,
  code: '',
  name: '',
  description: '',
  category: 'SYSTEM',
  icon: 'notifications',
  color: '#2196f3',
  priority: 'NORMAL',
  default_title_template: '',
  default_content_template: '',
  default_email_template: '',
  default_sms_template: '',
  is_active: true,
  is_system: false,
  supports_email: true,
  supports_sms: false,
  supports_push: true,
  auto_read_after_days: null,
  created_at: '',
  updated_at: '',
};

// Page config
export const config: SettingsPageConfig<NotificationType> = {
  page: {
    title: 'Notification Types',
    subtitle: 'Manage notification types, templates, and delivery channel settings',
    icon: React.createElement(NotificationTypeIcon),
    breadcrumbs: [
      { label: 'Settings', href: '/settings' },
      { label: 'Templates', href: '/settings/templates' },
      { label: 'Notification Types' },
    ],
  },
  table: {
    columns,
    searchFields: ['name', 'code'],
    filters: [
      {
        key: 'category',
        label: 'Category',
        options: NOTIFICATION_CATEGORIES.map((c) => ({
          value: c.value,
          label: c.label,
        })),
      },
    ],
    defaultSort: { key: 'name', order: 'asc' },
    emptyState: {
      icon: React.createElement(NotificationTypeIcon),
      title: 'No Notification Types Found',
      description:
        'Notification types are auto-seeded on first deployment. If none appear, check backend setup.',
    },
  },
  form: {
    title: 'Notification Type',
    subtitle: 'Configure notification type properties and message templates.',
    sections: [],
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
