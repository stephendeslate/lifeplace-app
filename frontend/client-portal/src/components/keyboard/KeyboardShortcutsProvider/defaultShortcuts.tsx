// frontend/client-portal/src/components/keyboard/KeyboardShortcutsProvider/defaultShortcuts.tsx

import {
  Search as SearchIcon,
  Home as HomeIcon,
  Help as HelpIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Menu as MenuIcon,
  Add as AddIcon,
  Save as SaveIcon,
  ArrowBack as BackIcon,
  ArrowForward as ForwardIcon,
} from '@mui/icons-material';
import type { KeyboardShortcut } from './types';

export function createDefaultShortcuts(openHelp: () => void): KeyboardShortcut[] {
  return [
    {
      id: 'help',
      category: 'General',
      description: 'Show keyboard shortcuts help',
      keys: ['?'],
      action: openHelp,
      icon: <HelpIcon fontSize="small" />,
      enabled: true,
    },
    {
      id: 'search',
      category: 'General',
      description: 'Open global search',
      keys: ['Meta', 'k'],
      action: () => {
        const searchButton = document.querySelector('[aria-label*="Search"]') as HTMLElement;
        if (searchButton) searchButton.click();
      },
      icon: <SearchIcon fontSize="small" />,
      enabled: true,
    },
    {
      id: 'home',
      category: 'Navigation',
      description: 'Go to dashboard',
      keys: ['g', 'h'],
      action: () => {
        window.location.hash = '/dashboard';
      },
      icon: <HomeIcon fontSize="small" />,
      enabled: true,
    },
    {
      id: 'settings',
      category: 'Navigation',
      description: 'Go to settings',
      keys: ['g', 's'],
      action: () => {
        window.location.hash = '/settings';
      },
      icon: <SettingsIcon fontSize="small" />,
      enabled: true,
    },
    {
      id: 'notifications',
      category: 'General',
      description: 'Open notifications',
      keys: ['n'],
      action: () => {
        const notificationButton = document.querySelector(
          '[aria-label*="notification"]',
        ) as HTMLElement;
        if (notificationButton) notificationButton.click();
      },
      icon: <NotificationsIcon fontSize="small" />,
      enabled: true,
    },
    {
      id: 'menu',
      category: 'General',
      description: 'Toggle sidebar menu',
      keys: ['m'],
      action: () => {
        const menuButton = document.querySelector('[aria-label*="menu"]') as HTMLElement;
        if (menuButton) menuButton.click();
      },
      icon: <MenuIcon fontSize="small" />,
      enabled: true,
    },
    {
      id: 'new',
      category: 'Actions',
      description: 'Create new item',
      keys: ['c'],
      action: () => {
        const newButton = document.querySelector(
          '[aria-label*="new"], [aria-label*="create"], [aria-label*="add"]',
        ) as HTMLElement;
        if (newButton) newButton.click();
      },
      icon: <AddIcon fontSize="small" />,
      enabled: true,
    },
    {
      id: 'save',
      category: 'Actions',
      description: 'Save current form',
      keys: ['Meta', 's'],
      action: () => {
        const saveButton = document.querySelector(
          '[type="submit"], [aria-label*="save"]',
        ) as HTMLElement;
        if (saveButton) {
          saveButton.click();
        }
      },
      icon: <SaveIcon fontSize="small" />,
      enabled: true,
    },
    {
      id: 'back',
      category: 'Navigation',
      description: 'Go back',
      keys: ['Escape'],
      action: () => {
        const backButton = document.querySelector('[aria-label*="back"]') as HTMLElement;
        if (backButton) {
          backButton.click();
        } else {
          window.history.back();
        }
      },
      icon: <BackIcon fontSize="small" />,
      enabled: true,
    },
    {
      id: 'next',
      category: 'Navigation',
      description: 'Go forward/next',
      keys: ['Meta', 'ArrowRight'],
      action: () => {
        const nextButton = document.querySelector(
          '[aria-label*="next"], [aria-label*="forward"]',
        ) as HTMLElement;
        if (nextButton) nextButton.click();
      },
      icon: <ForwardIcon fontSize="small" />,
      enabled: true,
    },
  ];
}
