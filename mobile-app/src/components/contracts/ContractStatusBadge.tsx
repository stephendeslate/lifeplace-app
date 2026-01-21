/**
 * ContractStatusBadge Component
 *
 * Displays contract status with appropriate styling.
 */

import React from 'react';
import { Badge, type BadgeVariant } from '@/components/common/Badge';
import type { ContractStatus } from '@/types/events.types';

interface ContractStatusBadgeProps {
  status: ContractStatus;
  size?: 'small' | 'medium' | 'large';
}

const statusConfig: Record<ContractStatus, { label: string; variant: BadgeVariant }> = {
  DRAFT: { label: 'Draft', variant: 'default' },
  SENT: { label: 'Awaiting Signature', variant: 'warning' },
  PARTIALLY_SIGNED: { label: 'Partially Signed', variant: 'info' },
  SIGNED: { label: 'Signed', variant: 'success' },
  EXPIRED: { label: 'Expired', variant: 'error' },
  VOID: { label: 'Void', variant: 'default' },
  AMENDED: { label: 'Amended', variant: 'info' },
};

export function ContractStatusBadge({ status, size = 'medium' }: ContractStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.DRAFT;

  return <Badge label={config.label} variant={config.variant} size={size} />;
}

export default ContractStatusBadge;
