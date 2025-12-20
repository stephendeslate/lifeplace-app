// frontend/client-portal/src/hooks/index.ts

export { default as useAuth } from './useAuth';
export { default as useEvents } from './useEvents';
export * from './useEventQuotes';
export { default as useDashboardData } from './useDashboardData';
export type { DashboardData } from './useDashboardData';
export * from './useFinancial';
export { useInvoicePayments } from './useInvoicePayments';

// Notification hooks
export { default as useNotifications } from './useNotifications';
export { default as useNotificationPreferences } from './useNotificationPreferences';
export { default as useNotificationRealtime } from './useNotificationRealtime';

// Contract history hooks
export * from './useContractHistory';