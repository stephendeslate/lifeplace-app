// frontend/admin-crm/src/components/notifications/NotificationCard/notificationCardUtils.tsx

import { Schedule, Person, Notifications as NotificationIcon } from '@mui/icons-material';
import { tokens } from '@/design-system';

export const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'URGENT':
      return 'error';
    case 'HIGH':
      return 'warning';
    case 'NORMAL':
      return 'info';
    case 'LOW':
      return 'default';
    default:
      return 'default';
  }
};

export const getCategoryColor = (category: string) => {
  switch (category) {
    case 'SYSTEM':
      return tokens.color.notification.system;
    case 'EVENT':
      return tokens.color.notification.event;
    case 'TASK':
      return tokens.color.notification.task;
    case 'PAYMENT':
      return tokens.color.notification.payment;
    case 'CLIENT':
      return tokens.color.notification.client;
    case 'CONTRACT':
      return tokens.color.notification.contract;
    case 'WORKFLOW':
      return tokens.color.notification.workflow;
    case 'COMMUNICATION':
      return tokens.color.notification.communication;
    default:
      return tokens.color.notification.system;
  }
};

export const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'EVENT':
      return <Schedule fontSize="small" />;
    case 'CLIENT':
      return <Person fontSize="small" />;
    case 'SYSTEM':
    case 'TASK':
    case 'PAYMENT':
    case 'CONTRACT':
    case 'WORKFLOW':
    case 'COMMUNICATION':
    default:
      return <NotificationIcon fontSize="small" />;
  }
};
