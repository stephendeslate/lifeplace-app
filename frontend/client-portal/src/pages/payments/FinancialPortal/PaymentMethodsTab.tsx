// frontend/client-portal/src/pages/payments/FinancialPortal/PaymentMethodsTab.tsx

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
  useTheme,
  alpha,
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  Error as ErrorIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import { formatPhilippinesTime } from '@/utils/timezone';
import type { PaymentMethod } from '@/types/financial';
import { getPaymentMethodIcon } from './utils';

interface PaymentMethodsTabProps {
  paymentMethods: PaymentMethod[] | undefined;
  paymentMethodsLoading: boolean;
  paymentMethodsError: unknown;
  isMobile: boolean;
  onAddPaymentMethod: () => void;
  onEditPaymentMethod: (method: PaymentMethod) => void;
  onDeletePaymentMethod: (method: PaymentMethod) => void;
}

const PaymentMethodsTab: React.FC<PaymentMethodsTabProps> = ({
  paymentMethods,
  paymentMethodsLoading,
  paymentMethodsError,
  isMobile,
  onAddPaymentMethod,
  onEditPaymentMethod,
  onDeletePaymentMethod,
}) => {
  const theme = useTheme();

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Saved Payment Methods
        </Typography>
        <Button
          variant="outlined"
          startIcon={<CreditCardIcon />}
          size="small"
          onClick={onAddPaymentMethod}
          sx={{
            backgroundColor: alpha('#fff', 0.1),
            backdropFilter: 'blur(10px)',
            border: `1px solid ${alpha('#fff', 0.2)}`,
            '&:hover': {
              backgroundColor: alpha('#fff', 0.15),
            },
          }}
        >
          Add New
        </Button>
      </Box>

      {paymentMethodsError ? (
        <GlassCard
          variant="light"
          intensity="subtle"
          sx={{
            p: 4,
            textAlign: 'center',
            border: `1px solid ${alpha('#fff', 0.1)}`,
          }}
        >
          <ErrorIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Error Loading Payment Methods
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Unable to load your saved payment methods. Please try again later.
          </Typography>
        </GlassCard>
      ) : !Array.isArray(paymentMethods) || paymentMethods.length === 0 ? (
        <GlassCard
          variant="light"
          intensity="subtle"
          sx={{
            p: 8,
            textAlign: 'center',
            border: `1px solid ${alpha('#fff', 0.1)}`,
          }}
        >
          <CreditCardIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
            No Payment Methods
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}
          >
            You haven't saved any payment methods yet. Add a payment method to make future
            transactions faster and easier.
          </Typography>
          <Button
            variant="contained"
            startIcon={<CreditCardIcon />}
            size="large"
            onClick={onAddPaymentMethod}
            sx={{
              backgroundColor: theme.palette.primary.main,
              '&:hover': {
                backgroundColor: theme.palette.primary.dark,
              },
            }}
          >
            Add Payment Method
          </Button>
        </GlassCard>
      ) : (
        <AnimatedElement animation="slideUp" delay={400}>
          {isMobile ? (
            <Stack spacing={1.5}>
              {(Array.isArray(paymentMethods) ? paymentMethods : []).map((method) => (
                <GlassCard
                  key={method.id}
                  variant="light"
                  intensity="subtle"
                  sx={{
                    p: 2,
                    border: `1px solid ${alpha('#fff', 0.1)}`,
                  }}
                >
                  {/* Top row: icon + name + default chip */}
                  <Box display="flex" alignItems="center" gap={1.5} mb={1}>
                    {getPaymentMethodIcon(method.type)}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight="medium">
                        {method.nickname || method.type_display}
                      </Typography>
                    </Box>
                    {method.is_default && (
                      <Chip
                        label="Default"
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                          flexShrink: 0,
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        }}
                      />
                    )}
                  </Box>

                  {/* Info: type, details, expiry, created */}
                  <Stack spacing={0.5} sx={{ mb: 1.5 }}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">
                        Type
                      </Typography>
                      <Typography variant="caption">{method.type_display}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">
                        Details
                      </Typography>
                      <Typography variant="caption">
                        {method.last_four ? `•••• ${method.last_four}` : 'No details'}
                      </Typography>
                    </Box>
                    {method.expiry_date && (
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">
                          Expires
                        </Typography>
                        <Typography variant="caption">
                          {new Date(method.expiry_date).toLocaleDateString('en-US', {
                            month: '2-digit',
                            year: '2-digit',
                          })}
                        </Typography>
                      </Box>
                    )}
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" color="text.secondary">
                        Created
                      </Typography>
                      <Typography variant="caption">
                        {formatPhilippinesTime(method.created_at, false, 'MMM d, yyyy')}
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Action buttons */}
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <IconButton
                      size="small"
                      onClick={() => onEditPaymentMethod(method)}
                      sx={{
                        backgroundColor: alpha('#fff', 0.1),
                        '&:hover': {
                          backgroundColor: alpha('#fff', 0.2),
                        },
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => onDeletePaymentMethod(method)}
                      sx={{
                        backgroundColor: alpha(theme.palette.error.main, 0.1),
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.error.main, 0.2),
                        },
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
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
                      <TableCell>Payment Method</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Details</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell width="120">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(Array.isArray(paymentMethods) ? paymentMethods : []).map((method) => (
                      <TableRow key={method.id} hover>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={2}>
                            {getPaymentMethodIcon(method.type)}
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {method.nickname || method.type_display}
                              </Typography>
                              {method.is_default && (
                                <Chip
                                  label="Default"
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                  sx={{
                                    mt: 0.5,
                                    height: 20,
                                    fontSize: '0.7rem',
                                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                  }}
                                />
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{method.type_display}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {method.last_four ? `•••• ${method.last_four}` : 'No details'}
                          </Typography>
                          {method.expiry_date && (
                            <Typography variant="caption" display="block" color="text.secondary">
                              Expires:{' '}
                              {new Date(method.expiry_date).toLocaleDateString('en-US', {
                                month: '2-digit',
                                year: '2-digit',
                              })}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip label="Active" size="small" color="success" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatPhilippinesTime(method.created_at, false, 'MMM d, yyyy')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <Tooltip title="Edit Method">
                              <IconButton
                                size="small"
                                onClick={() => onEditPaymentMethod(method)}
                                sx={{
                                  backgroundColor: alpha('#fff', 0.1),
                                  '&:hover': {
                                    backgroundColor: alpha('#fff', 0.2),
                                  },
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Method">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => onDeletePaymentMethod(method)}
                                sx={{
                                  backgroundColor: alpha(theme.palette.error.main, 0.1),
                                  '&:hover': {
                                    backgroundColor: alpha(theme.palette.error.main, 0.2),
                                  },
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </GlassCard>
          )}

          {paymentMethodsLoading && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                p: 2,
              }}
            >
              <CircularProgress size={24} />
            </Box>
          )}
        </AnimatedElement>
      )}
    </Box>
  );
};

export { PaymentMethodsTab };
