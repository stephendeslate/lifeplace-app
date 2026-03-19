// frontend/client-portal/src/pages/payments/FinancialPortal/PaymentHistoryTab.tsx

import React from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  CircularProgress,
  alpha,
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import FinancialApi from '@/apis/financial';
import type { Payment } from '@/types/financial';
import { getPaymentStatusIcon, getPaymentMethodIcon } from './utils';

interface PaymentHistoryTabProps {
  payments: Payment[] | undefined;
  isMobile: boolean;
  downloadReceiptPending: boolean;
  onViewPayment: (payment: Payment) => void;
  onDownloadReceipt: (paymentId: number) => void;
  getPaymentStatusColor: (
    status: string,
  ) => 'success' | 'warning' | 'error' | 'default' | 'primary' | 'secondary' | 'info';
}

const PaymentHistoryTab: React.FC<PaymentHistoryTabProps> = ({
  payments,
  isMobile,
  downloadReceiptPending,
  onViewPayment,
  onDownloadReceipt,
  getPaymentStatusColor,
}) => {
  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Recent Payments
        </Typography>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          size="small"
          sx={{
            backgroundColor: alpha('#fff', 0.1),
            backdropFilter: 'blur(10px)',
            border: `1px solid ${alpha('#fff', 0.2)}`,
            '&:hover': {
              backgroundColor: alpha('#fff', 0.15),
            },
          }}
        >
          Export
        </Button>
      </Box>

      {!Array.isArray(payments) || payments.length === 0 ? (
        <GlassCard
          variant="light"
          intensity="subtle"
          sx={{
            p: 8,
            textAlign: 'center',
            border: `1px solid ${alpha('#fff', 0.1)}`,
          }}
        >
          <PaymentIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
            No Payment History
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}
          >
            Your payment history will appear here once you make payments.
          </Typography>
        </GlassCard>
      ) : (
        <AnimatedElement animation="slideUp" delay={400}>
          {isMobile ? (
            <Stack spacing={1.5}>
              {(Array.isArray(payments) ? payments : []).map((payment) => (
                <GlassCard
                  key={payment.id}
                  variant="light"
                  intensity="subtle"
                  sx={{
                    p: 2,
                    border: `1px solid ${alpha('#fff', 0.1)}`,
                  }}
                >
                  {/* Top row: description + status chip */}
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    gap={1}
                    mb={1}
                  >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" fontWeight="medium" noWrap>
                        {payment.description || payment.payment_number}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {payment.payment_number}
                      </Typography>
                    </Box>
                    <Chip
                      icon={getPaymentStatusIcon(payment.status)}
                      label={payment.status_display}
                      size="small"
                      color={getPaymentStatusColor(payment.status)}
                      variant="outlined"
                      sx={{ flexShrink: 0, fontSize: '0.7rem' }}
                    />
                  </Box>

                  {/* Amount */}
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    {FinancialApi.formatAmount(payment.amount, payment.currency)}
                  </Typography>

                  {/* Info row: method + date */}
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent="space-between"
                    flexWrap="wrap"
                    useFlexGap
                    sx={{ mb: 1.5 }}
                  >
                    <Box display="flex" alignItems="center" gap={0.5}>
                      {payment.payment_method_details ? (
                        <>
                          {getPaymentMethodIcon(payment.payment_method_details.type)}
                          <Typography variant="caption" color="text.secondary">
                            {payment.payment_method_details.type_display}
                          </Typography>
                        </>
                      ) : payment.inferred_payment_method ? (
                        <>
                          {getPaymentMethodIcon(payment.inferred_payment_method.type)}
                          <Typography variant="caption" color="text.secondary">
                            {payment.inferred_payment_method.type_display}
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          {payment.is_manual ? 'Manual Payment' : 'Not specified'}
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {payment.paid_on
                        ? new Date(payment.paid_on).toLocaleDateString()
                        : new Date(payment.due_date).toLocaleDateString()}
                    </Typography>
                  </Stack>

                  {/* Action buttons */}
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<ViewIcon />}
                      onClick={() => onViewPayment(payment)}
                      sx={{ fontSize: '0.75rem' }}
                    >
                      View
                    </Button>
                    {payment.receipt_number && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={
                          downloadReceiptPending ? <CircularProgress size={14} /> : <DownloadIcon />
                        }
                        onClick={() => onDownloadReceipt(payment.id)}
                        disabled={downloadReceiptPending}
                        sx={{ fontSize: '0.75rem' }}
                      >
                        Receipt
                      </Button>
                    )}
                  </Stack>
                </GlassCard>
              ))}
            </Stack>
          ) : (
            <GlassCard
              variant="light"
              intensity="subtle"
              sx={{
                border: `1px solid ${alpha('#fff', 0.1)}`,
                overflow: 'hidden',
              }}
            >
              <TableContainer sx={{ backgroundColor: 'transparent' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Payment</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Method</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell width="100">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(Array.isArray(payments) ? payments : []).map((payment) => (
                      <TableRow key={payment.id} hover>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {payment.description || payment.payment_number}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {payment.payment_number}
                              </Typography>
                              {payment.event_details && (
                                <Typography
                                  variant="caption"
                                  display="block"
                                  sx={{ color: 'primary.main' }}
                                >
                                  Event #{payment.event_details.id}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {FinancialApi.formatAmount(payment.amount, payment.currency)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {payment.payment_method_details ? (
                              <>
                                {getPaymentMethodIcon(payment.payment_method_details.type)}
                                <Typography variant="body2">
                                  {payment.payment_method_details.type_display}
                                </Typography>
                              </>
                            ) : payment.inferred_payment_method ? (
                              <>
                                {getPaymentMethodIcon(payment.inferred_payment_method.type)}
                                <Typography variant="body2">
                                  {payment.inferred_payment_method.type_display}
                                </Typography>
                              </>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                {payment.is_manual ? 'Manual Payment' : 'Not specified'}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={getPaymentStatusIcon(payment.status)}
                            label={payment.status_display}
                            size="small"
                            color={getPaymentStatusColor(payment.status)}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {payment.paid_on
                              ? new Date(payment.paid_on).toLocaleDateString()
                              : new Date(payment.due_date).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <Tooltip title="View Details">
                              <IconButton size="small" onClick={() => onViewPayment(payment)}>
                                <ViewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {payment.receipt_number && (
                              <Tooltip title="Download Receipt">
                                <IconButton
                                  size="small"
                                  onClick={() => onDownloadReceipt(payment.id)}
                                  disabled={downloadReceiptPending}
                                >
                                  {downloadReceiptPending ? (
                                    <CircularProgress size={14} />
                                  ) : (
                                    <DownloadIcon fontSize="small" />
                                  )}
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </GlassCard>
          )}
        </AnimatedElement>
      )}
    </Box>
  );
};

export { PaymentHistoryTab };
