// Modern Glassmorphic Payments Overview
// Enhanced with world-class design patterns while preserving full functionality

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Payment as PaymentIcon,
  Person as PersonIcon,
  Event as EventIcon,
  Receipt as ReceiptIcon,
  Search as SearchIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  AccountBalance as AccountBalanceIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Replay as ReplayIcon,
  AddCircle as AddCircleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../../contexts/LayoutContext';
import { usePayments } from '../../hooks/usePayments';
import { useCurrencySettings } from '../../hooks/useCurrency';
import { formatCurrency } from '../../utils/currency';
import { PaymentForm } from '../../components/payments/PaymentForm';
import type { Payment, PaymentFilters, CreatePaymentData, PaymentStatus } from '../../types/payments.types';
import { PAYMENT_STATUSES } from '../../types/payments.types';

// Modern Design System Components
import {
  ModernOverviewLayout,
  ModernOverviewHeader,
  ModernGlassCard,
  ModernEmptyState,
  ModernTableSkeleton,
  createAddAction,
  createExportAction,
} from '../../components/common';
import { tokens } from '../../design-system';
import { glassPresets } from '../../design-system/utils/glassmorphism';
import { createTransition } from '../../design-system/utils/animations';

export const PaymentsOverview: React.FC = () => {
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [filters, setFilters] = useState<PaymentFilters>({});
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [searchValue, setSearchValue] = useState('');

  const {
    payments = [], // Add default empty array
    totalPayments,
    isLoadingPayments,
    createPayment,
    isCreatingPayment,
  } = usePayments({
    ...filters,
    page: page + 1, // API uses 1-based pagination
    page_size: rowsPerPage,
  });

  // Get user's currency settings for proper formatting
  const { settings: currencySettings } = useCurrencySettings();

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Payments' },
    ]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      setFilters(prev => ({
        ...prev,
        search: searchValue || undefined
      }));
      setPage(0); // Reset to first page when searching
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue]);

  const handleRowClick = (payment: Payment) => {
    navigate(`/payments/${payment.id}`);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, payment: Payment) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedPayment(payment);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedPayment(null);
  };

  const handleExport = async () => {
    try {
      // TODO: Implement export functionality once available in API
      console.log('Export payments:', filters);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleFilterChange = (key: keyof PaymentFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
    }));
    setPage(0); // Reset to first page when filtering
  };

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'CREATED':
        return 'default';
      case 'PENDING':
        return 'warning';
      case 'PROCESSING':
        return 'info';
      case 'COMPLETED':
        return 'success';
      case 'FAILED':
        return 'error';
      case 'CANCELLED':
        return 'default';
      case 'REFUNDED':
        return 'secondary';
      default:
        return 'default';
    }
  };

  // Helper to get token color for border styling
  const getStatusBorderColor = (status: PaymentStatus): string => {
    switch (status) {
      case 'PENDING':
        return tokens.color.warning[500];
      case 'PROCESSING':
        return tokens.color.info[500];
      case 'COMPLETED':
        return tokens.color.success[500];
      case 'FAILED':
        return tokens.color.error[500];
      case 'REFUNDED':
        return tokens.color.secondary[500];
      default:
        return tokens.color.primary[500];
    }
  };

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case 'CREATED':
        return <AddCircleIcon sx={{ fontSize: 16 }} />;
      case 'PENDING':
        return <ScheduleIcon sx={{ fontSize: 16 }} />;
      case 'PROCESSING':
        return <HourglassEmptyIcon sx={{ fontSize: 16 }} />;
      case 'COMPLETED':
        return <CheckCircleIcon sx={{ fontSize: 16 }} />;
      case 'FAILED':
        return <CancelIcon sx={{ fontSize: 16 }} />;
      case 'CANCELLED':
        return <CancelIcon sx={{ fontSize: 16 }} />;
      case 'REFUNDED':
        return <ReplayIcon sx={{ fontSize: 16 }} />;
      default:
        return <WarningIcon sx={{ fontSize: 16 }} />;
    }
  };

  const getDaysRemaining = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return {
        text: `${Math.abs(diffDays)} days overdue`,
        color: 'error.main',
        severity: 'overdue'
      };
    } else if (diffDays === 0) {
      return {
        text: 'Due today',
        color: 'warning.main',
        severity: 'today'
      };
    } else if (diffDays <= 7) {
      return {
        text: `${diffDays} days remaining`,
        color: 'warning.main',
        severity: 'soon'
      };
    } else {
      return {
        text: `${diffDays} days remaining`,
        color: 'text.secondary',
        severity: 'normal'
      };
    }
  };

  // Format currency based on payment's currency and user's settings
  const formatPaymentAmount = (payment: Payment) => {
    return formatCurrency(payment.amount, payment.currency, {
      showSymbol: currencySettings?.displayFormat !== 'code',
      showCode: currencySettings?.displayFormat === 'code' || currencySettings?.displayFormat === 'both',
      minimumFractionDigits: currencySettings?.decimalPlaces ?? (payment.currency === 'PHP' ? 0 : 2),
      maximumFractionDigits: currencySettings?.decimalPlaces ?? (payment.currency === 'PHP' ? 0 : 2),
    });
  };

  // Modern empty state when no payments exist
  const renderNoPaymentsState = () => (
    <ModernEmptyState
      icon={AccountBalanceIcon}
      title="No Payments Yet"
      description="Start managing payments by creating your first payment record. Track invoices, due dates, and payment statuses."
      primaryAction={{
        label: "Create First Payment",
        onClick: () => setCreateDialogOpen(true),
        icon: <AddIcon />,
        color: 'primary'
      }}
      tip={{
        text: "Payments can be linked to events and invoices for complete tracking and better organization.",
        type: 'info'
      }}
      size="large"
      color="primary"
      illustration="gradient"
    />
  );

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined);
  const filteredCount = totalPayments ?? 0;

  // Loading state with modern skeleton
  if (isLoadingPayments) {
    return (
      <ModernOverviewLayout>
        <ModernOverviewHeader
          title="Payments"
          subtitle="Loading payment data..."
          icon={<AccountBalanceIcon />}
        />
        <ModernTableSkeleton 
          rows={8} 
          columns={7}
        />
      </ModernOverviewLayout>
    );
  }

  // @ts-expect-error - Type compatibility issue requiring attention
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <ModernOverviewLayout>
      {/* Modern Header */}
      <ModernOverviewHeader
        title="Payments"
        subtitle={`${filteredCount} payment${filteredCount !== 1 ? 's' : ''} found`}
        icon={<AccountBalanceIcon />}
        primaryAction={createAddAction('Add Payment', () => setCreateDialogOpen(true))}
        secondaryActions={[
          createExportAction(handleExport)
        ]}
        stats={[
          { label: 'Total Payments', value: filteredCount },
          { 
            label: 'Completed', 
            value: payments?.filter(p => p.status === 'COMPLETED').length || 0
          },
          { 
            label: 'Pending', 
            value: payments?.filter(p => p.status === 'PENDING').length || 0
          },
          {
            label: 'Overdue',
            value: payments?.filter(p => {
              if (p.status === 'COMPLETED') return false;
              const due = new Date(p.due_date);
              const today = new Date();
              return due < today;
            }).length || 0
          }
        ]}
      />

      {totalPayments === 0 && !hasActiveFilters ? (
        renderNoPaymentsState()
      ) : (
        <>
          {/* Modern Filters Card */}
          <ModernGlassCard 
            size="medium" 
            sx={{ 
              mb: 4,
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `linear-gradient(135deg, ${tokens.color.primary[500]}03 0%, ${tokens.color.success[500]}02 100%)`,
                borderRadius: tokens.spacing.radius.xxl,
                pointerEvents: 'none',
              }
            }}
          >
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                <TextField
                  size="small"
                  placeholder="Search payments..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                  }}
                  sx={{ 
                    flex: 1, 
                    minWidth: 200,
                    '& .MuiOutlinedInput-root': {
                      ...glassPresets.light,
                      border: `1px solid ${tokens.color.borders.glass}`,
                      borderRadius: tokens.spacing.radius.full,
                      transition: createTransition(['border-color', 'box-shadow'], 'fast'),
                      
                      '&:hover': {
                        border: `1px solid ${tokens.color.primary[500]}40`,
                      },
                      
                      '&.Mui-focused': {
                        ...glassPresets.medium,
                        border: `1px solid ${tokens.color.primary[500]}60`,
                        boxShadow: `0 0 0 3px ${tokens.color.primary[500]}10`,
                      }
                    }
                  }}
                />
                
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status || 'all'}
                    label="Status"
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        ...glassPresets.light,
                        border: `1px solid ${tokens.color.borders.glass}`,
                        borderRadius: tokens.spacing.radius.lg,
                      }
                    }}
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    {PAYMENT_STATUSES.map((status) => (
                      <MenuItem key={status.value} value={status.value}>
                        {status.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                {hasActiveFilters && (
                  <Button 
                    variant="outlined" 
                    size="small" 
                    onClick={() => {
                      setFilters({});
                      setSearchValue('');
                    }}
                    sx={{
                      ...glassPresets.light,
                      border: `1px solid ${tokens.color.warning[500]}30`,
                      color: tokens.color.warning[600],
                      borderRadius: tokens.spacing.radius.full,
                      
                      '&:hover': {
                        ...glassPresets.medium,
                        border: `1px solid ${tokens.color.warning[500]}50`,
                      }
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </Stack>
            </Box>
          </ModernGlassCard>

          {/* Modern Payments Table Card */}
          <ModernGlassCard 
            size="medium"
            sx={{
              position: 'relative',
              overflow: 'hidden',
              
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `linear-gradient(135deg, ${tokens.color.primary[500]}02 0%, ${tokens.color.success[500]}01 100%)`,
                borderRadius: tokens.spacing.radius.xxl,
                pointerEvents: 'none',
              }
            }}
          >
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <TableContainer 
                sx={{
                  '& .MuiTable-root': {
                    '& .MuiTableHead-root': {
                      '& .MuiTableCell-head': {
                        backgroundColor: 'transparent',
                        borderBottom: `1px solid ${tokens.color.borders.glass}`,
                        fontWeight: 600,
                        color: tokens.color.neutral[700],
                        fontSize: '0.875rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        py: 2,
                      }
                    },
                    
                    '& .MuiTableBody-root': {
                      '& .MuiTableRow-root': {
                        transition: createTransition(['background-color', 'transform'], 'fast'),
                        cursor: 'pointer',
                        
                        '&:hover': {
                          backgroundColor: `${tokens.color.primary[50]}40`,
                          transform: 'translateY(-1px)',
                          
                          '& .action-button': {
                            opacity: 1,
                            transform: 'scale(1)',
                          }
                        },
                        
                        '& .MuiTableCell-body': {
                          borderBottom: `1px solid ${tokens.color.borders.subtle}`,
                          py: 2,
                          fontSize: '0.875rem',
                        }
                      }
                    }
                  }
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Status</TableCell>
                      <TableCell>Due Date</TableCell>
                      <TableCell>Invoice ID</TableCell>
                      <TableCell>Client</TableCell>
                      <TableCell>Event</TableCell>
                      <TableCell>Balance Due</TableCell>
                      <TableCell width="50"></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Array.isArray(payments) && payments.map((payment) => {
                      const daysRemaining = getDaysRemaining(payment.due_date);
                      
                      return (
                        <TableRow 
                          key={payment.id} 
                          hover 
                          onClick={() => handleRowClick(payment)}
                          sx={{
                            '&:last-child .MuiTableCell-body': {
                              borderBottom: 'none',
                            }
                          }}
                        >
                          <TableCell>
                            <Chip
                              icon={getStatusIcon(payment.status)}
                              label={PAYMENT_STATUSES.find(s => s.value === payment.status)?.label || payment.status}
                              color={getStatusColor(payment.status)}
                              size="small"
                              variant="outlined"
                              sx={{
                                ...glassPresets.light,
                                border: `1px solid ${getStatusBorderColor(payment.status)}30`,
                                fontWeight: 600,
                              }}
                            />
                          </TableCell>
                          
                          <TableCell>
                            <Box>
                              <Typography 
                                variant="body2" 
                                fontWeight="600"
                                sx={{ color: tokens.color.neutral[800] }}
                              >
                                {new Date(payment.due_date).toLocaleDateString()}
                              </Typography>
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  color: daysRemaining.color,
                                  fontWeight: daysRemaining.severity === 'overdue' ? 'bold' : 'normal'
                                }}
                              >
                                {daysRemaining.text}
                              </Typography>
                            </Box>
                          </TableCell>
                          
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1.5}>
                              <Box
                                sx={{
                                  ...glassPresets.light,
                                  borderRadius: '50%',
                                  p: 0.75,
                                  border: `1px solid ${tokens.color.info[500]}20`,
                                  background: `${tokens.color.info[50]}60`,
                                }}
                              >
                                <ReceiptIcon 
                                  sx={{ 
                                    fontSize: 16,
                                    color: tokens.color.info[600] 
                                  }} 
                                />
                              </Box>
                              <Typography 
                                variant="body2" 
                                fontFamily="monospace"
                                fontWeight="600"
                                sx={{ color: tokens.color.neutral[700] }}
                              >
                                {payment.invoice_details?.invoice_id || payment.payment_number}
                              </Typography>
                            </Box>
                          </TableCell>
                          
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <PersonIcon 
                                sx={{ 
                                  fontSize: 16,
                                  color: tokens.color.neutral[500] 
                                }} 
                              />
                              <Typography 
                                variant="body2"
                                sx={{ color: tokens.color.neutral[600] }}
                              >
                                {payment.event_details?.client_name || 'Unknown Client'}
                              </Typography>
                            </Box>
                          </TableCell>
                          
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <EventIcon 
                                sx={{ 
                                  fontSize: 16,
                                  color: tokens.color.neutral[500] 
                                }} 
                              />
                              <Typography 
                                variant="body2"
                                sx={{ color: tokens.color.neutral[600] }}
                              >
                                {payment.event_details?.name || 'No Event'}
                              </Typography>
                            </Box>
                          </TableCell>
                          
                          <TableCell>
                            <Typography 
                              variant="body2" 
                              fontWeight="600"
                              sx={{
                                color: payment.status === 'COMPLETED' ? tokens.color.success[600] : tokens.color.neutral[800]
                              }}
                            >
                              {payment.status === 'COMPLETED' ? 'Paid' : formatPaymentAmount(payment)}
                            </Typography>
                          </TableCell>
                          
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={(e) => handleMenuOpen(e, payment)}
                              className="action-button"
                              sx={{
                                ...glassPresets.light,
                                border: `1px solid ${tokens.color.borders.glass}`,
                                opacity: 0.7,
                                transform: 'scale(0.9)',
                                transition: createTransition(['opacity', 'transform', 'background'], 'fast'),
                                
                                '&:hover': {
                                  ...glassPresets.medium,
                                  opacity: 1,
                                  transform: 'scale(1)',
                                }
                              }}
                            >
                              <MoreVertIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {/* Modern Pagination */}
              <Box 
                sx={{
                  p: 2,
                  borderTop: `1px solid ${tokens.color.borders.glass}`,
                  background: `linear-gradient(135deg, ${tokens.color.neutral[50]}40 0%, ${tokens.color.primary[50]}10 100%)`,
                  backdropFilter: 'blur(8px)',
                }}
              >
                <TablePagination
                  rowsPerPageOptions={[10, 25, 50, 100]}
                  component="div"
                  count={totalPayments || 0}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  sx={{
                    '& .MuiTablePagination-toolbar': {
                      color: tokens.color.neutral[600],
                      fontSize: '0.875rem',
                    },
                    
                    '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                      fontWeight: 500,
                    },
                    
                    '& .MuiIconButton-root': {
                      ...glassPresets.light,
                      border: `1px solid ${tokens.color.borders.glass}`,
                      borderRadius: tokens.spacing.radius.sm,
                      mx: 0.25,
                      
                      '&:hover': {
                        ...glassPresets.medium,
                      },
                      
                      '&.Mui-disabled': {
                        opacity: 0.4,
                      }
                    }
                  }}
                />
              </Box>
            </Box>
          </ModernGlassCard>
        </>
      )}

      {/* Modern Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            ...glassPresets.medium,
            border: `1px solid ${tokens.color.borders.glass}`,
            borderRadius: tokens.spacing.radius.lg,
            mt: 1,
            minWidth: 180,
            
            '& .MuiMenuItem-root': {
              borderRadius: tokens.spacing.radius.md,
              mx: 1,
              my: 0.5,
              transition: createTransition(['background-color'], 'fast'),
              
              '&:hover': {
                backgroundColor: `${tokens.color.primary[50]}60`,
              }
            }
          }
        }}
      >
        <MenuItem 
          onClick={() => {
            if (selectedPayment) navigate(`/payments/${selectedPayment.id}`);
            handleMenuClose();
          }}
          sx={{ fontWeight: 500 }}
        >
          <PaymentIcon sx={{ mr: 1.5, color: tokens.color.primary[600] }} />
          View Payment
        </MenuItem>
      </Menu>

      {/* Modern Create Payment Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            ...glassPresets.medium,
            border: `1px solid ${tokens.color.borders.glass}`,
            borderRadius: tokens.spacing.radius.xxl,
            background: `linear-gradient(135deg, ${tokens.color.primary[500]}06 0%, ${tokens.color.success[500]}04 100%)`,
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            background: `linear-gradient(135deg, ${tokens.color.primary[600]} 0%, ${tokens.color.primary[500]} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            fontWeight: 700,
            fontSize: '1.5rem',
            pb: 2
          }}
        >
          Create New Payment
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <PaymentForm
            onSubmit={(data) => {
              createPayment(data as CreatePaymentData, {
                onSuccess: () => setCreateDialogOpen(false)
              });
            }}
            onCancel={() => setCreateDialogOpen(false)}
            isLoading={isCreatingPayment}
          />
        </DialogContent>
      </Dialog>
    </ModernOverviewLayout>
  );
};