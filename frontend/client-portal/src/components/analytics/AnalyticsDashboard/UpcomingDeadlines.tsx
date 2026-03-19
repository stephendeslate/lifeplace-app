import React from 'react';
import { Box, Typography, Avatar, Stack, Skeleton, alpha, useTheme } from '@mui/material';
import {
  Event as EventIcon,
  Payment as PaymentIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import type { ClientDeadline } from '@/types/analytics.types';
import { formatCurrency } from './useAnalyticsDashboardLogic';

interface UpcomingDeadlinesProps {
  deadlines: ClientDeadline[] | undefined;
  isLoading: boolean;
}

const getDeadlineIcon = (type: string) => {
  switch (type) {
    case 'payment':
      return <PaymentIcon fontSize="small" />;
    case 'event':
      return <EventIcon fontSize="small" />;
    case 'contract':
      return <AccessTimeIcon fontSize="small" />;
    default:
      return <ScheduleIcon fontSize="small" />;
  }
};

export const UpcomingDeadlines: React.FC<UpcomingDeadlinesProps> = ({ deadlines, isLoading }) => {
  const theme = useTheme();

  return (
    <Box>
      <AnimatedElement animation="slideUp" delay={500}>
        <GlassCard
          variant="light"
          intensity="medium"
          sx={{
            p: 3,
            backgroundColor: alpha('#fff', 0.08),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha('#fff', 0.1)}`,
            height: '100%',
          }}
        >
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Upcoming Deadlines
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Next 30 days
            </Typography>
          </Box>

          {isLoading ? (
            <Stack spacing={2}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rectangular" height={60} />
              ))}
            </Stack>
          ) : deadlines && deadlines.length > 0 ? (
            <Stack spacing={2} sx={{ maxHeight: 280, overflow: 'auto' }}>
              {deadlines.slice(0, 5).map((deadline, index) => (
                <Box
                  key={index}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: alpha(
                      deadline.urgency === 'high'
                        ? theme.palette.error.main
                        : theme.palette.primary.main,
                      0.1,
                    ),
                    border: `1px solid ${alpha(
                      deadline.urgency === 'high'
                        ? theme.palette.error.main
                        : theme.palette.primary.main,
                      0.2,
                    )}`,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        backgroundColor: alpha(
                          deadline.urgency === 'high'
                            ? theme.palette.error.main
                            : theme.palette.primary.main,
                          0.2,
                        ),
                        color:
                          deadline.urgency === 'high'
                            ? theme.palette.error.main
                            : theme.palette.primary.main,
                      }}
                    >
                      {getDeadlineIcon(deadline.type)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {deadline.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(deadline.due_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Typography>
                      {deadline.amount && (
                        <Typography
                          variant="caption"
                          sx={{ display: 'block', fontWeight: 600, mt: 0.5 }}
                        >
                          {formatCurrency(deadline.amount)}
                        </Typography>
                      )}
                    </Box>
                    {deadline.urgency === 'high' && <WarningIcon fontSize="small" color="error" />}
                  </Box>
                </Box>
              ))}
            </Stack>
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
              <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', opacity: 0.5 }} />
              <Typography color="text.secondary" align="center">
                No upcoming deadlines
              </Typography>
            </Box>
          )}
        </GlassCard>
      </AnimatedElement>
    </Box>
  );
};
