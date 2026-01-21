/**
 * InvoiceStatusBadge Component
 *
 * Displays invoice status with appropriate styling.
 */

import React from 'react';
import { Badge, type BadgeVariant } from '@/components/common/Badge';
import type { InvoiceStatus } from '@/apis/payments.api';

export interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  size?: 'small' | 'medium' | 'large';
}

const statusConfig: Record<InvoiceStatus, { label: string; variant: BadgeVariant }> = {
  DRAFT: { label: 'Draft', variant: 'default' },
  ISSUED: { label: 'Pending', variant: 'warning' },
  PAID: { label: 'Paid', variant: 'success' },
  PARTIALLY_PAID: { label: 'Partial', variant: 'info' },
  OVERDUE: { label: 'Overdue', variant: 'error' },
  CANCELLED: { label: 'Cancelled', variant: 'default' },
  VOID: { label: 'Void', variant: 'default' },
};

export function InvoiceStatusBadge({ status, size = 'medium' }: InvoiceStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.DRAFT;

  return <Badge label={config.label} variant={config.variant} size={size} />;
}

export default InvoiceStatusBadge;
