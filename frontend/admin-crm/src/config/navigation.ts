// frontend/admin-crm/src/config/navigation.ts

import {
  Dashboard,
  People,
  PersonAdd,
  AdminPanelSettings,
  Business,
  Settings,
  Analytics,
  Notifications,
  Security,
  IntegrationInstructions,
  Support,
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
    id: 'user-management',
    label: 'User Management',
    items: [
      {
        id: 'users',
        label: 'Users',
        path: '/users',
        icon: People,
        roles: ['ADMIN'],
        disabled: true, // Coming soon
      },
      {
        id: 'invitations',
        label: 'Invitations',
        path: '/invitations',
        icon: PersonAdd,
        roles: ['ADMIN'],
        disabled: true, // Coming soon
      },
      {
        id: 'roles',
        label: 'Roles & Permissions',
        path: '/roles',
        icon: AdminPanelSettings,
        roles: ['ADMIN'],
        disabled: true, // Coming soon
      },
    ],
    roles: ['ADMIN'],
  },
  {
    id: 'content-management',
    label: 'Content Management',
    items: [
      {
        id: 'organizations',
        label: 'Organizations',
        path: '/organizations',
        icon: Business,
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
        id: 'settings',
        label: 'Settings',
        path: '/settings',
        icon: Settings,
        roles: ['ADMIN'],
        disabled: true, // Coming soon
      },
      {
        id: 'notifications',
        label: 'Notifications',
        path: '/notifications',
        icon: Notifications,
        roles: ['ADMIN'],
        disabled: true, // Coming soon
      },
      {
        id: 'security',
        label: 'Security',
        path: '/security',
        icon: Security,
        roles: ['ADMIN'],
        disabled: true, // Coming soon
      },
      {
        id: 'integrations',
        label: 'Integrations',
        path: '/integrations',
        icon: IntegrationInstructions,
        roles: ['ADMIN'],
        disabled: true, // Coming soon
      },
      {
        id: 'support',
        label: 'Support',
        path: '/support',
        icon: Support,
        roles: ['ADMIN'],
        disabled: true, // Coming soon
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