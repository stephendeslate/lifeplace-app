// frontend/client-portal/src/constants/support.constants.ts

import type { SupportCategory, SupportStatus } from '../types/support.types';

export const SUPPORT_CATEGORIES: { value: SupportCategory; label: string; description: string }[] =
  [
    {
      value: 'billing',
      label: 'Billing & Payments',
      description: 'Questions about invoices, payments, or refunds',
    },
    {
      value: 'event',
      label: 'Event Changes/Questions',
      description: 'Modify or ask about your event details',
    },
    {
      value: 'technical',
      label: 'Technical Issues',
      description: 'Problems with the website or portal',
    },
    {
      value: 'general',
      label: 'General Inquiry',
      description: 'Other questions or feedback',
    },
  ];

export const SUPPORT_STATUS_CONFIG: Record<
  SupportStatus,
  {
    label: string;
    color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  }
> = {
  active: { label: 'Open', color: 'info' },
  waiting: { label: 'Awaiting Response', color: 'warning' },
  resolved: { label: 'Resolved', color: 'success' },
  archived: { label: 'Closed', color: 'default' },
};

export const getCategoryLabel = (category: SupportCategory): string => {
  const found = SUPPORT_CATEGORIES.find((c) => c.value === category);
  return found?.label || category;
};

export const getStatusConfig = (status: SupportStatus) => {
  return SUPPORT_STATUS_CONFIG[status] || { label: status, color: 'default' as const };
};
