import React from 'react';
import { Box, Typography, LinearProgress, Skeleton, alpha, useTheme } from '@mui/material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import { formatCurrency } from './useAnalyticsDashboardLogic';
import type { ChartDataPoint } from './useAnalyticsDashboardLogic';

interface SpendingTrendChartProps {
  chartData: ChartDataPoint[];
  isLoading: boolean;
  isRefreshing: boolean;
}

export const SpendingTrendChart: React.FC<SpendingTrendChartProps> = ({
  chartData,
  isLoading,
  isRefreshing,
}) => {
  const theme = useTheme();

  return (
    <Box>
      <AnimatedElement animation="slideUp" delay={400}>
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
          <Box
            sx={{
              mb: 3,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Spending Trend
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your payment history over time
              </Typography>
            </Box>
          </Box>

          <Box sx={{ height: 300, position: 'relative' }}>
            {(isRefreshing || isLoading) && (
              <LinearProgress
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: alpha('#fff', 0.1),
                }}
              />
            )}
            {isLoading ? (
              <Skeleton variant="rectangular" height={280} />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="amountGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.3} />
                      <stop
                        offset="95%"
                        stopColor={theme.palette.primary.main}
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha('#fff', 0.1)} />
                  <XAxis dataKey="name" stroke={alpha('#fff', 0.6)} fontSize={12} />
                  <YAxis
                    stroke={alpha('#fff', 0.6)}
                    fontSize={12}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: alpha('#fff', 0.95),
                      backdropFilter: 'blur(20px)',
                      border: `1px solid ${alpha('#fff', 0.2)}`,
                      borderRadius: 12,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                    }}
                    formatter={(value) => [formatCurrency(Number(value)), 'Amount']}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke={theme.palette.primary.main}
                    strokeWidth={3}
                    fill="url(#amountGradient)"
                    name="Amount"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Box
                sx={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography color="text.secondary">No spending data available yet</Typography>
              </Box>
            )}
          </Box>
        </GlassCard>
      </AnimatedElement>
    </Box>
  );
};
