// frontend/client-portal/src/components/events/EventMilestones.tsx

import React, { useMemo } from 'react';
import { Box, Typography, useTheme, alpha } from '@mui/material';
import {
  CheckCircle as CompletedIcon,
  RadioButtonUnchecked as PendingIcon,
  FiberManualRecord as CurrentIcon,
  Remove as NAIcon,
} from '@mui/icons-material';
import type { EventDetail } from '../../types/events.types';

// =============================================================================
// TYPES
// =============================================================================

export type MilestoneStatus = 'completed' | 'current' | 'pending' | 'na';

export interface Milestone {
  key: string;
  label: string;
  status: MilestoneStatus;
}

export interface EventMilestonesProps {
  event: EventDetail;
  /** Compact mode for inline display in cards */
  compact?: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Compute milestone statuses from event data
 */
function computeMilestones(event: EventDetail): Milestone[] {
  const milestones: Milestone[] = [];
  const now = new Date();
  const eventDate = new Date(event.start_date);
  const isPastEvent = eventDate < now && event.days_until_event !== 0;
  const isToday = event.days_until_event === 0;

  // 1. BOOKING - Complete if event exists and not cancelled/draft
  const bookingComplete = event.status !== 'CANCELLED' && event.status !== 'DRAFT';
  milestones.push({
    key: 'booking',
    label: 'Booked',
    status: bookingComplete ? 'completed' : 'pending',
  });

  // 2. CONTRACT - Check if contracts exist and their status
  const contracts = event.contracts ?? [];
  const hasContracts = contracts.length > 0 || event.has_contracts;

  let contractStatus: MilestoneStatus = 'na';
  if (hasContracts) {
    // Check if all contracts are signed
    const allContractsSigned =
      contracts.length > 0
        ? contracts.every((c) => c.status === 'SIGNED')
        : event.contract_status === 'SIGNED';
    // Or use pending_signature_required as the definitive check
    const contractSigned = allContractsSigned || event.pending_signature_required === false;

    if (contractSigned) {
      contractStatus = 'completed';
    } else if (bookingComplete) {
      // Contract pending and booking done = current step
      contractStatus = 'current';
    } else {
      contractStatus = 'pending';
    }
  }

  milestones.push({
    key: 'contract',
    label: 'Contract',
    status: contractStatus,
  });

  // 3. PAYMENT - Based on payment_status
  let paymentStatus: MilestoneStatus = 'pending';
  if (event.payment_status === 'PAID') {
    paymentStatus = 'completed';
  } else if (event.payment_status === 'PARTIAL') {
    // Partially paid = current/in progress
    paymentStatus = 'current';
  } else if ((contractStatus === 'completed' || contractStatus === 'na') && bookingComplete) {
    // If contract is done (or N/A) and payment not started, it's the current step
    paymentStatus = 'current';
  }

  milestones.push({
    key: 'payment',
    label: 'Payment',
    status: paymentStatus,
  });

  // 4. EVENT DAY - Based on date
  let eventDayStatus: MilestoneStatus = 'pending';
  let eventDayLabel = 'Event Day';

  if (isPastEvent || event.status === 'COMPLETED') {
    eventDayStatus = 'completed';
    eventDayLabel = 'Completed';
  } else if (isToday) {
    eventDayStatus = 'current';
    eventDayLabel = 'Today!';
  }

  milestones.push({
    key: 'eventDay',
    label: eventDayLabel,
    status: eventDayStatus,
  });

  return milestones;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const EventMilestones: React.FC<EventMilestonesProps> = ({ event, compact = false }) => {
  const theme = useTheme();
  const milestones = useMemo(() => computeMilestones(event), [event]);

  // Don't render for cancelled events
  if (event.status === 'CANCELLED') {
    return null;
  }

  const getIconForStatus = (status: MilestoneStatus) => {
    switch (status) {
      case 'completed':
        return (
          <CompletedIcon sx={{ color: theme.palette.success.main, fontSize: compact ? 16 : 22 }} />
        );
      case 'current':
        return (
          <Box
            sx={{
              width: compact ? 16 : 22,
              height: compact ? 16 : 22,
              borderRadius: '50%',
              bgcolor: alpha(theme.palette.primary.main, 0.15),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CurrentIcon sx={{ color: theme.palette.primary.main, fontSize: compact ? 10 : 12 }} />
          </Box>
        );
      case 'na':
        return <NAIcon sx={{ color: theme.palette.grey[300], fontSize: compact ? 16 : 22 }} />;
      default:
        return <PendingIcon sx={{ color: theme.palette.grey[300], fontSize: compact ? 16 : 22 }} />;
    }
  };

  const getConnectorColor = (status: MilestoneStatus) => {
    return status === 'completed' ? theme.palette.success.main : theme.palette.grey[200];
  };

  const getLabelColor = (status: MilestoneStatus) => {
    switch (status) {
      case 'completed':
        return theme.palette.success.main;
      case 'current':
        return theme.palette.primary.main;
      case 'na':
        return theme.palette.grey[300];
      default:
        return theme.palette.text.secondary;
    }
  };

  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {milestones.map((milestone, index) => (
          <Box key={milestone.key} sx={{ display: 'flex', alignItems: 'center' }}>
            {getIconForStatus(milestone.status)}
            {index < milestones.length - 1 && (
              <Box
                sx={{
                  width: 16,
                  height: 2,
                  bgcolor: getConnectorColor(milestone.status),
                  mx: 0.5,
                }}
              />
            )}
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        py: 2,
        px: 3,
        bgcolor: 'background.paper',
        borderRadius: 2,
        mb: 3,
        boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.04)}`,
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      {milestones.map((milestone, index) => (
        <Box
          key={milestone.key}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            flex: 1,
          }}
        >
          {/* Icon and connector row */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              justifyContent: 'center',
              mb: 1,
            }}
          >
            {getIconForStatus(milestone.status)}
            {index < milestones.length - 1 && (
              <Box
                sx={{
                  height: 2,
                  flex: 1,
                  bgcolor: getConnectorColor(milestone.status),
                  mx: 1,
                  minWidth: 20,
                }}
              />
            )}
          </Box>
          {/* Label */}
          <Typography
            variant="caption"
            sx={{
              color: getLabelColor(milestone.status),
              fontWeight: milestone.status === 'current' ? 600 : 500,
              textAlign: 'center',
            }}
          >
            {milestone.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

export default EventMilestones;
