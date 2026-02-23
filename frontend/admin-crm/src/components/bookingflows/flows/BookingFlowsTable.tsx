// frontend/admin-crm/src/components/bookingflows/flows/BookingFlowsTable.tsx

import React from 'react';
import { Chip, Typography, Box, Tooltip, LinearProgress } from '@mui/material';
// Modern Design System imports
import {
  ModernTable,
  ModernEmptyState,
  type ModernTableColumn,
  type ModernTableAction,
} from '../../common';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as DuplicateIcon,
  Visibility as PreviewIcon,
  EventNote as FlowIcon,
  Event as EventIcon,
  List as StepsIcon,
  Analytics as AnalyticsIcon,
  Science as TestIcon,
  People as GuestsIcon,
  Payment as PaymentIcon,
  Schedule as TimeIcon,
  CheckCircle as ActiveIcon,
  RadioButtonUnchecked as InactiveIcon,
} from '@mui/icons-material';
import type { BookingFlowTableProps, BookingFlow } from '../../../types/bookingflows.types';
import {
  getEventTypeDisplayName,
  hasSpecificEventType,
  getEventTypeChipColor,
} from '../../../utils/bookingFlowUtils';

export const BookingFlowsTable: React.FC<BookingFlowTableProps> = ({
  bookingFlows,
  isLoading,
  onEdit,
  onPreview,
  onDuplicate,
  onDelete,
}) => {
  const getStatusChip = (flow: BookingFlow) => {
    if (flow.is_test_mode) {
      return (
        <Chip label="Test Mode" size="small" color="warning" variant="filled" icon={<TestIcon />} />
      );
    }

    return (
      <Chip
        label={flow.is_active ? 'Active' : 'Inactive'}
        size="small"
        color={flow.is_active ? 'success' : 'default'}
        variant={flow.is_active ? 'filled' : 'outlined'}
        icon={flow.is_active ? <ActiveIcon /> : <InactiveIcon />}
      />
    );
  };

  const getEventTypeChip = (flow: BookingFlow) => {
    const displayName = getEventTypeDisplayName(flow);
    const isSpecific = hasSpecificEventType(flow);
    const chipColor = getEventTypeChipColor(flow);

    return (
      <Chip
        icon={isSpecific ? <EventIcon /> : undefined}
        label={displayName}
        size="small"
        variant="outlined"
        color={chipColor}
        sx={{
          fontStyle: isSpecific ? 'normal' : 'italic',
          opacity: isSpecific ? 1 : 0.8,
        }}
      />
    );
  };

  const getStepsInfo = (flow: BookingFlow) => {
    const isAllEnabled = flow.total_steps === flow.enabled_steps_count;
    const completionPercentage =
      flow.total_steps > 0 ? Math.round((flow.enabled_steps_count / flow.total_steps) * 100) : 0;

    return (
      <Box>
        <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
          <StepsIcon fontSize="small" color={isAllEnabled ? 'primary' : 'action'} />
          <Typography
            variant="body2"
            fontWeight="medium"
            color={isAllEnabled ? 'primary' : 'text.secondary'}
          >
            {flow.enabled_steps_count}/{flow.total_steps}
          </Typography>
        </Box>
        <Box sx={{ width: 60 }}>
          <LinearProgress
            variant="determinate"
            value={completionPercentage}
            sx={{
              height: 4,
              borderRadius: 2,
              backgroundColor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                borderRadius: 2,
                backgroundColor: isAllEnabled ? 'success.main' : 'primary.main',
              },
            }}
          />
        </Box>
        <Typography variant="caption" color="text.secondary">
          {completionPercentage}% configured
        </Typography>
      </Box>
    );
  };

  const getFeatureChips = (flow: BookingFlow) => {
    const chips = [];

    if (flow.allow_guest_booking) {
      chips.push(
        <Chip
          key="guest"
          icon={<GuestsIcon />}
          label="Guest Booking"
          size="small"
          variant="outlined"
          color="info"
        />,
      );
    }

    if (flow.require_immediate_payment) {
      chips.push(
        <Chip
          key="payment"
          icon={<PaymentIcon />}
          label="Immediate Payment"
          size="small"
          variant="outlined"
          color="secondary"
        />,
      );
    }

    if (flow.auto_approve_bookings) {
      chips.push(
        <Chip
          key="auto-approve"
          label="Auto-approve"
          size="small"
          variant="outlined"
          color="success"
        />,
      );
    }

    return chips;
  };

  const getBookingWindow = (flow: BookingFlow) => {
    return (
      <Box display="flex" alignItems="center" gap={0.5}>
        <TimeIcon fontSize="small" color="action" />
        <Typography variant="body2" color="text.secondary">
          {flow.min_advance_booking_days}-{flow.max_advance_booking_days} days
        </Typography>
      </Box>
    );
  };

  const columns: ModernTableColumn<BookingFlow>[] = [
    {
      key: 'name',
      label: 'Name & Details',
      sortable: true,
      render: (_, flow) => (
        <Box display="flex" alignItems="center" gap={1}>
          <FlowIcon color="primary" />
          <Box>
            <Typography variant="subtitle2" fontWeight="medium">
              {flow.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ID: {flow.id}
            </Typography>
            {flow.description && (
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                sx={{
                  maxWidth: 250,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {flow.description}
              </Typography>
            )}
          </Box>
        </Box>
      ),
    },
    {
      key: 'event_type',
      label: 'Event Type',
      hideBelow: 'lg',
      render: (_, flow) => getEventTypeChip(flow),
    },
    {
      key: 'steps',
      label: 'Steps Configuration',
      align: 'center',
      hideBelow: 'lg',
      render: (_, flow) => (
        <Tooltip title={`${flow.enabled_steps_count} of ${flow.total_steps} steps enabled`} arrow>
          <Box>{getStepsInfo(flow)}</Box>
        </Tooltip>
      ),
    },
    {
      key: 'status',
      label: 'Status & Features',
      render: (_, flow) => (
        <Box display="flex" flexDirection="column" gap={0.5}>
          {getStatusChip(flow)}
          <Box display="flex" flexWrap="wrap" gap={0.5}>
            {getFeatureChips(flow).slice(0, 2)}
            {getFeatureChips(flow).length > 2 && (
              <Chip
                label={`+${getFeatureChips(flow).length - 2}`}
                size="small"
                variant="outlined"
                color="default"
              />
            )}
          </Box>
        </Box>
      ),
    },
    {
      key: 'booking_window',
      label: 'Booking Window',
      hideBelow: 'md',
      render: (_, flow) => getBookingWindow(flow),
    },
    {
      key: 'updated_at',
      label: 'Last Updated',
      hideBelow: 'md',
      render: (_, flow) => (
        <Box>
          <Typography variant="body2" color="text.secondary">
            {new Date(flow.updated_at).toLocaleDateString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(flow.updated_at).toLocaleTimeString()}
          </Typography>
        </Box>
      ),
    },
  ];

  const actions: ModernTableAction<BookingFlow>[] = [
    {
      label: 'Edit Flow',
      icon: <EditIcon />,
      onClick: (flow) => onEdit(flow),
      color: 'primary',
    },
    {
      label: 'Preview Flow',
      icon: <PreviewIcon />,
      onClick: (flow) => onPreview(flow),
      color: 'default',
    },
    {
      label: 'Duplicate Flow',
      icon: <DuplicateIcon />,
      onClick: (flow) => onDuplicate(flow),
      color: 'default',
    },
    {
      label: 'View Analytics',
      icon: <AnalyticsIcon />,
      onClick: (_flow) => {
        // TODO: Navigate to analytics - should be handled by parent component
      },
      color: 'default',
    },
    {
      label: 'Delete Flow',
      icon: <DeleteIcon />,
      onClick: (flow) => onDelete(flow.id),
      color: 'error',
    },
  ];

  const emptyState = (
    <ModernEmptyState
      icon={FlowIcon}
      title="No booking flows found"
      description="Create your first booking flow to guide clients through the booking process"
      size="large"
      color="primary"
    />
  );

  return (
    <ModernTable
      columns={columns as unknown as ModernTableColumn<Record<string, unknown>>[]}
      data={bookingFlows as unknown as Record<string, unknown>[]}
      actions={actions as unknown as ModernTableAction<Record<string, unknown>>[]}
      onRowClick={(row) => onEdit(row as unknown as BookingFlow)}
      loading={isLoading}
      emptyState={emptyState}
    />
  );
};
