// frontend/admin-crm/src/config/walkthrough-tours.ts

import {
  Dashboard,
  Event,
  People,
  Payment,
  Settings,
  Analytics,
} from '@mui/icons-material';
import type { Tour, TourId } from '../types/walkthrough.types';

/**
 * Registry of all available tours
 * Tours are defined with steps targeting elements via data-tour attributes
 */
export const tourRegistry = new Map<TourId, Tour>();

// Welcome Tour - First-time user onboarding
tourRegistry.set('welcome', {
  id: 'welcome',
  name: 'Welcome to LifePlace',
  description: 'Get started with the basics of managing your events and clients.',
  icon: Dashboard,
  autoTrigger: true,
  category: 'onboarding',
  requiredPath: '/dashboard',
  steps: [
    {
      id: 'welcome-brand',
      title: 'Welcome to LifePlace Admin!',
      content:
        'This quick tour will show you around the main features of your event management dashboard. You can restart this tour anytime from the user menu.',
      target: '[data-tour="brand-logo"]',
      placement: 'bottom',
      spotlightPadding: 12,
      spotlightBorderRadius: 8,
    },
    {
      id: 'welcome-navigation',
      title: 'Main Navigation',
      content:
        'Use these navigation items to access different areas of the application. Dashboard gives you an overview, while other sections let you manage events, clients, and more.',
      target: '[data-tour="main-navigation"]',
      placement: 'bottom',
      spotlightPadding: 8,
    },
    {
      id: 'welcome-notifications',
      title: 'Stay Updated',
      content:
        'The notification bell shows you important updates about events, payments, and tasks that need your attention. Click it to see your recent notifications.',
      target: '[data-tour="notification-badge"]',
      placement: 'bottom-end',
      spotlightPadding: 8,
    },
    {
      id: 'welcome-user-menu',
      title: 'Your Account',
      content:
        'Access your account settings, switch themes, and take tours again anytime from here. Click your avatar to see available options.',
      target: '[data-tour="user-menu"]',
      placement: 'bottom-end',
      spotlightPadding: 8,
    },
    {
      id: 'welcome-quick-actions',
      title: 'Quick Actions',
      content:
        'These shortcuts help you quickly create new events, add clients, and access commonly used features. Start here to get things done fast!',
      target: '[data-tour="quick-actions"]',
      placement: 'top',
      spotlightPadding: 12,
      waitForElement: true,
    },
  ],
});

// Dashboard Tour
tourRegistry.set('dashboard', {
  id: 'dashboard',
  name: 'Dashboard Overview',
  description: 'Learn how to use the dashboard to monitor your business.',
  icon: Dashboard,
  requiredPath: '/dashboard',
  category: 'feature',
  steps: [
    {
      id: 'dashboard-stats',
      title: 'Key Metrics',
      content:
        'These cards show your most important business metrics at a glance - revenue, active clients, upcoming events, and conversion rates.',
      target: '[data-tour="dashboard-stats"]',
      placement: 'bottom',
      spotlightPadding: 12,
    },
    {
      id: 'dashboard-quick-actions',
      title: 'Quick Actions',
      content:
        'Use these buttons to quickly create events, add clients, view analytics, or manage payments without navigating through menus.',
      target: '[data-tour="quick-actions"]',
      placement: 'top',
      spotlightPadding: 12,
    },
    {
      id: 'dashboard-tasks',
      title: 'Tasks Summary',
      content:
        'Your pending tasks appear here. Stay on top of follow-ups, event preparations, and important deadlines.',
      target: '[data-tour="dashboard-tasks"]',
      placement: 'left',
      spotlightPadding: 8,
      waitForElement: true,
    },
    {
      id: 'dashboard-activity',
      title: 'Recent Activity',
      content:
        'See what\'s happening in your business - new bookings, payments, client updates, and system notifications.',
      target: '[data-tour="dashboard-activity"]',
      placement: 'left',
      spotlightPadding: 8,
      waitForElement: true,
    },
  ],
});

// Events Tour
tourRegistry.set('events', {
  id: 'events',
  name: 'Managing Events',
  description: 'Learn how to create and manage your events effectively.',
  icon: Event,
  requiredPath: '/events',
  category: 'feature',
  steps: [
    {
      id: 'events-create',
      title: 'Create New Event',
      content:
        'Click here to create a new event. You\'ll be guided through setting up all the details including date, client, venue, and pricing.',
      target: '[data-tour="events-create-button"]',
      placement: 'left',
      spotlightPadding: 8,
      waitForElement: true,
    },
    {
      id: 'events-filters',
      title: 'Filter & Search',
      content:
        'Use these controls to filter events by status, date range, or search for specific events by name or client.',
      target: '[data-tour="events-filters"]',
      placement: 'bottom',
      spotlightPadding: 8,
      waitForElement: true,
    },
    {
      id: 'events-list',
      title: 'Event List',
      content:
        'View all your events here. Click any row to see event details, or use the action menu for quick options like editing or sending contracts.',
      target: '[data-tour="events-list"]',
      placement: 'top',
      spotlightPadding: 8,
      waitForElement: true,
    },
  ],
});

// Clients Tour
tourRegistry.set('clients', {
  id: 'clients',
  name: 'Client Management',
  description: 'Learn how to manage your client database.',
  icon: People,
  requiredPath: '/clients',
  category: 'feature',
  steps: [
    {
      id: 'clients-add',
      title: 'Add New Client',
      content:
        'Click here to add a new client to your database. You can also import multiple clients from a CSV file.',
      target: '[data-tour="clients-add-button"]',
      placement: 'left',
      spotlightPadding: 8,
      waitForElement: true,
    },
    {
      id: 'clients-search',
      title: 'Find Clients',
      content:
        'Search for clients by name, email, or phone number. Use filters to narrow down your client list.',
      target: '[data-tour="clients-search"]',
      placement: 'bottom',
      spotlightPadding: 8,
      waitForElement: true,
    },
    {
      id: 'clients-list',
      title: 'Client List',
      content:
        'View and manage all your clients here. Click any client to see their full profile, event history, and communication records.',
      target: '[data-tour="clients-list"]',
      placement: 'top',
      spotlightPadding: 8,
      waitForElement: true,
    },
  ],
});

// Payments Tour
tourRegistry.set('payments', {
  id: 'payments',
  name: 'Payment Tracking',
  description: 'Learn how to track and manage payments.',
  icon: Payment,
  requiredPath: '/payments',
  category: 'feature',
  steps: [
    {
      id: 'payments-new',
      title: 'Record Payment',
      content:
        'Click here to manually record a payment. You can also set up automatic payment tracking with our payment integrations.',
      target: '[data-tour="payments-new-button"]',
      placement: 'left',
      spotlightPadding: 8,
      waitForElement: true,
    },
    {
      id: 'payments-filters',
      title: 'Filter Payments',
      content:
        'Filter payments by status, date range, or search by client name or payment ID to quickly find what you need.',
      target: '[data-tour="payments-filters"]',
      placement: 'bottom',
      spotlightPadding: 8,
      waitForElement: true,
    },
    {
      id: 'payments-list',
      title: 'Payment History',
      content:
        'View all payment transactions here. Track pending payments, view completed transactions, and manage refunds.',
      target: '[data-tour="payments-list"]',
      placement: 'top',
      spotlightPadding: 8,
      waitForElement: true,
    },
  ],
});

// Settings Tour
tourRegistry.set('settings', {
  id: 'settings',
  name: 'Application Settings',
  description: 'Configure your LifePlace experience.',
  icon: Settings,
  requiredPath: '/settings',
  category: 'advanced',
  steps: [
    {
      id: 'settings-overview',
      title: 'Settings Overview',
      content:
        'Welcome to Settings! Here you can configure your account, booking flows, templates, payment methods, and more.',
      target: '[data-tour="settings-header"]',
      placement: 'bottom',
      spotlightPadding: 12,
      waitForElement: true,
    },
    {
      id: 'settings-account',
      title: 'Account Settings',
      content:
        'Manage your profile, change password, configure notification preferences, and update company branding.',
      target: '[data-tour="settings-account"]',
      placement: 'right',
      spotlightPadding: 8,
      waitForElement: true,
    },
    {
      id: 'settings-booking',
      title: 'Booking Configuration',
      content:
        'Customize your client booking experience - add steps, configure event types, and set up your booking flow.',
      target: '[data-tour="settings-booking"]',
      placement: 'right',
      spotlightPadding: 8,
      waitForElement: true,
    },
  ],
});

// Analytics Tour
tourRegistry.set('analytics', {
  id: 'analytics',
  name: 'Analytics Dashboard',
  description: 'Understand your business performance metrics.',
  icon: Analytics,
  requiredPath: '/analytics',
  category: 'feature',
  steps: [
    {
      id: 'analytics-overview',
      title: 'Analytics Overview',
      content:
        'Track your business performance with detailed analytics. View trends, compare periods, and identify growth opportunities.',
      target: '[data-tour="analytics-header"]',
      placement: 'bottom',
      spotlightPadding: 12,
      waitForElement: true,
    },
    {
      id: 'analytics-date-filter',
      title: 'Date Range',
      content:
        'Select a date range to focus your analytics. Compare performance across different time periods.',
      target: '[data-tour="analytics-date-filter"]',
      placement: 'bottom',
      spotlightPadding: 8,
      waitForElement: true,
    },
    {
      id: 'analytics-tabs',
      title: 'Report Categories',
      content:
        'Explore different report categories - sales, events, customers, and operations. Each tab provides specialized insights.',
      target: '[data-tour="analytics-tabs"]',
      placement: 'top',
      spotlightPadding: 8,
      waitForElement: true,
    },
  ],
});

/**
 * Get all tours as an array
 */
export const getAllTours = (): Tour[] => {
  return Array.from(tourRegistry.values());
};

/**
 * Get tours by category
 */
export const getToursByCategory = (category: Tour['category']): Tour[] => {
  return getAllTours().filter(tour => tour.category === category);
};

/**
 * Get a specific tour by ID
 */
export const getTour = (tourId: TourId): Tour | undefined => {
  return tourRegistry.get(tourId);
};

export default tourRegistry;
