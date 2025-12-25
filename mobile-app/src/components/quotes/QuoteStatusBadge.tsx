/**
 * QuoteStatusBadge Component
 *
 * Displays quote status with appropriate styling.
 */

import React from 'react';
import { Badge, type BadgeVariant } from '@/components/common/Badge';

type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

interface QuoteStatusBadgeProps {
  status: QuoteStatus;
  size?: 'small' | 'medium' | 'large';
}

const statusConfig: Record<QuoteStatus, { label: string; variant: BadgeVariant }> = {
  DRAFT: { label: 'Draft', variant: 'default' },
  SENT: { label: 'Awaiting Response', variant: 'warning' },
  ACCEPTED: { label: 'Accepted', variant: 'success' },
  REJECTED: { label: 'Declined', variant: 'error' },
  EXPIRED: { label: 'Expired', variant: 'error' },
};

export function QuoteStatusBadge({ status, size = 'medium' }: QuoteStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.DRAFT;

  return <Badge label={config.label} variant={config.variant} size={size} />;
}

export default QuoteStatusBadge;
