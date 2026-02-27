// Communications Analytics Tab
// Shows delivery metrics, open rates, and failure tracking for email/SMS

import React from 'react';
import { Box, Typography, Skeleton, Stack, Chip } from '@mui/material';
import {
  Email as EmailIcon,
  Sms as SmsIcon,
  CheckCircle as DeliveredIcon,
  Error as FailedIcon,
  Visibility as OpenedIcon,
  Send as SentIcon,
} from '@mui/icons-material';
import { ModernCard } from '../../../components/common/ModernCard';
import { KPICard, KPIGrid } from '../../../components/analytics';
import { useCommunications } from '../../../hooks/useCommunications';
import type { DateRange } from '../../../types/analytics.types';

interface CommunicationsTabProps {
  dateRange: DateRange;
}

export const CommunicationsTab: React.FC<CommunicationsTabProps> = ({ dateRange }) => {
  const { useAnalytics } = useCommunications();
  const { data: analytics, isLoading } = useAnalytics(
    undefined,
    30,
    dateRange.startDate,
    dateRange.endDate,
  );

  return (
    <Stack spacing={3}>
      {/* KPI Cards */}
      <KPIGrid>
        <KPICard
          title="Total Sent"
          value={analytics?.total_sent ?? 0}
          isLoading={isLoading}
          color="primary"
        />
        <KPICard
          title="Delivered"
          value={analytics?.delivered ?? 0}
          isLoading={isLoading}
          color="success"
        />
        <KPICard title="Opened" value={analytics?.opened ?? 0} isLoading={isLoading} color="info" />
        <KPICard
          title="Failed"
          value={analytics?.failed ?? 0}
          isLoading={isLoading}
          color="error"
        />
      </KPIGrid>

      {/* Rate Cards */}
      <ModernCard>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Performance Rates
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Delivery and engagement metrics for the selected period
          </Typography>

          {isLoading ? (
            <Stack spacing={2}>
              <Skeleton variant="rectangular" height={60} />
              <Skeleton variant="rectangular" height={60} />
              <Skeleton variant="rectangular" height={60} />
            </Stack>
          ) : (
            <Stack spacing={2}>
              {/* Delivery Rate */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  bgcolor: 'success.50',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'success.200',
                }}
              >
                <DeliveredIcon color="success" />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={600}>
                    Delivery Rate
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {analytics?.delivered ?? 0} of {analytics?.total_sent ?? 0} communications
                    delivered successfully
                  </Typography>
                </Box>
                <Chip
                  label={`${analytics?.delivery_rate?.toFixed(1) ?? 0}%`}
                  color="success"
                  size="small"
                />
              </Box>

              {/* Open Rate */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  bgcolor: 'info.50',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'info.200',
                }}
              >
                <OpenedIcon color="info" />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={600}>
                    Open Rate
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {analytics?.opened ?? 0} of {analytics?.delivered ?? 0} delivered communications
                    opened
                  </Typography>
                </Box>
                <Chip
                  label={`${analytics?.open_rate?.toFixed(1) ?? 0}%`}
                  color="info"
                  size="small"
                />
              </Box>

              {/* Failure Rate */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  bgcolor: (analytics?.failure_rate ?? 0) > 5 ? 'error.50' : 'grey.50',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: (analytics?.failure_rate ?? 0) > 5 ? 'error.200' : 'grey.200',
                }}
              >
                <FailedIcon color={(analytics?.failure_rate ?? 0) > 5 ? 'error' : 'action'} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={600}>
                    Failure Rate
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {analytics?.failed ?? 0} of {analytics?.total_sent ?? 0} communications failed
                    to deliver
                  </Typography>
                </Box>
                <Chip
                  label={`${analytics?.failure_rate?.toFixed(1) ?? 0}%`}
                  color={(analytics?.failure_rate ?? 0) > 5 ? 'error' : 'default'}
                  size="small"
                />
              </Box>
            </Stack>
          )}
        </Box>
      </ModernCard>

      {/* Summary */}
      {!isLoading && analytics && (
        <ModernCard>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Period Summary
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {dateRange.startDate} to {dateRange.endDate}
            </Typography>

            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1.5,
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                  flex: 1,
                  minWidth: 200,
                }}
              >
                <SentIcon color="primary" fontSize="small" />
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {analytics.total_sent}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Sent
                  </Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1.5,
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                  flex: 1,
                  minWidth: 200,
                }}
              >
                <EmailIcon color="primary" fontSize="small" />
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {analytics.delivery_rate?.toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Overall Delivery Rate
                  </Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1.5,
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                  flex: 1,
                  minWidth: 200,
                }}
              >
                <SmsIcon color="primary" fontSize="small" />
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {analytics.open_rate?.toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Message Open Rate
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </Box>
        </ModernCard>
      )}
    </Stack>
  );
};
