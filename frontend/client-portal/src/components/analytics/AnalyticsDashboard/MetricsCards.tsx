import React, { useMemo } from 'react';
import { Box, Typography, Avatar, Skeleton, alpha, useTheme } from '@mui/material';
import {
  Event as EventIcon,
  Payment as PaymentIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import type { ClientDashboard } from '@/types/analytics.types';
import { formatCurrency } from './useAnalyticsDashboardLogic';
import type { AnalyticsMetric } from './useAnalyticsDashboardLogic';

interface MetricsCardsProps {
  dashboard: ClientDashboard | undefined;
  isLoading: boolean;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({ dashboard, isLoading }) => {
  const theme = useTheme();

  const metrics: AnalyticsMetric[] = useMemo(() => {
    if (!dashboard) return [];

    return [
      {
        id: 'total-events',
        title: 'Total Events',
        value: String(dashboard.events.total),
        subtitle: `${dashboard.events.upcoming} upcoming`,
        icon: <EventIcon fontSize="small" />,
        color: theme.palette.primary.main,
      },
      {
        id: 'total-spent',
        title: 'Total Spent',
        value: formatCurrency(dashboard.financials.total_spent),
        subtitle: 'completed payments',
        icon: <MoneyIcon fontSize="small" />,
        color: theme.palette.success.main,
      },
      {
        id: 'pending-payments',
        title: 'Pending Payments',
        value: formatCurrency(dashboard.financials.pending_amount),
        subtitle:
          dashboard.financials.overdue_count > 0
            ? `${dashboard.financials.overdue_count} overdue`
            : 'all on track',
        icon: <PaymentIcon fontSize="small" />,
        color:
          dashboard.financials.overdue_count > 0
            ? theme.palette.error.main
            : theme.palette.warning.main,
      },
      {
        id: 'upcoming-due',
        title: 'Due Soon',
        value: formatCurrency(dashboard.financials.upcoming_amount),
        subtitle: `${dashboard.financials.upcoming_count} payments in 30 days`,
        icon: <ScheduleIcon fontSize="small" />,
        color: theme.palette.info.main,
      },
    ];
  }, [dashboard, theme]);

  return (
    <AnimatedElement animation="slideUp" delay={200}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 3,
          mb: 4,
        }}
      >
        {isLoading
          ? [...Array(4)].map((_, index) => (
              <Skeleton key={index} variant="rectangular" height={140} sx={{ borderRadius: 2 }} />
            ))
          : metrics.map((metric, index) => (
              <AnimatedElement key={metric.id} animation="slideUp" delay={200 + index * 50}>
                <GlassCard
                  variant="light"
                  intensity="medium"
                  hover
                  sx={{
                    p: 3,
                    height: '100%',
                    backgroundColor: alpha('#fff', 0.08),
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${alpha('#fff', 0.1)}`,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      mb: 2,
                    }}
                  >
                    <Avatar
                      sx={{
                        backgroundColor: alpha(metric.color, 0.15),
                        color: metric.color,
                        width: 48,
                        height: 48,
                      }}
                    >
                      {metric.icon}
                    </Avatar>
                  </Box>

                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {metric.value}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    {metric.title}
                  </Typography>

                  {metric.subtitle && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mt: 0.5 }}
                    >
                      {metric.subtitle}
                    </Typography>
                  )}
                </GlassCard>
              </AnimatedElement>
            ))}
      </Box>
    </AnimatedElement>
  );
};
