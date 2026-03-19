import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Skeleton,
  alpha,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { Event as EventIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import type { ClientEventHistory } from '@/types/analytics.types';
import { formatCurrency, getStatusColor } from './useAnalyticsDashboardLogic';

interface RecentEventsTableProps {
  eventHistory: ClientEventHistory[] | undefined;
  isLoading: boolean;
}

export const RecentEventsTable: React.FC<RecentEventsTableProps> = ({
  eventHistory,
  isLoading,
}) => {
  const theme = useTheme();

  return (
    <Box>
      <AnimatedElement animation="slideUp" delay={600}>
        <GlassCard
          variant="light"
          intensity="medium"
          sx={{
            p: 3,
            backgroundColor: alpha('#fff', 0.08),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha('#fff', 0.1)}`,
          }}
        >
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Recent Events
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your latest event history
            </Typography>
          </Box>

          {isLoading ? (
            <Skeleton variant="rectangular" height={200} />
          ) : eventHistory && eventHistory.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Event</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="right">Paid</TableCell>
                    <TableCell align="right">Balance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {eventHistory.map((event) => (
                    <TableRow key={event.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {event.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {event.event_type} - {event.venue}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {new Date(event.start_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={event.status_display}
                          size="small"
                          sx={{
                            backgroundColor: alpha(
                              getStatusColor(event.status, theme.palette),
                              0.1,
                            ),
                            color: getStatusColor(event.status, theme.palette),
                            fontWeight: 500,
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">{formatCurrency(event.total_price)}</TableCell>
                      <TableCell align="right">
                        <Typography color="success.main">
                          {formatCurrency(event.amount_paid)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {event.amount_pending > 0 ? (
                          <Typography color="warning.main">
                            {formatCurrency(event.amount_pending)}
                          </Typography>
                        ) : (
                          <CheckCircleIcon fontSize="small" color="success" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box
              sx={{
                py: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <EventIcon sx={{ fontSize: 48, opacity: 0.3 }} />
              <Typography color="text.secondary" align="center">
                No events yet
              </Typography>
            </Box>
          )}
        </GlassCard>
      </AnimatedElement>
    </Box>
  );
};
