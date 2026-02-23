// frontend/client-portal/src/components/actions/PaymentActionCard.tsx

import React from 'react';
import { Stack, Button, Typography, Chip, Alert } from '@mui/material';
import {
  Payment as PayIcon,
  Visibility as ViewIcon,
  Warning as OverdueIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ActionCard } from './ActionCard';
import type { PaymentActionItem } from '../../types/action-center.types';

interface PaymentActionCardProps {
  action: PaymentActionItem;
  onPay?: () => void;
  onView?: () => void;
}

export const PaymentActionCard: React.FC<PaymentActionCardProps> = ({ action, onPay, onView }) => {
  const navigate = useNavigate();

  const handlePay = () => {
    if (onPay) {
      onPay();
    } else {
      // Navigate to payments page with the invoice selected
      navigate(`/payments?pay=${action.invoiceId}`);
    }
  };

  const handleView = () => {
    if (onView) {
      onView();
    } else {
      navigate(`/payments?view=${action.invoiceId}`);
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: action.currency || 'USD',
    }).format(parseFloat(amount));
  };

  const { isOverdue, daysPastDue } = action;

  return (
    <ActionCard action={action}>
      <Stack spacing={1.5}>
        {/* Amount and Status */}
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Typography
            variant="h6"
            color={isOverdue ? 'error.main' : 'primary.main'}
            sx={{ fontWeight: 600 }}
          >
            {formatCurrency(action.amount)}
          </Typography>

          {isOverdue && (
            <Chip
              icon={<OverdueIcon sx={{ fontSize: '0.875rem !important' }} />}
              label={`${daysPastDue} day${daysPastDue !== 1 ? 's' : ''} overdue`}
              color="error"
              size="small"
              variant="filled"
              sx={{ fontSize: '0.7rem' }}
            />
          )}

          {!isOverdue && (
            <Chip
              label="Due Soon"
              color="warning"
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          )}
        </Stack>

        {/* Invoice Number */}
        {action.invoiceNumber && (
          <Typography variant="caption" color="text.secondary">
            Invoice: {action.invoiceNumber}
          </Typography>
        )}

        {/* Overdue Warning */}
        {isOverdue && daysPastDue > 7 && (
          <Alert severity="error" sx={{ py: 0.5 }}>
            This payment is significantly overdue. Please pay immediately to avoid service
            interruption.
          </Alert>
        )}

        {/* Action Buttons */}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ViewIcon />}
            onClick={(e) => {
              e.stopPropagation();
              handleView();
            }}
            sx={{ fontSize: '0.75rem' }}
          >
            View Invoice
          </Button>

          <Button
            variant="contained"
            size="small"
            startIcon={<PayIcon />}
            onClick={(e) => {
              e.stopPropagation();
              handlePay();
            }}
            color={isOverdue ? 'error' : 'primary'}
            sx={{ fontSize: '0.75rem' }}
          >
            Pay Now
          </Button>
        </Stack>
      </Stack>
    </ActionCard>
  );
};

export default PaymentActionCard;
