// frontend/admin-crm/src/pages/analytics/tabs/SalesReportsTab.tsx
import React, { useState } from 'react';
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
  ToggleButton,
  ToggleButtonGroup,
  Button,
  Skeleton,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';

import { KPICard, RevenueChart, PipelineChart } from '../../../components/analytics';
import {
  useBookingsSummary,
  useReservationPipeline,
  useRevenueByType,
  usePaymentTracking,
  exportBookingsSummary,
  exportRevenueReport,
} from '../../../hooks/useAnalytics';
import type { DateRange, PeriodType } from '../../../types/analytics.types';

interface SalesReportsTabProps {
  dateRange: DateRange;
}

export const SalesReportsTab: React.FC<SalesReportsTabProps> = ({ dateRange }) => {
  const [period, setPeriod] = useState<PeriodType>('daily');

  const { data: bookings, isLoading: bookingsLoading } = useBookingsSummary(dateRange, period);
  const { data: pipeline, isLoading: pipelineLoading } = useReservationPipeline(dateRange);
  const { data: revenue, isLoading: revenueLoading } = useRevenueByType(dateRange);
  const { data: payments, isLoading: paymentsLoading } = usePaymentTracking(dateRange);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
    }).format(value);

  const handleExportBookings = async () => {
    try {
      await exportBookingsSummary(dateRange, period, 'csv');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleExportRevenue = async () => {
    try {
      await exportRevenueReport(dateRange, 'csv');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <Box>
      {/* Bookings Summary */}
      <Box mb={4}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Bookings Summary</Typography>
          <Box display="flex" gap={2}>
            <ToggleButtonGroup
              value={period}
              exclusive
              onChange={(_, value) => value && setPeriod(value)}
              size="small"
            >
              <ToggleButton value="daily">Daily</ToggleButton>
              <ToggleButton value="weekly">Weekly</ToggleButton>
              <ToggleButton value="monthly">Monthly</ToggleButton>
            </ToggleButtonGroup>
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={handleExportBookings}
            >
              Export
            </Button>
          </Box>
        </Box>
        <RevenueChart
          data={bookings || []}
          isLoading={bookingsLoading}
          title="Revenue Trend"
        />
      </Box>

      {/* Pipeline */}
      <Box mb={4}>
        <Typography variant="h6" mb={2}>
          Reservation Pipeline
        </Typography>
        <PipelineChart data={pipeline || []} isLoading={pipelineLoading} />
      </Box>

      {/* Payment Tracking */}
      <Box mb={4}>
        <Typography variant="h6" mb={2}>
          Payment Tracking
        </Typography>
        <Box
          display="flex"
          gap={2}
          sx={{
            flexWrap: 'wrap',
            '& > *': {
              flex: '1 1 180px',
              minWidth: 180,
            },
          }}
        >
          <KPICard
            title="Total Payments"
            value={payments?.total_payments ?? 0}
            isLoading={paymentsLoading}
            color="primary"
          />
          <KPICard
            title="Completed"
            value={formatCurrency(payments?.completed_amount ?? 0)}
            isLoading={paymentsLoading}
            color="success"
          />
          <KPICard
            title="Pending"
            value={formatCurrency(payments?.pending_amount ?? 0)}
            isLoading={paymentsLoading}
            color="warning"
          />
          <KPICard
            title="Overdue"
            value={`${payments?.overdue_count ?? 0} (${formatCurrency(payments?.overdue_amount ?? 0)})`}
            isLoading={paymentsLoading}
            color="error"
          />
        </Box>
      </Box>

      {/* Revenue by Type */}
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Revenue by Package/Product</Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={handleExportRevenue}
          >
            Export
          </Button>
        </Box>
        {revenueLoading ? (
          <Skeleton variant="rectangular" height={300} />
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Bookings</TableCell>
                  <TableCell align="right">Participants</TableCell>
                  <TableCell align="right">Revenue</TableCell>
                  <TableCell align="right">Avg. Revenue</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {revenue?.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell align="right">{item.booking_count}</TableCell>
                    <TableCell align="right">{item.total_participants}</TableCell>
                    <TableCell align="right">{formatCurrency(item.total_revenue)}</TableCell>
                    <TableCell align="right">{formatCurrency(item.avg_revenue)}</TableCell>
                  </TableRow>
                ))}
                {(!revenue || revenue.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No data available for the selected period
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  );
};

export default SalesReportsTab;
