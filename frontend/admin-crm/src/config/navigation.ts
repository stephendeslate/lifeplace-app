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
    .filter(group => !group.roles || group.roles.includes(role as any))
    .map(group => ({
      ...group,
      items: group.items
        .filter(item => !item.roles || item.roles.includes(role as any))
        .map(item => ({
          ...item,
          children: item.children?.filter(child => !child.roles || child.roles.includes(role as any))
        }))
    }))
    .filter(group => group.items.length > 0);
};