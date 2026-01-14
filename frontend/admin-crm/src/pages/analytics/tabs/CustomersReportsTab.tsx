// frontend/admin-crm/src/pages/analytics/tabs/CustomersReportsTab.tsx
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
  Button,
  Skeleton,
  Chip,
} from '@mui/material';
import { ModernCard } from '../../../components/common/ModernCard';
import DownloadIcon from '@mui/icons-material/Download';

import { KPICard, LeadSourceChart } from '../../../components/analytics';
import {
  useLeadSources,
  useConversionRates,
  useCustomerList,
  exportCustomers,
  exportLeadSources,
} from '../../../hooks/useAnalytics';
import type { DateRange } from '../../../types/analytics.types';

interface CustomersReportsTabProps {
  dateRange: DateRange;
}

export const CustomersReportsTab: React.FC<CustomersReportsTabProps> = ({ dateRange }) => {
  const { data: leadSources, isLoading: leadSourcesLoading } = useLeadSources(dateRange);
  const { data: conversion, isLoading: conversionLoading } = useConversionRates(dateRange);
  const { data: customers, isLoading: customersLoading } = useCustomerList(dateRange, 20);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
    }).format(value);

  const handleExportCustomers = async () => {
    try {
      await exportCustomers(dateRange, 'csv');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleExportLeadSources = async () => {
    try {
      await exportLeadSources(dateRange, 'csv');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <Box>
      {/* Conversion Funnel */}
      <Box mb={4}>
        <Typography variant="h6" mb={2}>
          Conversion Funnel
        </Typography>
        <Box
          display="flex"
          gap={2}
          sx={{
            flexWrap: 'wrap',
            '& > *': { flex: '1 1 180px', minWidth: 180 },
          }}
        >
          <KPICard
            title="Total Inquiries"
            value={conversion?.total_inquiries ?? 0}
            isLoading={conversionLoading}
            color="primary"
          />
          <KPICard
            title="Booking Sessions"
            value={conversion?.booking_sessions ?? 0}
            isLoading={conversionLoading}
            color="info"
          />
          <KPICard
            title="Completed Bookings"
            value={conversion?.completed_sessions ?? 0}
            isLoading={conversionLoading}
            color="success"
          />
          <KPICard
            title="Abandoned"
            value={conversion?.abandoned_sessions ?? 0}
            isLoading={conversionLoading}
            color="warning"
          />
        </Box>
        <Box
          display="flex"
          gap={2}
          mt={2}
          sx={{
            flexWrap: 'wrap',
            '& > *': { flex: '1 1 200px', minWidth: 200 },
          }}
        >
          <KPICard
            title="Booking Conversion Rate"
            value={`${conversion?.booking_conversion_rate ?? 0}%`}
            subtitle="sessions to bookings"
            isLoading={conversionLoading}
            color="success"
          />
          <KPICard
            title="Event Conversion Rate"
            value={`${conversion?.event_conversion_rate ?? 0}%`}
            subtitle="inquiries to confirmations"
            isLoading={conversionLoading}
            color="info"
          />
          <KPICard
            title="Abandonment Rate"
            value={`${conversion?.abandonment_rate ?? 0}%`}
            isLoading={conversionLoading}
            color="error"
          />
        </Box>
      </Box>

      {/* Lead Sources */}
      <Box mb={4}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Lead Sources</Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={handleExportLeadSources}
          >
            Export
          </Button>
        </Box>
        <Box display="flex" gap={3} flexWrap="wrap">
          <Box flex="1 1 400px" minWidth={300}>
            <LeadSourceChart data={leadSources || []} isLoading={leadSourcesLoading} />
          </Box>
          <Box flex="1 1 400px" minWidth={300}>
            {leadSourcesLoading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : (
              <ModernCard variant="glass" size="medium" sx={{ height: 300, overflow: 'auto' }}>
                <TableContainer>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Source</TableCell>
                        <TableCell align="right">Leads</TableCell>
                        <TableCell align="right">Converted</TableCell>
                        <TableCell align="right">Conv. Rate</TableCell>
                        <TableCell align="right">Value</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {leadSources?.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Chip label={item.label} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell align="right">{item.lead_count}</TableCell>
                          <TableCell align="right">{item.converted_count}</TableCell>
                          <TableCell align="right">{item.conversion_rate}%</TableCell>
                          <TableCell align="right">{formatCurrency(item.total_value)}</TableCell>
                        </TableRow>
                      ))}
                      {(!leadSources || leadSources.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={5} align="center">
                            No lead source data available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </ModernCard>
            )}
          </Box>
        </Box>
      </Box>

      {/* Customer List */}
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Top Customers</Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={handleExportCustomers}
          >
            Export All
          </Button>
        </Box>
        {customersLoading ? (
          <Skeleton variant="rectangular" height={300} />
        ) : (
          <ModernCard variant="glass" size="medium">
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell align="right">Total Events</TableCell>
                    <TableCell align="right">Completed</TableCell>
                    <TableCell align="right">Total Spent</TableCell>
                    <TableCell>Member Since</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {customers?.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>{customer.full_name}</TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell align="right">{customer.total_events}</TableCell>
                      <TableCell align="right">{customer.completed_events}</TableCell>
                      <TableCell align="right">{formatCurrency(customer.total_spent)}</TableCell>
                      <TableCell>
                        {customer.created_at
                          ? new Date(customer.created_at).toLocaleDateString()
                          : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!customers || customers.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No customers found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </ModernCard>
        )}
      </Box>
    </Box>
  );
};

export default CustomersReportsTab;
