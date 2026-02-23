// frontend/admin-crm/src/utils/eventStatus.ts

import {
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import type { EventStatus } from '../types/events.types';

export const getEventStatusSummary = (status: EventStatus) => {
  switch (status) {
    case 'LEAD':
      return {
        icon: InfoIcon,
        label: 'Lead',
        color: 'info' as const,
        description: 'Potential event opportunity',
      };
    case 'CONFIRMED':
      return {
        icon: CheckCircleIcon,
        label: 'Confirmed',
        color: 'success' as const,
        description: 'Event is confirmed and scheduled',
      };
    case 'COMPLETED':
      return {
        icon: ScheduleIcon,
        label: 'Completed',
        color: 'default' as const,
        description: 'Event has been completed',
      };
    case 'CANCELLED':
      return {
        icon: CancelIcon,
        label: 'Cancelled',
        color: 'error' as const,
        description: 'Event has been cancelled',
      };
    default:
      return {
        icon: InfoIcon,
        label: status,
        color: 'default' as const,
        description: 'Unknown status',
      };
  }
};

export const getEventPriorityColor = (status: EventStatus, daysUntilEvent?: number) => {
  if (status === 'CANCELLED') return 'error';
  if (status === 'COMPLETED') return 'default';

  if (daysUntilEvent !== undefined) {
    if (daysUntilEvent < 0) return 'error'; // Past due
    if (daysUntilEvent <= 7) return 'warning'; // Within a week
    if (daysUntilEvent <= 30) return 'info'; // Within a month
  }

  return 'primary';
};

export const getWorkflowStatusColor = (percentage: number) => {
  if (percentage >= 100) return 'success';
  if (percentage >= 75) return 'info';
  if (percentage >= 50) return 'warning';
  if (percentage >= 25) return 'primary';
  return 'error';
};
