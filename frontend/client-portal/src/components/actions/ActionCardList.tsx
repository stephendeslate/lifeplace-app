// frontend/client-portal/src/components/actions/ActionCardList.tsx

import React from 'react';
import { Box, Typography, Paper, Skeleton, Stack, Button } from '@mui/material';
import { CheckCircleOutline as AllDoneIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { TaskActionCard } from './TaskActionCard';
import { QuoteActionCard } from './QuoteActionCard';
import { ContractActionCard } from './ContractActionCard';
import { PaymentActionCard } from './PaymentActionCard';
import type {
  AnyActionItem,
  TaskActionItem,
  QuoteActionItem,
  ContractActionItem,
  PaymentActionItem,
} from '../../types/action-center.types';
import {
  isTaskAction,
  isQuoteAction,
  isContractAction,
  isPaymentAction,
} from '../../types/action-center.types';

interface ActionCardListProps {
  actions: AnyActionItem[];
  isLoading?: boolean;
  showEmpty?: boolean;
  onActionComplete?: () => void;
  onContractSign?: (action: ContractActionItem) => void;
  onContractView?: (action: ContractActionItem) => void;
  onPaymentPay?: (action: PaymentActionItem) => void;
  onPaymentView?: (action: PaymentActionItem) => void;
}

// Loading skeleton component
const ActionCardSkeleton: React.FC = () => (
  <Paper sx={{ p: 2, mb: 1.5 }}>
    <Box sx={{ display: 'flex', gap: 1.5 }}>
      <Skeleton variant="circular" width={40} height={40} />
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width="60%" height={24} />
        <Skeleton variant="text" width="80%" height={20} />
      </Box>
      <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1 }} />
    </Box>
    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
      <Skeleton variant="rectangular" width={80} height={28} sx={{ borderRadius: 1 }} />
      <Skeleton variant="rectangular" width={80} height={28} sx={{ borderRadius: 1 }} />
    </Box>
  </Paper>
);

// Empty state component
const EmptyState: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Paper
      sx={{
        p: 4,
        textAlign: 'center',
        backgroundColor: 'grey.50',
        borderRadius: 3,
      }}
    >
      <AllDoneIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
      <Typography variant="h5" gutterBottom color="text.primary">
        All caught up!
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
        You have no pending actions at the moment. Great job staying on top of things!
      </Typography>
      <Stack direction="row" spacing={2} justifyContent="center">
        <Button variant="outlined" onClick={() => navigate('/dashboard')}>
          Go to Dashboard
        </Button>
        <Button variant="contained" onClick={() => navigate('/events')}>
          View My Events
        </Button>
      </Stack>
    </Paper>
  );
};

export const ActionCardList: React.FC<ActionCardListProps> = ({
  actions,
  isLoading = false,
  showEmpty = true,
  onActionComplete,
  onContractSign,
  onContractView,
  onPaymentPay,
  onPaymentView,
}) => {
  // Loading state
  if (isLoading) {
    return (
      <Box>
        {[1, 2, 3].map((i) => (
          <ActionCardSkeleton key={i} />
        ))}
      </Box>
    );
  }

  // Empty state
  if (actions.length === 0) {
    return showEmpty ? <EmptyState /> : null;
  }

  // Render action cards
  return (
    <Box>
      {actions.map((action) => {
        if (isTaskAction(action)) {
          return (
            <TaskActionCard
              key={action.id}
              action={action as TaskActionItem}
              onActionComplete={onActionComplete}
            />
          );
        }

        if (isQuoteAction(action)) {
          return (
            <QuoteActionCard
              key={action.id}
              action={action as QuoteActionItem}
              onActionComplete={onActionComplete}
            />
          );
        }

        if (isContractAction(action)) {
          return (
            <ContractActionCard
              key={action.id}
              action={action as ContractActionItem}
              onSign={() => onContractSign?.(action as ContractActionItem)}
              onView={() => onContractView?.(action as ContractActionItem)}
            />
          );
        }

        if (isPaymentAction(action)) {
          return (
            <PaymentActionCard
              key={action.id}
              action={action as PaymentActionItem}
              onPay={() => onPaymentPay?.(action as PaymentActionItem)}
              onView={() => onPaymentView?.(action as PaymentActionItem)}
            />
          );
        }

        return null;
      })}
    </Box>
  );
};

export default ActionCardList;
