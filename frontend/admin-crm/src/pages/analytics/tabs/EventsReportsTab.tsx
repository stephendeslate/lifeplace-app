// frontend/admin-crm/src/pages/analytics/tabs/EventsReportsTab.tsx
import React from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Rating,
  Skeleton,
  LinearProgress,
} from '@mui/material';
import { ModernCard } from '../../../components/common/ModernCard';

import { KPICard, KPIGrid, PackageChart, PlaceholderCard } from '../../../components/analytics';
import {
  useEventAttendance,
  usePackagePerformance,
  useFeedbackScores,
  useEventTypeBreakdown,
} from '../../../hooks/useAnalytics';
import type { DateRange } from '../../../types/analytics.types';
import { formatCurrency } from '../../../utils/currency';

interface EventsReportsTabProps {
  dateRange: DateRange;
}

export const EventsReportsTab: React.FC<EventsReportsTabProps> = ({ dateRange }) => {
  const { data: attendance, isLoading: attendanceLoading } = useEventAttendance(dateRange);
  const { data: packages, isLoading: packagesLoading } = usePackagePerformance(dateRange);
  const { data: feedback, isLoading: feedbackLoading } = useFeedbackScores(dateRange);
  const { data: eventTypes, isLoading: eventTypesLoading } = useEventTypeBreakdown(dateRange);

  const totalGuests = attendance?.reduce((sum, item) => sum + item.total_guests, 0) ?? 0;

  return (
    <Box>
      {/* Event Attendance */}
      <Box mb={4}>
        <Typography variant="h6" mb={2}>
          Event Attendance
        </Typography>
        <KPIGrid columns={2} minCardWidth={200}>
          <KPICard
            title="Total Guests"
            value={totalGuests}
            isLoading={attendanceLoading}
            color="primary"
          />
          <KPICard
            title="Total Events"
            value={attendance?.reduce((sum, item) => sum + item.event_count, 0) ?? 0}
            isLoading={attendanceLoading}
            color="success"
          />
        </KPIGrid>

        {attendanceLoading ? (
          <Skeleton variant="rectangular" height={200} />
        ) : (
          <ModernCard variant="flat" size="medium">
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Package/Product</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Events</TableCell>
                    <TableCell align="right">Total Guests</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attendance?.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.type}</TableCell>
                      <TableCell align="right">{item.event_count}</TableCell>
                      <TableCell align="right">{item.total_guests}</TableCell>
                    </TableRow>
                  ))}
                  {(!attendance || attendance.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No attendance data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </ModernCard>
        )}
      </Box>

      {/* Package Performance */}
      <Box mb={4}>
        <Typography variant="h6" mb={2}>
          Top Packages
        </Typography>
        <PackageChart data={packages || []} isLoading={packagesLoading} />
      </Box>

      {/* Event Type Breakdown */}
      <Box mb={4}>
        <Typography variant="h6" mb={2}>
          Event Type Performance
        </Typography>
        {eventTypesLoading ? (
          <Skeleton variant="rectangular" height={200} />
        ) : (
          <ModernCard variant="flat" size="medium">
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Event Type</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="right">Confirmed</TableCell>
                    <TableCell align="right">Completed</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {eventTypes?.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.event_type}</TableCell>
                      <TableCell align="right">{item.count}</TableCell>
                      <TableCell align="right">{item.confirmed}</TableCell>
                      <TableCell align="right">{item.completed}</TableCell>
                      <TableCell align="right">{formatCurrency(item.revenue)}</TableCell>
                    </TableRow>
                  ))}
                  {(!eventTypes || eventTypes.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No event type data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </ModernCard>
        )}
      </Box>

      {/* Feedback Scores */}
      <Box mb={4}>
        <Typography variant="h6" mb={2}>
          Customer Feedback
        </Typography>
        <Box
          display="flex"
          gap={2}
          mb={2}
          sx={{
            flexWrap: 'wrap',
            '& > *': { flex: '1 1 180px', minWidth: 180 },
          }}
        >
          <KPICard
            title="Total Feedback"
            value={feedback?.total_feedback ?? 0}
            isLoading={feedbackLoading}
            color="primary"
          />
          <ModernCard variant="flat" size="small" sx={{ flex: '1 1 180px', minWidth: 180 }}>
            <Typography variant="body2" color="text.secondary" mb={1}>
              Average Rating
            </Typography>
            {feedbackLoading ? (
              <Skeleton variant="text" width="60%" height={40} />
            ) : (
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="h5" fontWeight="bold">
                  {feedback?.avg_rating?.toFixed(1) ?? 'N/A'}
                </Typography>
                <Rating value={feedback?.avg_rating ?? 0} precision={0.1} readOnly size="small" />
              </Box>
            )}
          </ModernCard>
          <KPICard
            title="Satisfaction Rate"
            value={`${feedback?.satisfaction_rate ?? 0}%`}
            subtitle="4-5 star ratings"
            isLoading={feedbackLoading}
            color="success"
          />
        </Box>

        {!feedbackLoading && feedback && feedback.total_feedback > 0 && (
          <ModernCard variant="flat" size="medium">
            <Typography variant="subtitle2" mb={2}>
              Rating Distribution
            </Typography>
            {[5, 4, 3, 2, 1].map((star) => {
              const count =
                star === 5
                  ? feedback.five_star_count
                  : star === 4
                  ? feedback.four_star_count
                  : star === 3
                  ? feedback.three_star_count
                  : star === 2
                  ? feedback.two_star_count
                  : feedback.one_star_count;
              const percentage = feedback.total_feedback > 0
                ? (count / feedback.total_feedback) * 100
                : 0;

              return (
                <Box key={star} display="flex" alignItems="center" gap={2} mb={1}>
                  <Rating value={star} readOnly size="small" max={5} />
                  <Box flex={1}>
                    <LinearProgress
                      variant="determinate"
                      value={percentage}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                  <Typography variant="body2" sx={{ minWidth: 60 }}>
                    {count} ({percentage.toFixed(0)}%)
                  </Typography>
                </Box>
              );
            })}
          </ModernCard>
        )}
      </Box>

      {/* Placeholders */}
      <Box display="flex" gap={2} flexWrap="wrap">
        <Box flex="1 1 300px">
          <PlaceholderCard title="Guest Demographics" />
        </Box>
        <Box flex="1 1 300px">
          <PlaceholderCard title="Repeat Clients & Loyalty" />
        </Box>
      </Box>
    </Box>
  );
};

export default EventsReportsTab;
