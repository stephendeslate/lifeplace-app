import React from 'react';
import {
  Box,
  Typography,
  Stack,
  Paper,
  Breadcrumbs,
  Link,
  IconButton,
  Button,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Share as ShareIcon,
  Settings as SettingsIcon,
  CalendarToday as CalendarIcon,
  Payment as PaymentIcon,
} from '@mui/icons-material';
import { EventStatusBadge, EventCountdown, ContractStatusChip } from '@/components/events';
import { formatPhilippinesTime } from '@/utils/timezone';

interface EventDetailHeaderProps {
  event: {
    name: string;
    event_type_name: string;
    status: string;
    payment_status?: string;
    contract_status: string;
    has_contracts: boolean;
    contracts_count: number;
    pending_signature_required: boolean;
    contract_expiry_days?: number;
    start_date?: string;
    end_date?: string;
    current_stage?: { name: string };
    total_price?: number;
    days_until_event?: number | null;
  };
  formatAmount: (amount: number) => string;
  onBack: () => void;
  onPreferencesOpen: () => void;
}

export const EventDetailHeader: React.FC<EventDetailHeaderProps> = ({
  event,
  formatAmount,
  onBack,
  onPreferencesOpen,
}) => {
  const theme = useTheme();

  return (
    <>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component="button" variant="body2" onClick={onBack} sx={{ textDecoration: 'none' }}>
          Events
        </Link>
        <Typography variant="body2" color="text.primary">
          {event.name}
        </Typography>
      </Breadcrumbs>

      <Paper
        sx={{
          p: 3,
          mb: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={3}
        >
          <Box flex={1}>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <IconButton onClick={onBack} size="small" aria-label="Back to events">
                <BackIcon />
              </IconButton>
              <Typography variant="h4" component="h1">
                {event.name}
              </Typography>
            </Stack>

            <Typography variant="h6" color="text.secondary" gutterBottom>
              {event.event_type_name}
            </Typography>

            <Stack direction="row" spacing={2} flexWrap="wrap" gap={1} mb={2}>
              <EventStatusBadge status={event.status} />
              {event.payment_status && (
                <Chip
                  icon={<PaymentIcon fontSize="small" />}
                  label={event.payment_status.replace('_', ' ')}
                  color={
                    event.payment_status === 'PAID'
                      ? 'success'
                      : event.payment_status === 'OVERDUE'
                        ? 'error'
                        : event.payment_status === 'PARTIAL'
                          ? 'warning'
                          : 'default'
                  }
                  variant="outlined"
                />
              )}
              <ContractStatusChip
                status={event.contract_status}
                hasContracts={event.has_contracts}
                contractsCount={event.contracts_count}
                pendingSignatureRequired={event.pending_signature_required}
                contractExpiryDays={event.contract_expiry_days}
                size="medium"
                showCount={true}
              />
            </Stack>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {event.start_date && (
                <Box
                  sx={(theme) => ({
                    flexGrow: 0,
                    flexBasis: {
                      xs: '100%',
                      sm: `calc(50% - ${theme.spacing(1)})`,
                    },
                  })}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CalendarIcon fontSize="small" color="action" />
                    <Typography variant="body1">
                      {formatPhilippinesTime(event.start_date, false, 'EEEE, MMMM dd, yyyy')}
                      {event.end_date &&
                        formatPhilippinesTime(event.start_date, false, 'yyyy-MM-dd') !==
                          formatPhilippinesTime(event.end_date, false, 'yyyy-MM-dd') &&
                        ` - ${formatPhilippinesTime(event.end_date, false, 'MMMM dd, yyyy')}`}
                    </Typography>
                  </Stack>
                </Box>
              )}

              {event.current_stage && (
                <Box
                  sx={(theme) => ({
                    flexGrow: 0,
                    flexBasis: {
                      xs: '100%',
                      sm: `calc(50% - ${theme.spacing(1)})`,
                    },
                  })}
                >
                  <Typography variant="body1">
                    <strong>Current Stage:</strong> {event.current_stage.name}
                  </Typography>
                </Box>
              )}

              {event.total_price && (
                <Box
                  sx={(theme) => ({
                    flexGrow: 0,
                    flexBasis: {
                      xs: '100%',
                      sm: `calc(50% - ${theme.spacing(1)})`,
                    },
                  })}
                >
                  <Typography variant="body1">
                    <strong>Total Price:</strong> {formatAmount(event.total_price)}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          <Stack spacing={2} alignItems="center">
            {event.days_until_event !== null && event.days_until_event !== undefined && (
              <EventCountdown daysUntil={event.days_until_event} />
            )}

            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={onPreferencesOpen}
                size="small"
              >
                Preferences
              </Button>
              <IconButton aria-label="Share event" size="small">
                <ShareIcon />
              </IconButton>
            </Stack>
          </Stack>
        </Stack>
      </Paper>
    </>
  );
};
