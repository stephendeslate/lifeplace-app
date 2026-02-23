// frontend/client-portal/src/components/events/EventStatusBadge.tsx

import React from 'react';
import { Chip } from '@mui/material';
import type { ChipProps } from '@mui/material';
import type { EventStatus, PaymentStatus } from '../../types/events.types';

interface EventStatusBadgeProps {
  status: EventStatus | PaymentStatus;
  size?: ChipProps['size'];
  variant?: ChipProps['variant'];
}

const EventStatusBadge: React.FC<EventStatusBadgeProps> = ({
  status,
  size = 'medium',
  variant = 'filled',
}) => {
  const getStatusConfig = (status: string): { color: ChipProps['color']; label: string } => {
    switch (status) {
      // Event statuses
      case 'DRAFT':
        return { color: 'default', label: 'Draft' };
      case 'CONFIRMED':
        return { color: 'info', label: 'Confirmed' };
      case 'IN_PROGRESS':
        return { color: 'warning', label: 'In Progress' };
      case 'COMPLETED':
        return { color: 'success', label: 'Completed' };
      case 'CANCELLED':
        return { color: 'error', label: 'Cancelled' };

      // Payment statuses
      case 'PENDING':
        return { color: 'warning', label: 'Payment Pending' };
      case 'PARTIAL':
        return { color: 'info', label: 'Partially Paid' };
      case 'PAID':
        return { color: 'success', label: 'Paid' };
      case 'OVERDUE':
        return { color: 'error', label: 'Overdue' };

      default:
        return { color: 'default', label: status };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Chip
      label={config.label}
      color={config.color}
      size={size}
      variant={variant}
      sx={{
        fontWeight: 500,
        textTransform: 'capitalize',
      }}
      aria-label={`Status: ${config.label}`}
    />
  );
};

export default EventStatusBadge;
