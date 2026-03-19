import {
  Dashboard,
  Analytics,
  Assignment,
  Event,
  CalendarMonth,
  People,
  Payment,
  Settings,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import type { SvgIconComponent } from '@mui/icons-material';

export interface HeaderNavItem {
  label: string;
  path: string;
  icon: SvgIconComponent;
}

export const navigationItems: HeaderNavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: Dashboard },
  { label: 'Analytics', path: '/analytics', icon: Analytics },
  { label: 'Tasks', path: '/tasks', icon: Assignment },
  { label: 'Events', path: '/events', icon: Event },
  { label: 'Calendar', path: '/calendar', icon: CalendarMonth },
  { label: 'Clients', path: '/clients', icon: People },
  { label: 'Payments', path: '/payments', icon: Payment },
  { label: 'Metrics', path: '/metrics', icon: SpeedIcon },
  { label: 'Settings', path: '/settings', icon: Settings },
];
