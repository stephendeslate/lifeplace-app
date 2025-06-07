// frontend/admin-crm/src/config/settings-navigation.ts

import {
  AccountCircle,
  AdminPanelSettings,
  EventNote,
  Assignment,
  Description,
  Notifications,
  Payment,
  Inventory,
  Email,
  Sms,
  AccountTree,
  TrendingUp,
  Psychology,
} from '@mui/icons-material';
import type { SettingsNavigationGroup } from '../types/settings.types';

export const settingsNavigationConfig: SettingsNavigationGroup[] = [
  {
    id: 'account',
    label: 'Account Management',
    items: [
      {
        id: 'account-settings',
        label: 'Account Settings',
        path: '/settings/account/account-settings',
        icon: AccountCircle,
        description: 'Update your profile and password',
      },
      {
        id: 'admin-users',
        label: 'Admin Users',
        path: '/settings/account/admin-users',
        icon: AdminPanelSettings,
        description: 'Manage administrator accounts',
      },
    ],
  },
  {
    id: 'booking',
    label: 'Booking Configuration',
    items: [
      {
        id: 'booking-flow',
        label: 'Booking Flow',
        path: '/settings/booking/booking-flow',
        icon: EventNote,
        description: 'Configure client booking experience',
      },
      {
        id: 'event-types',
        label: 'Event Types',
        path: '/settings/booking/event-types',
        icon: Assignment,
        description: 'Manage available event types',
      },
    ],
  },
  {
    id: 'templates',
    label: 'Template Management',
    items: [
      {
        id: 'contract-templates',
        label: 'Contract Templates',
        path: '/settings/templates/contract-templates',
        icon: Description,
        description: 'Manage contract templates',
      },
      {
        id: 'questionnaire-templates',
        label: 'Questionnaire Templates',
        path: '/settings/templates/questionnaire-templates',
        icon: Psychology,
        description: 'Manage questionnaire templates',
      },
      {
        id: 'workflow-templates',
        label: 'Workflow Templates',
        path: '/settings/templates/workflow-templates',
        icon: AccountTree,
        description: 'Manage workflow templates',
      },
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    items: [
      {
        id: 'email-templates',
        label: 'Email Templates',
        path: '/settings/communication/email-templates',
        icon: Email,
        description: 'Manage email templates',
      },
      {
        id: 'sms-templates',
        label: 'SMS Templates',
        path: '/settings/communication/sms-templates',
        icon: Sms,
        description: 'Manage SMS templates',
      },
      {
        id: 'notifications',
        label: 'Notifications',
        path: '/settings/communication/notifications',
        icon: Notifications,
        description: 'Configure notification preferences',
      },
    ],
  },
  {
    id: 'commerce',
    label: 'Commerce',
    items: [
      {
        id: 'products-packages',
        label: 'Products & Packages',
        path: '/settings/commerce/products-packages',
        icon: Inventory,
        description: 'Manage products and packages',
      },
      {
        id: 'payments',
        label: 'Payments',
        path: '/settings/commerce/payments',
        icon: Payment,
        description: 'Configure payment gateways',
      },
      {
        id: 'sales',
        label: 'Sales',
        path: '/settings/commerce/sales',
        icon: TrendingUp,
        description: 'Manage sales settings',
      },
    ],
  },
];

// Helper function to get all settings items flattened
export const getAllSettingsItems = () => {
  return settingsNavigationConfig.flatMap(group => group.items);
};

// Helper function to get settings item by path
export const getSettingsItemByPath = (path: string) => {
  return getAllSettingsItems().find(item => item.path === path);
};