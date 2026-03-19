// Reusable Status Chip Components for Payment-related statuses

import React from 'react';
import { Chip, type ChipProps } from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Cancel as CancelIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Replay as ReplayIcon,
  AddCircle as AddCircleIcon,
  Pause as PauseIcon,
  Error as ErrorIcon,
  Block as BlockIcon,
} from '@mui/icons-material';
import type {
  PaymentStatus,
  PaymentPlanStatus,
  InstallmentStatus,
} from '../../types/payments';

type ChipColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';

// Payment Status Chip
interface PaymentStatusChipProps {
  status: PaymentStatus;
  size?: 'small' | 'medium';
  variant?: ChipProps['variant'];
  showIcon?: boolean;
}

const paymentStatusColorMap: Record<PaymentStatus, ChipColor> = {
  CREATED: 'default',
  PENDING: 'warning',
  PROCESSING: 'info',
  COMPLETED: 'success',
  FAILED: 'error',
  CANCELLED: 'default',
  REFUNDED: 'secondary',
};

const paymentStatusLabelMap: Record<PaymentStatus, string> = {
  CREATED: 'Created',
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

export const PaymentStatusChip: React.FC<PaymentStatusChipProps> = ({
  status,
  size = 'small',
  variant = 'filled',
  showIcon = true,
}) => {
  const getIcon = () => {
    switch (status) {
      case 'CREATED':
        return <AddCircleIcon sx={{ fontSize: 16 }} />;
      case 'PENDING':
        return <ScheduleIcon sx={{ fontSize: 16 }} />;
      case 'PROCESSING':
        return <HourglassEmptyIcon sx={{ fontSize: 16 }} />;
      case 'COMPLETED':
        return <CheckCircleIcon sx={{ fontSize: 16 }} />;
      case 'FAILED':
        return <CancelIcon sx={{ fontSize: 16 }} />;
      case 'CANCELLED':
        return <CancelIcon sx={{ fontSize: 16 }} />;
      case 'REFUNDED':
        return <ReplayIcon sx={{ fontSize: 16 }} />;
      default:
        return null;
    }
  };

  return (
    <Chip
      label={paymentStatusLabelMap[status]}
      color={paymentStatusColorMap[status]}
      size={size}
      variant={variant}
      icon={showIcon ? (getIcon() ?? undefined) : undefined}
    />
  );
};

// Payment Plan Status Chip
interface PaymentPlanStatusChipProps {
  status: PaymentPlanStatus;
  size?: 'small' | 'medium';
  variant?: ChipProps['variant'];
  showIcon?: boolean;
}

const paymentPlanStatusColorMap: Record<PaymentPlanStatus, ChipColor> = {
  PENDING: 'info',
  ACTIVE: 'primary',
  COMPLETED: 'success',
  SUSPENDED: 'warning',
  DEFAULTED: 'error',
  CANCELLED: 'default',
};

const paymentPlanStatusLabelMap: Record<PaymentPlanStatus, string> = {
  PENDING: 'Pending',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  SUSPENDED: 'Suspended',
  DEFAULTED: 'Defaulted',
  CANCELLED: 'Cancelled',
};

export const PaymentPlanStatusChip: React.FC<PaymentPlanStatusChipProps> = ({
  status,
  size = 'small',
  variant = 'filled',
  showIcon = true,
}) => {
  const getIcon = () => {
    switch (status) {
      case 'PENDING':
        return <ScheduleIcon sx={{ fontSize: 16 }} />;
      case 'ACTIVE':
        return <CheckCircleIcon sx={{ fontSize: 16 }} />;
      case 'COMPLETED':
        return <CheckCircleIcon sx={{ fontSize: 16 }} />;
      case 'SUSPENDED':
        return <PauseIcon sx={{ fontSize: 16 }} />;
      case 'DEFAULTED':
        return <ErrorIcon sx={{ fontSize: 16 }} />;
      case 'CANCELLED':
        return <CancelIcon sx={{ fontSize: 16 }} />;
      default:
        return null;
    }
  };

  return (
    <Chip
      label={paymentPlanStatusLabelMap[status]}
      color={paymentPlanStatusColorMap[status]}
      size={size}
      variant={variant}
      icon={showIcon ? (getIcon() ?? undefined) : undefined}
    />
  );
};

// Installment Status Chip
interface InstallmentStatusChipProps {
  status: InstallmentStatus;
  size?: 'small' | 'medium';
  variant?: ChipProps['variant'];
  showIcon?: boolean;
}

const installmentStatusColorMap: Record<InstallmentStatus, ChipColor> = {
  PENDING: 'warning',
  PAID: 'success',
  PARTIAL: 'info',
  WAIVED: 'secondary',
  CANCELLED: 'default',
  OVERDUE: 'error',
};

const installmentStatusLabelMap: Record<InstallmentStatus, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  PARTIAL: 'Partial',
  WAIVED: 'Waived',
  CANCELLED: 'Cancelled',
  OVERDUE: 'Overdue',
};

export const InstallmentStatusChip: React.FC<InstallmentStatusChipProps> = ({
  status,
  size = 'small',
  variant = 'filled',
  showIcon = true,
}) => {
  const getIcon = () => {
    switch (status) {
      case 'PENDING':
        return <ScheduleIcon sx={{ fontSize: 16 }} />;
      case 'PAID':
        return <CheckCircleIcon sx={{ fontSize: 16 }} />;
      case 'PARTIAL':
        return <HourglassEmptyIcon sx={{ fontSize: 16 }} />;
      case 'WAIVED':
        return <BlockIcon sx={{ fontSize: 16 }} />;
      case 'CANCELLED':
        return <CancelIcon sx={{ fontSize: 16 }} />;
      case 'OVERDUE':
        return <ErrorIcon sx={{ fontSize: 16 }} />;
      default:
        return null;
    }
  };

  return (
    <Chip
      label={installmentStatusLabelMap[status]}
      color={installmentStatusColorMap[status]}
      size={size}
      variant={variant}
      icon={showIcon ? (getIcon() ?? undefined) : undefined}
    />
  );
};
