// frontend/admin-crm/src/pages/payments/PaymentsOverview.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Paper,
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
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  FileDownload as ExportIcon,
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
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../../contexts/LayoutContext';
import { usePayments } from '../../hooks/usePayments';
import { PaymentForm } from '../../components/payments/PaymentForm';
import type { Payment, PaymentFilters, CreatePaymentData, PaymentStatus } from '../../types/payments.types';
import { PAYMENT_STATUSES } from '../../types/payments.types';

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
    payments = [],
    totalPayments,
    pageCount,
    isLoadingPayments,
    createPayment,
    isCreatingPayment,
  } = usePayments({
    ...filters,
    page: page + 1, // API uses 1-based pagination
    page_size: rowsPerPage,
  });

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

  // @ts-ignore
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

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
      case 'COMPLETED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'FAILED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircleIcon sx={{ fontSize: 16 }} />;
      case 'PENDING':
        return <ScheduleIcon sx={{ fontSize: 16 }} />;
      case 'FAILED':
        return <CancelIcon sx={{ fontSize: 16 }} />;
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

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num);
  };

  // Empty state when no payments exist
  const renderNoPaymentsState = () => (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 6, 
        textAlign: 'center',
        bgcolor: 'grey.50',
        border: '2px dashed',
        borderColor: 'grey.300'
      }}
    >
      <PaymentIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        No Payments Yet
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}>
        Start managing payments by creating your first payment record. Track invoices, due dates, and payment statuses.
      </Typography>
      
      <Button
        variant="contained"
        size="large"
        startIcon={<AddIcon />}
        onClick={() => setCreateDialogOpen(true)}
      >
        Create First Payment
      </Button>

      <Divider sx={{ my: 3 }} />
      
      <Typography variant="body2" color="text.secondary">
        💡 <strong>Tip:</strong> Payments can be linked to events and invoices for complete tracking
      </Typography>
    </Paper>
  );

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined);
  const filteredCount = totalPayments ?? (Array.isArray(payments) ? payments.length : 0);

  if (isLoadingPayments) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Payments
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {filteredCount} payment{filteredCount !== 1 ? 's' : ''} found
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExport}
          >
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Add Payment
          </Button>
        </Stack>
      </Box>

      {payments.length === 0 && !hasActiveFilters ? (
        renderNoPaymentsState()
      ) : (
        <>
          {/* Filters */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                <TextField
                  size="small"
                  placeholder="Search payments..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                  }}
                  sx={{ flex: 1, minWidth: 200 }}
                />
                
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status || 'all'}
                    label="Status"
                    onChange={(e) => handleFilterChange('status', e.target.value)}
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
                  >
                    Clear Filters
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* Payments Table */}
          <Card>
            <TableContainer>
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
                        sx={{ cursor: 'pointer' }}
                        onClick={() => handleRowClick(payment)}
                      >
                        <TableCell>
                          <Chip
                            icon={getStatusIcon(payment.status)}
                            label={PAYMENT_STATUSES.find(s => s.value === payment.status)?.label || payment.status}
                            color={getStatusColor(payment.status)}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
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
                          <Box display="flex" alignItems="center" gap={1}>
                            <ReceiptIcon color="action" fontSize="small" />
                            <Typography variant="body2" fontFamily="monospace">
                              {payment.invoice_details?.invoice_id || payment.payment_number}
                            </Typography>
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <PersonIcon color="action" fontSize="small" />
                            <Typography variant="body2">
                              {payment.event_details?.client_name || 'Unknown Client'}
                            </Typography>
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <EventIcon color="action" fontSize="small" />
                            <Typography variant="body2">
                              {payment.event_details?.name || 'No Event'}
                            </Typography>
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            fontWeight="medium"
                            color={payment.status === 'COMPLETED' ? 'success.main' : 'text.primary'}
                          >
                            {payment.status === 'COMPLETED' ? 'Paid' : formatCurrency(payment.amount)}
                          </Typography>
                        </TableCell>
                        
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, payment)}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={totalPayments || 0}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Card>
        </>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          if (selectedPayment) navigate(`/payments/${selectedPayment.id}`);
          handleMenuClose();
        }}>
          <PaymentIcon sx={{ mr: 1 }} />
          View Payment
        </MenuItem>
      </Menu>

      {/* Create Payment Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Payment</DialogTitle>
        <DialogContent>
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
    </Box>
  );
};