// frontend/client-portal/src/components/common/TimezoneDisplay.tsx

import React from 'react';
import { Box, Typography, Chip, Alert, Tooltip, Stack } from '@mui/material';
import { AccessTime, Public, Info } from '@mui/icons-material';
import {
  formatPhilippinesTime,
  getSimplePhilippinesTime,
  getTimezoneNotice,
  BUSINESS_TIMEZONE_DISPLAY,
  BUSINESS_TIMEZONE_FULL,
} from '../../utils/timezone';

interface TimezoneDisplayProps {
  date: string | Date;
  variant?: 'inline' | 'banner' | 'detailed';
  context?: 'booking' | 'confirmation' | 'general';
  // Removed showUserTime - user timezone is irrelevant for bookings
}

/**
 * Component to display event time with clear Philippines timezone indication
 */
export const TimezoneDisplay: React.FC<TimezoneDisplayProps> = ({
  date,
  variant = 'inline',
  context = 'general',
}) => {
  const philippinesTime = getSimplePhilippinesTime(date);
  const notice = getTimezoneNotice(context);

  if (variant === 'banner') {
    return (
      <Alert
        severity="info"
        icon={<Public />}
        sx={{
          mb: 2,
          '& .MuiAlert-message': {
            width: '100%',
          },
        }}
      >
        <Typography variant="body2" fontWeight="medium">
          {notice}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          Please select your preferred date and time in Philippines timezone.
        </Typography>
      </Alert>
    );
  }

  if (variant === 'detailed') {
    return (
      <Box
        sx={{
          p: 2,
          bgcolor: 'primary.50',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'primary.200',
        }}
      >
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <AccessTime color="primary" />
            <Typography variant="h6" color="primary.main">
              Event Time
            </Typography>
            <Chip
              label={BUSINESS_TIMEZONE_DISPLAY}
              size="small"
              color="primary"
              variant="outlined"
            />
          </Stack>

          <Typography variant="body1" fontWeight="medium">
            {philippinesTime}
          </Typography>

          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Info fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary">
              {notice}
            </Typography>
          </Stack>
        </Stack>
      </Box>
    );
  }

  // Default inline variant
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <AccessTime fontSize="small" color="action" />
      <Typography variant="body1">{formatPhilippinesTime(date)}</Typography>
      <Tooltip title={`${BUSINESS_TIMEZONE_FULL} (UTC+8)`}>
        <Chip
          label={BUSINESS_TIMEZONE_DISPLAY}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ height: 20, fontSize: '0.75rem' }}
        />
      </Tooltip>
      {/* Removed user time display - only show Philippines time */}
    </Stack>
  );
};

/**
 * Persistent timezone notice banner for booking flows
 */
export const TimezoneNoticeBanner: React.FC<{
  context?: 'booking' | 'confirmation' | 'general';
}> = ({ context = 'booking' }) => {
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed) return null;

  return (
    <Alert
      severity="info"
      icon={<Public />}
      onClose={() => setDismissed(true)}
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        borderRadius: 0,
        '& .MuiAlert-message': {
          width: '100%',
        },
      }}
    >
      <Typography variant="body2" fontWeight="medium">
        {getTimezoneNotice(context)}
      </Typography>
    </Alert>
  );
};

/**
 * Small timezone badge for inline display
 */
export const TimezoneBadge: React.FC = () => {
  return (
    <Tooltip title={`All times in ${BUSINESS_TIMEZONE_FULL} (UTC+8)`}>
      <Chip
        label={BUSINESS_TIMEZONE_DISPLAY}
        size="small"
        color="primary"
        icon={<Public fontSize="small" />}
        sx={{
          height: 24,
          fontSize: '0.75rem',
          fontWeight: 600,
        }}
      />
    </Tooltip>
  );
};
