// frontend/admin-crm/src/config/navigation.ts

import {
  Dashboard,
  People,
  Settings,
  Analytics,
  EventNote,
  CalendarMonth,
  Payment,
  Description,
  Notifications,
  Assessment,
  Timeline,
  NotificationsActive,
  Explore,
  BarChart,
  TrendingUp,
  AccountCircle,
  AdminPanelSettings,
  Assignment,
  Psychology,
  AccountTree,
  Message,
  Inventory,
} from '@mui/icons-material';
import type { NavigationGroup } from '../types/layout.types';

export const navigationConfig: NavigationGroup[] = [
  {
    id: 'main',
    label: 'Main',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/dashboard',
        icon: Dashboard,
        roles: ['ADMIN'],
      },
      {
        id: 'analytics',
        label: 'Analytics',
        path: '/analytics',
        icon: Analytics,
        roles: ['ADMIN'],
        children: [
          {
            id: 'analytics-overview',
            label: 'Overview',
            path: '/analytics',
            icon: BarChart,
            roles: ['ADMIN'],
          },
          {
            id: 'metrics',
            label: 'Metrics',
            path: '/analytics/metrics',
            icon: TrendingUp,
            roles: ['ADMIN'],
          },
          {
            id: 'dashboards',
            label: 'Dashboards',
            path: '/analytics/dashboards',
            icon: Dashboard,
            roles: ['ADMIN'],
          },
          {
            id: 'reports',
            label: 'Reports',
            path: '/analytics/reports',
            icon: Assessment,
            roles: ['ADMIN'],
          },
          {
            id: 'funnels',
            label: 'Funnels',
            path: '/analytics/funnels',
            icon: Timeline,
            roles: ['ADMIN'],
          },
          {
            id: 'alerts',
            label: 'Alerts',
            path: '/analytics/alerts',
            icon: NotificationsActive,
            roles: ['ADMIN'],
          },
          {
            id: 'events-explorer',
            label: 'Events',
            path: '/analytics/events',
            icon: Explore,
            roles: ['ADMIN'],
          },
          {
            id: 'analytics-settings',
            label: 'Settings',
            path: '/analytics/settings',
            icon: Settings,
            roles: ['ADMIN'],
          },
        ],
      },
     ],
    roles: ['ADMIN'],
  },
  {
    id: 'event-management',
    label: 'Event Management',
    items: [
      {
        id: 'events',
        label: 'Events',
        path: '/events',
        icon: EventNote,
        roles: ['ADMIN'],
      },
      {
        id: 'calendar',
        label: 'Calendar',
        path: '/calendar',
        icon: CalendarMonth,
        roles: ['ADMIN'],
      },
    ],
    roles: ['ADMIN'],
  },
  {
    id: 'client-management',
    label: 'Client Management',
    items: [
      {
        id: 'clients',
        label: 'Clients',
        path: '/clients',
        icon: People,
        roles: ['ADMIN'],
      },
      {
        id: 'payments',
        label: 'Payments',
        path: '/payments',
        icon: Payment,
        roles: ['ADMIN'],
      },
    ],
    roles: ['ADMIN'],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      {
        id: 'messages',
        label: 'Messages',
        path: '/messages',
        icon: Message,
        roles: ['ADMIN'],
      },
      {
        id: 'records',
        label: 'Records',
        path: '/records',
        icon: Description,
        roles: ['ADMIN'],
      },
      {
        id: 'notifications',
        label: 'Notifications',
        path: '/notifications',
        icon: Notifications,
        roles: ['ADMIN'],
      },
      {
        id: 'settings',
        label: 'Settings',
        path: '/settings',
        icon: Settings,
        roles: ['ADMIN'],
        children: [
          {
            id: 'account-settings',
            label: 'Account Settings',
            path: '/settings/account/account-settings',
            icon: AccountCircle,
            roles: ['ADMIN'],
          },
          {
            id: 'admin-users',
            label: 'Admin Users',
            path: '/settings/account/admin-users',
            icon: AdminPanelSettings,
            roles: ['ADMIN'],
          },
          {
            id: 'notifications-settings',
            label: 'Notifications',
            path: '/settings/account/notifications',
            icon: Notifications,
            roles: ['ADMIN'],
          },
          {
            id: 'booking-flows',
            label: 'Booking Flow',
            path: '/settings/booking/booking-flow',
            icon: EventNote,
            roles: ['ADMIN'],
          },
          {
            id: 'event-types',
            label: 'Event Types',
            path: '/settings/booking/event-types',
            icon: Assignment,
            roles: ['ADMIN'],
          },
          {
            id: 'contract-templates',
            label: 'Contract Templates',
            path: '/settings/templates/contract-templates',
            icon: Description,
            roles: ['ADMIN'],
          },
          {
            id: 'questionnaire-templates',
            label: 'Questionnaire Templates',
            path: '/settings/templates/questionnaire-templates',
            icon: Psychology,
            roles: ['ADMIN'],
          },
          {
            id: 'workflow-templates',
            label: 'Workflow Templates',
            path: '/settings/templates/workflow-templates',
            icon: AccountTree,
            roles: ['ADMIN'],
          },
          {
            id: 'communication-templates',
            label: 'Communication Templates',
            path: '/settings/templates/communication-templates',
            icon: Message,
            roles: ['ADMIN'],
          },
          {
            id: 'products-packages',
            label: 'Products & Packages',
            path: '/settings/commerce/products-packages',
            icon: Inventory,
            roles: ['ADMIN'],
          },
          {
            id: 'payment-settings',
            label: 'Payments',
            path: '/settings/commerce/payments',
            icon: Payment,
            roles: ['ADMIN'],
          },
          {
            id: 'sales-settings',
            label: 'Sales',
            path: '/settings/commerce/sales',
            icon: TrendingUp,
            roles: ['ADMIN'],
          },
        ],
      },
    ],
    roles: ['ADMIN'],
  },
];

// Helper function to get navigation item by path
export const getNavigationItemByPath = (path: string) => {
  for (const group of navigationConfig) {
    for (const item of group.items) {
      if (item.path === path) {
        return { group, item };
      }
      
      // Check children
      if (item.children) {
        for (const child of item.children) {
          if (child.path === path) {
            return { group, item: child, parent: item };
          }
        }
      }
    }
  }
  return null;
};

// Helper function to filter navigation by user role
export const filterNavigationByRole = (role: string): NavigationGroup[] => {
  return navigationConfig
    .filter(group => !group.roles || group.roles.includes(role as 'ADMIN' | 'CLIENT'))
    .map(group => ({
      ...group,
      items: group.items
        .filter(item => !item.roles || item.roles.includes(role as 'ADMIN' | 'CLIENT'))
        .map(item => ({
          ...item,
          children: item.children?.filter(child => !child.roles || child.roles.includes(role as 'ADMIN' | 'CLIENT'))
        }))
    }))
    .filter(group => group.items.length > 0);
};