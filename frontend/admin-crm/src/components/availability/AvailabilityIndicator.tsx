// frontend/admin-crm/src/components/availability/AvailabilityIndicator.tsx

import React from 'react';
import {
  Box,
  Chip,
  Tooltip,
  Typography,
  Stack,
  Paper,
  useTheme,
  alpha,
} from '@mui/material';
import {
  CheckCircle,
  Schedule,
  Block,
  Info,
  Event as EventIcon,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';

import type { 
  DateAvailabilityInfo 
} from '../../types/availability.types';
import { AvailabilityUtils } from '../../utils/availability.utils';

interface AvailabilityIndicatorProps {
  availability: DateAvailabilityInfo;
  showDetails?: boolean;
  compact?: boolean;
  interactive?: boolean;
  onClick?: () => void;
}

export const AvailabilityIndicator: React.FC<AvailabilityIndicatorProps> = ({
  availability,
  showDetails = false,
  compact = false,
  interactive = false,
  onClick,
}) => {
  const theme = useTheme();
  const indicator = AvailabilityUtils.getAvailabilityIndicator(availability);

  const getStatusIcon = () => {
    switch (availability.status) {
      case 'available':
        return <CheckCircle fontSize="small" />;
      case 'partially_booked':
        return <Schedule fontSize="small" />;
      case 'fully_booked':
        return <Block fontSize="small" />;
      case 'blocked':
        return <Block fontSize="small" />;
      default:
        return <Info fontSize="small" />;
    }
  };

  const getStatusChip = () => (
    <Chip
      icon={getStatusIcon()}
      label={compact ? '' : AvailabilityUtils.getStatusLabel(availability.status)}
      color={AvailabilityUtils.getStatusMuiColor(availability.status)}
      size={compact ? 'small' : 'medium'}
      variant={availability.can_book_event ? 'filled' : 'outlined'}
    />
  );

  const renderConflictDetails = () => {
    if (!showDetails || availability.conflicts.length === 0) return null;

    return (
      <Stack spacing={1} sx={{ mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Conflicts:
        </Typography>
        {availability.conflicts.slice(0, 3).map((conflict, index) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EventIcon fontSize="small" color={conflict.status === 'CONFIRMED' ? 'error' : 'warning'} />
            <Box>
              <Typography variant="body2" fontWeight="medium">
                {conflict.event_name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {conflict.client_name} • {conflict.status}
              </Typography>
            </Box>
          </Box>
        ))}
        {availability.conflicts.length > 3 && (
          <Typography variant="caption" color="text.secondary">
            +{availability.conflicts.length - 3} more conflicts
          </Typography>
        )}
      </Stack>
    );
  };

  const renderDetailedTooltip = () => (
    <Stack spacing={2} sx={{ p: 1 }}>
      <Box>
        <Typography variant="subtitle2" fontWeight="bold">
          {format(parseISO(availability.date), 'EEEE, MMMM d, yyyy')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {AvailabilityUtils.getStatusLabel(availability.status)}
        </Typography>
      </Box>

      {availability.total_events_count > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary">
            Events on this date:
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
            {availability.confirmed_events_count > 0 && (
              <Chip
                label={`${availability.confirmed_events_count} Confirmed`}
                color="error"
                size="small"
                variant="outlined"
              />
            )}
            {availability.lead_events_count > 0 && (
              <Chip
                label={`${availability.lead_events_count} Leads`}
                color="warning"
                size="small"
                variant="outlined"
              />
            )}
          </Stack>
        </Box>
      )}

      {availability.reasons.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary">
            Restrictions:
          </Typography>
          <Stack spacing={0.5} sx={{ mt: 0.5 }}>
            {availability.reasons.map((reason, index) => (
              <Typography key={index} variant="body2" color="error.main">
                • {reason}
              </Typography>
            ))}
          </Stack>
        </Box>
      )}

      {availability.buffer_conflicts.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary">
            Buffer Conflicts:
          </Typography>
          <Typography variant="body2" color="warning.main">
            {availability.buffer_conflicts.length} buffer time conflicts
          </Typography>
        </Box>
      )}

      {availability.next_available_date && !availability.can_book_event && (
        <Box>
          <Typography variant="caption" color="text.secondary">
            Next Available:
          </Typography>
          <Typography variant="body2" color="success.main">
            {format(parseISO(availability.next_available_date), 'MMM d, yyyy')}
          </Typography>
        </Box>
      )}
    </Stack>
  );

  if (compact) {
    return (
      <Tooltip title={renderDetailedTooltip()} arrow placement="top">
        <Box
          sx={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: indicator.color,
            border: availability.can_book_event ? 'none' : `2px solid ${theme.palette.error.main}`,
            cursor: interactive ? 'pointer' : 'default',
            '&:hover': interactive ? {
              transform: 'scale(1.2)',
              transition: 'transform 0.2s',
            } : {},
          }}
          onClick={onClick}
        />
      </Tooltip>
    );
  }

  const content = (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} alignItems="center">
        {getStatusChip()}
        {availability.total_events_count > 0 && (
          <Chip
            icon={<EventIcon />}
            label={`${availability.total_events_count} events`}
            size="small"
            variant="outlined"
            color="default"
          />
        )}
      </Stack>

      {!availability.can_book_event && availability.can_create_lead && (
        <Typography variant="caption" color="warning.main">
          ⚠️ Leads only - confirmed events exist
        </Typography>
      )}

      {!availability.can_book_event && !availability.can_create_lead && (
        <Typography variant="caption" color="error.main">
          ❌ Not available for booking or leads
        </Typography>
      )}

      {renderConflictDetails()}
    </Stack>
  );

  if (showDetails) {
    return (
      <Paper
        elevation={1}
        sx={{
          p: 2,
          cursor: interactive ? 'pointer' : 'default',
          '&:hover': interactive ? {
            elevation: 2,
            backgroundColor: alpha(theme.palette.primary.main, 0.02),
          } : {},
        }}
        onClick={onClick}
      >
        {content}
      </Paper>
    );
  }

  return (
    <Tooltip title={renderDetailedTooltip()} arrow placement="top">
      <Box
        sx={{
          cursor: interactive ? 'pointer' : 'default',
          display: 'inline-block',
        }}
        onClick={onClick}
      >
        {content}
      </Box>
    </Tooltip>
  );
};

// Specialized components for different use cases

interface AvailabilityBadgeProps {
  availability: DateAvailabilityInfo;
  size?: 'small' | 'medium' | 'large';
}

export const AvailabilityBadge: React.FC<AvailabilityBadgeProps> = ({
  availability,
  size = 'medium',
}) => {
  const indicator = AvailabilityUtils.getAvailabilityIndicator(availability);
  const theme = useTheme();

  const sizeMap = {
    small: { width: 8, height: 8 },
    medium: { width: 12, height: 12 },
    large: { width: 16, height: 16 },
  };

  return (
    <Tooltip title={indicator.tooltip} arrow>
      <Box
        sx={{
          ...sizeMap[size],
          borderRadius: '50%',
          backgroundColor: indicator.color,
          border: availability.can_book_event 
            ? 'none' 
            : `1px solid ${theme.palette.error.main}`,
          flexShrink: 0,
        }}
      />
    </Tooltip>
  );
};

interface AvailabilityStatsProps {
  availability: DateAvailabilityInfo[];
}

export const AvailabilityStats: React.FC<AvailabilityStatsProps> = ({
  availability,
}) => {
  const stats = AvailabilityUtils.generateAvailabilitySummary(availability);

  return (
    <Stack spacing={1}>
      <Typography variant="h6">{stats.summary}</Typography>
      {stats.details && (
        <Typography variant="body2" color="text.secondary">
          {stats.details}
        </Typography>
      )}
      <Stack direction="row" spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: AvailabilityUtils.getStatusColor('available'),
            }}
          />
          <Typography variant="body2">{stats.stats.available} Available</Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: AvailabilityUtils.getStatusColor('partially_booked'),
            }}
          />
          <Typography variant="body2">{stats.stats.partiallyBooked} Partial</Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: AvailabilityUtils.getStatusColor('fully_booked'),
            }}
          />
          <Typography variant="body2">{stats.stats.fullyBooked} Booked</Typography>
        </Stack>
        {stats.stats.blocked > 0 && (
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: AvailabilityUtils.getStatusColor('blocked'),
              }}
            />
            <Typography variant="body2">{stats.stats.blocked} Blocked</Typography>
          </Stack>
        )}
      </Stack>
    </Stack>
  );
};