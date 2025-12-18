// frontend/admin-crm/src/pages/analytics/tabs/OperationsReportsTab.tsx
import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  LinearProgress,
} from '@mui/material';

import { VenueChart, PlaceholderCard } from '../../../components/analytics';
import { useVenueUsage, useCalendarUtilization } from '../../../hooks/useAnalytics';
import type { DateRange } from '../../../types/analytics.types';

interface OperationsReportsTabProps {
  dateRange: DateRange;
}

export const OperationsReportsTab: React.FC<OperationsReportsTabProps> = ({ dateRange }) => {
  const { data: venues, isLoading: venuesLoading } = useVenueUsage(dateRange);
  const { data: calendar, isLoading: calendarLoading } = useCalendarUtilization(dateRange);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
    }).format(value);

  // Find max values for progress bars
  const maxMonthlyBookings = Math.max(...(calendar?.by_month?.map((m) => m.booking_count) || [1]));
  const maxDailyBookings = Math.max(
    ...(calendar?.by_day_of_week?.map((d) => d.booking_count) || [1])
  );

  return (
    <Box>
      {/* Venue Usage */}
      <Box mb={4}>
        <Typography variant="h6" mb={2}>
          Venue Usage
        </Typography>
        <VenueChart data={venues || []} isLoading={venuesLoading} />

        {!venuesLoading && venues && venues.length > 0 && (
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Venue</TableCell>
                  <TableCell align="right">Bookings</TableCell>
                  <TableCell align="right">Confirmed</TableCell>
                  <TableCell align="right">Completed</TableCell>
                  <TableCell align="right">Revenue</TableCell>
                  <TableCell align="right">Utilization</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {venues.map((venue) => (
                  <TableRow key={venue.venue_id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {venue.venue_name}
                      </Typography>
                      {venue.venue_code && (
                        <Typography variant="caption" color="text.secondary">
                          {venue.venue_code}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">{venue.booking_count}</TableCell>
                    <TableCell align="right">{venue.confirmed_count}</TableCell>
                    <TableCell align="right">{venue.completed_count}</TableCell>
                    <TableCell align="right">{formatCurrency(venue.total_revenue)}</TableCell>
                    <TableCell align="right">{venue.utilization_percentage}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Calendar Utilization */}
      <Box mb={4}>
        <Typography variant="h6" mb={2}>
          Calendar Utilization
        </Typography>

        <Box display="flex" gap={3} flexWrap="wrap">
          {/* By Month */}
          <Paper sx={{ p: 2, flex: '1 1 400px', minWidth: 300 }}>
            <Typography variant="subtitle2" mb={2}>
              Bookings by Month
            </Typography>
            {calendarLoading ? (
              <Skeleton variant="rectangular" height={200} />
            ) : (
              <Box>
                {calendar?.by_month?.map((month) => (
                  <Box key={month.month} display="flex" alignItems="center" gap={2} mb={1.5}>
                    <Typography variant="body2" sx={{ minWidth: 80 }}>
                      {month.month_name?.substring(0, 3)}
                    </Typography>
                    <Box flex={1}>
                      <LinearProgress
                        variant="determinate"
                        value={(month.booking_count / maxMonthlyBookings) * 100}
                        sx={{
                          height: 20,
                          borderRadius: 1,
                          backgroundColor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor:
                              month.booking_count === maxMonthlyBookings
                                ? 'success.main'
                                : 'primary.main',
                          },
                        }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ minWidth: 30, textAlign: 'right' }}>
                      {month.booking_count}
                    </Typography>
                  </Box>
                ))}
                {(!calendar?.by_month || calendar.by_month.length === 0) && (
                  <Typography color="text.secondary" textAlign="center">
                    No monthly data available
                  </Typography>
                )}
              </Box>
            )}
          </Paper>

          {/* By Day of Week */}
          <Paper sx={{ p: 2, flex: '1 1 400px', minWidth: 300 }}>
            <Typography variant="subtitle2" mb={2}>
              Bookings by Day of Week
            </Typography>
            {calendarLoading ? (
              <Skeleton variant="rectangular" height={200} />
            ) : (
              <Box>
                {calendar?.by_day_of_week?.map((day) => (
                  <Box key={day.day_of_week} display="flex" alignItems="center" gap={2} mb={1.5}>
                    <Typography variant="body2" sx={{ minWidth: 80 }}>
                      {day.day_name?.substring(0, 3)}
                    </Typography>
                    <Box flex={1}>
                      <LinearProgress
                        variant="determinate"
                        value={(day.booking_count / maxDailyBookings) * 100}
                        sx={{
                          height: 20,
                          borderRadius: 1,
                          backgroundColor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor:
                              day.booking_count === maxDailyBookings
                                ? 'success.main'
                                : 'info.main',
                          },
                        }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ minWidth: 30, textAlign: 'right' }}>
                      {day.booking_count}
                    </Typography>
                  </Box>
                ))}
                {(!calendar?.by_day_of_week || calendar.by_day_of_week.length === 0) && (
                  <Typography color="text.secondary" textAlign="center">
                    No daily data available
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
        </Box>
      </Box>

      {/* Placeholders */}
      <Box display="flex" gap={2} flexWrap="wrap">
        <Box flex="1 1 300px">
          <PlaceholderCard title="Kitchen Usage" />
        </Box>
        <Box flex="1 1 300px">
          <PlaceholderCard title="Inventory Reports" />
        </Box>
        <Box flex="1 1 300px">
          <PlaceholderCard title="App Engagement" />
        </Box>
      </Box>
    </Box>
  );
};

export default OperationsReportsTab;
