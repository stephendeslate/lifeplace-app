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
        disabled: true, // Coming soon
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
        disabled: true, // Coming soon
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
        disabled: true, // Coming soon
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
    const item = group.items.find(item => item.path === path);
    if (item) {
      return { group, item };
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
      items: group.items.filter(item => !item.roles || item.roles.includes(role as any))
    }))
    .filter(group => group.items.length > 0);
};