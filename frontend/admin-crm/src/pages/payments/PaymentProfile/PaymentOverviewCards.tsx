import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import {
  Payment as PaymentIcon,
  Event as EventIcon,
  CreditCard as CreditCardIcon,
  AccountBalance as AccountBalanceIcon,
} from '@mui/icons-material';
import type { Payment } from '@/types/payments';

interface PaymentOverviewCardsProps {
  payment: Payment;
  daysRemaining: { text: string; color: string; severity: string };
  formatPaymentAmount: (amount: string | number, currency?: string) => string;
}

export const PaymentOverviewCards: React.FC<PaymentOverviewCardsProps> = ({
  payment,
  daysRemaining,
  formatPaymentAmount,
}) => {
  const eventDetails = payment.event_details as
    | { name?: string; start_date?: string; client_name?: string }
    | undefined;
  const paymentMethodDetails = payment.payment_method_details as
    | { nickname?: string; type_display?: string; last_four?: string }
    | undefined;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', lg: 'row' },
        gap: 3,
        mb: 4,
      }}
    >
      {/* Payment Details */}
      <Box sx={{ flex: 1 }}>
        <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
          <Stack spacing={3}>
            <Box display="flex" alignItems="center" gap={2}>
              <PaymentIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Payment Information
              </Typography>
            </Box>

            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Amount
                </Typography>
                <Typography variant="h4" color="primary.main" fontWeight={700}>
                  {formatPaymentAmount(payment.amount as string)}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Due Date
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {new Date(payment.due_date as string).toLocaleDateString()}
                </Typography>
                <Chip
                  label={daysRemaining.text}
                  size="small"
                  color={
                    daysRemaining.severity === 'overdue' || daysRemaining.severity === 'failed'
                      ? 'error'
                      : daysRemaining.severity === 'today' || daysRemaining.severity === 'soon'
                        ? 'warning'
                        : daysRemaining.severity === 'cancelled' ||
                            daysRemaining.severity === 'refunded'
                          ? 'default'
                          : 'success'
                  }
                  sx={{ mt: 1, fontWeight: 600 }}
                />
              </Box>

              {payment.paid_on && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Paid On
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {new Date(payment.paid_on as string).toLocaleDateString()}
                  </Typography>
                </Box>
              )}

              {payment.reference_number && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Reference Number
                  </Typography>
                  <Typography
                    variant="body1"
                    fontFamily="monospace"
                    sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1, fontSize: '0.9rem' }}
                  >
                    {payment.reference_number as string}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Stack>
        </Box>
      </Box>

      {/* Event & Client Info */}
      <Box sx={{ flex: 1 }}>
        <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
          <Stack spacing={3}>
            <Box display="flex" alignItems="center" gap={2}>
              <EventIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Event & Client
              </Typography>
            </Box>

            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Event
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {eventDetails?.name || 'No Event'}
                </Typography>
                {eventDetails?.start_date && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    {new Date(eventDetails.start_date).toLocaleDateString()}
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Client
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {eventDetails?.client_name || 'Unknown Client'}
                </Typography>
              </Box>

              {payment.description && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Description
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      p: 2,
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                      border: 1,
                      borderColor: 'divider',
                    }}
                  >
                    {payment.description as string}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Stack>
        </Box>
      </Box>

      {/* Payment Method & Status */}
      <Box sx={{ flex: 1 }}>
        <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
          <Stack spacing={3}>
            <Box display="flex" alignItems="center" gap={2}>
              <CreditCardIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Payment Method
              </Typography>
            </Box>

            <Stack spacing={2}>
              {paymentMethodDetails ? (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Method
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {paymentMethodDetails.nickname || paymentMethodDetails.type_display}
                  </Typography>
                  {paymentMethodDetails.last_four && (
                    <Typography
                      variant="body2"
                      sx={{
                        mt: 0.5,
                        fontFamily: 'monospace',
                        color: 'text.secondary',
                        fontSize: '0.9rem',
                      }}
                    >
                      **** **** **** {paymentMethodDetails.last_four}
                    </Typography>
                  )}
                </Box>
              ) : (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Method
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    No payment method assigned
                  </Typography>
                </Box>
              )}

              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Processing Type
                </Typography>
                <Chip
                  label={payment.is_manual ? 'Manual Payment' : 'Automatic Payment'}
                  size="medium"
                  icon={payment.is_manual ? <AccountBalanceIcon /> : <CreditCardIcon />}
                  color={payment.is_manual ? 'warning' : 'primary'}
                  sx={{ fontWeight: 600 }}
                />
              </Box>

              {payment.receipt_number && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Receipt Number
                  </Typography>
                  <Typography
                    variant="body1"
                    fontFamily="monospace"
                    sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1, fontSize: '0.9rem' }}
                  >
                    {payment.receipt_number as string}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};
