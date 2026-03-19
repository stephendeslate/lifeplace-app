import React from 'react';
import {
  Box,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
  Chip,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Event as EventIcon,
  Description as ContractIcon,
  Assignment as QuestionnaireIcon,
  Note as NoteIcon,
} from '@mui/icons-material';
import { ActivityTimeline, type ActivityItem } from '@/components/common';
import { NotesList } from '@/components/notes';
import { ModernEmptyState } from '@/components/common/ModernDesignSystem';
import type { Invoice } from '@/types/payments';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return <div hidden={value !== index}>{value === index && <Box>{children}</Box>}</div>;
};

interface PaymentTabsProps {
  tabValue: number;
  setTabValue: (value: number) => void;
  activityItems: ActivityItem[];
  invoice: Invoice | undefined;
  isLoadingInvoice: boolean;
  paymentId: number;
  paymentNumber: string;
  refetchPayment: () => void;
  formatPaymentAmount: (amount: string | number, currency?: string) => string;
}

export const PaymentTabs: React.FC<PaymentTabsProps> = ({
  tabValue,
  setTabValue,
  activityItems,
  invoice,
  isLoadingInvoice,
  paymentId,
  paymentNumber,
  refetchPayment,
  formatPaymentAmount,
}) => {
  const lineItems = invoice?.line_items || [];

  return (
    <Box sx={{ borderRadius: 1, bgcolor: 'background.paper' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab
            label={`Activity (${activityItems.length})`}
            icon={<EventIcon />}
            iconPosition="start"
          />
          <Tab label="Invoice Details" icon={<ReceiptIcon />} iconPosition="start" />
          <Tab label="Contracts (0)" icon={<ContractIcon />} iconPosition="start" disabled />
          <Tab
            label="Questionnaires (0)"
            icon={<QuestionnaireIcon />}
            iconPosition="start"
            disabled
          />
          <Tab label="Notes" icon={<NoteIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      <Box sx={{ p: 3 }}>
        {/* Activity Tab */}
        <TabPanel value={tabValue} index={0}>
          <ActivityTimeline
            activities={activityItems}
            maxHeight="600px"
            showFilters={true}
            onRefresh={() => refetchPayment()}
          />
        </TabPanel>

        {/* Invoice Details Tab */}
        <TabPanel value={tabValue} index={1}>
          {isLoadingInvoice ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress size={32} />
            </Box>
          ) : invoice ? (
            <Box>
              <Box display="flex" justifyContent="between" alignItems="start" mb={3}>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Invoice {invoice.invoice_id as string}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Issued: {new Date(invoice.issue_date as string).toLocaleDateString()} - Due:{' '}
                    {new Date(invoice.due_date as string).toLocaleDateString()}
                  </Typography>
                </Box>
                <Chip
                  label={invoice.status_display as string}
                  color={
                    invoice.status === 'PAID'
                      ? 'success'
                      : invoice.status === 'ISSUED'
                        ? 'primary'
                        : 'default'
                  }
                  variant="outlined"
                />
              </Box>

              {/* Invoice Summary */}
              <Box
                sx={{
                  borderRadius: 1,
                  p: 3,
                  mb: 3,
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                <Stack spacing={2}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body1" fontWeight="medium">
                      Subtotal:
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {formatPaymentAmount(invoice.subtotal as string)}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body1" fontWeight="medium">
                      Tax:
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {formatPaymentAmount(invoice.tax_amount as string)}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" color="primary.main" fontWeight={700}>
                      Total:
                    </Typography>
                    <Typography variant="h6" color="primary.main" fontWeight={700}>
                      {formatPaymentAmount(invoice.total_amount as string)}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              {/* Line Items */}
              {lineItems.length > 0 && (
                <TableContainer component={Paper} sx={{ borderRadius: 1 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          Qty
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          Unit Price
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          Tax Rate
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          Total
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lineItems.map((item) => (
                        <TableRow key={item.id as number}>
                          <TableCell>{item.description as string}</TableCell>
                          <TableCell align="right">{item.quantity as number}</TableCell>
                          <TableCell align="right">
                            {formatPaymentAmount(item.unit_price as string)}
                          </TableCell>
                          <TableCell align="right">
                            {parseFloat(item.tax_rate as string)}%
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            {formatPaymentAmount(item.total as string)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {invoice.notes && (
                <Box
                  sx={{
                    mt: 3,
                    p: 3,
                    borderRadius: 1,
                    bgcolor: 'info.50',
                    border: 1,
                    borderColor: 'info.200',
                  }}
                >
                  <Typography variant="body1" fontWeight={600} color="info.main" sx={{ mb: 1 }}>
                    Notes:
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    {invoice.notes as string}
                  </Typography>
                </Box>
              )}
            </Box>
          ) : (
            <ModernEmptyState
              icon={ReceiptIcon}
              title="No Invoice"
              description="This payment is not associated with an invoice. It may be a direct payment or part of a different billing structure."
              size="small"
              sx={{ py: 4 }}
            />
          )}
        </TabPanel>

        {/* Contracts Tab - placeholder */}
        <TabPanel value={tabValue} index={2}>
          <ModernEmptyState
            icon={ContractIcon}
            title="Contracts Coming Soon"
            description="View related contracts for this payment. This feature is currently in development."
            size="small"
            tip={{
              text: 'Contract management features will be available in the next update',
              type: 'info',
            }}
            sx={{ py: 4 }}
          />
        </TabPanel>

        {/* Questionnaires Tab - placeholder */}
        <TabPanel value={tabValue} index={3}>
          <ModernEmptyState
            icon={QuestionnaireIcon}
            title="Questionnaires Coming Soon"
            description="View related questionnaires for this event. Connect customer feedback with payment records."
            size="small"
            tip={{
              text: 'Questionnaire integration features will be available soon',
              type: 'info',
            }}
            sx={{ py: 4 }}
          />
        </TabPanel>

        {/* Notes Tab */}
        <TabPanel value={tabValue} index={4}>
          <NotesList
            contentType="payment"
            objectId={paymentId}
            objectName={`Payment ${paymentNumber}`}
            allowCreate={true}
            allowEdit={true}
            allowDelete={true}
          />
        </TabPanel>
      </Box>
    </Box>
  );
};
