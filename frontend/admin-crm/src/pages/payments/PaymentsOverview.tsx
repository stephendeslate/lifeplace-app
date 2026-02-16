// Payments Overview - Flat design matching Analytics page style

import React, { useEffect, useState } from "react";
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
  CircularProgress,
} from "@mui/material";
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Payment as PaymentIcon,
  Search as SearchIcon,
  Schedule as ScheduleIcon,
  WarningAmberOutlined as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  AccountBalance as AccountBalanceIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Replay as ReplayIcon,
  AddCircle as AddCircleIcon,
  FileDownload as ExportIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useLayout } from "../../contexts/LayoutContext";
import { usePayments } from "../../hooks/usePayments";
import { useCurrencySettings } from "../../hooks/useCurrency";
import { formatCurrency } from "../../utils/currency";
import { PaymentForm } from "../../components/payments/PaymentForm";
import type {
  Payment,
  PaymentFilters,
  CreatePaymentData,
  PaymentStatus,
} from "../../types/payments.types";
import { PAYMENT_STATUSES } from "../../types/payments.types";
import {
  ModernPageLayout,
  ModernPageHeader,
  ModernEmptyState,
} from "../../components/common";

export const PaymentsOverview: React.FC = () => {
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [filters, setFilters] = useState<PaymentFilters>({});
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [searchValue, setSearchValue] = useState("");

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
    setBreadcrumbs([{ label: "Payments" }]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      setFilters((prev) => ({
        ...prev,
        search: searchValue || undefined,
      }));
      setPage(0); // Reset to first page when searching
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue]);

  const handleRowClick = (payment: Payment) => {
    navigate(`/payments/${payment.id}`);
  };

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    payment: Payment,
  ) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedPayment(payment);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedPayment(null);
  };

  const handleExport = async () => {
    // Export not yet available — backend endpoint pending
  };

  const handleFilterChange = (key: keyof PaymentFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "all" ? undefined : value,
    }));
    setPage(0); // Reset to first page when filtering
  };

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case "CREATED":
        return "default";
      case "PENDING":
        return "warning";
      case "PROCESSING":
        return "info";
      case "COMPLETED":
        return "success";
      case "FAILED":
        return "error";
      case "CANCELLED":
        return "default";
      case "REFUNDED":
        return "secondary";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case "CREATED":
        return <AddCircleIcon sx={{ fontSize: 16 }} />;
      case "PENDING":
        return <ScheduleIcon sx={{ fontSize: 16 }} />;
      case "PROCESSING":
        return <HourglassEmptyIcon sx={{ fontSize: 16 }} />;
      case "COMPLETED":
        return <CheckCircleIcon sx={{ fontSize: 16 }} />;
      case "FAILED":
        return <CancelIcon sx={{ fontSize: 16 }} />;
      case "CANCELLED":
        return <CancelIcon sx={{ fontSize: 16 }} />;
      case "REFUNDED":
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
        color: "error.main",
        severity: "overdue",
      };
    } else if (diffDays === 0) {
      return {
        text: "Due today",
        color: "warning.main",
        severity: "today",
      };
    } else if (diffDays <= 7) {
      return {
        text: `${diffDays} days remaining`,
        color: "warning.main",
        severity: "soon",
      };
    } else {
      return {
        text: `${diffDays} days remaining`,
        color: "text.secondary",
        severity: "normal",
      };
    }
  };

  // Format currency based on payment's currency and user's settings
  const formatPaymentAmount = (payment: Payment) => {
    return formatCurrency(payment.amount, payment.currency, {
      showSymbol: currencySettings?.displayFormat !== "code",
      showCode:
        currencySettings?.displayFormat === "code" ||
        currencySettings?.displayFormat === "both",
      minimumFractionDigits:
        currencySettings?.decimalPlaces ?? (payment.currency === "PHP" ? 0 : 2),
      maximumFractionDigits:
        currencySettings?.decimalPlaces ?? (payment.currency === "PHP" ? 0 : 2),
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
        color: "primary",
      }}
      tip={{
        text: "Payments can be linked to events and invoices for complete tracking and better organization.",
        type: "info",
      }}
      size="large"
      color="primary"
    />
  );

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== undefined,
  );
  const filteredCount = totalPayments ?? 0;

  // Loading state
  if (isLoadingPayments) {
    return (
      <ModernPageLayout backgroundPattern="default">
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight={400}
        >
          <CircularProgress />
        </Box>
      </ModernPageLayout>
    );
  }

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <ModernPageLayout backgroundPattern="default">
      {/* Page Header - flat style */}
      <ModernPageHeader
        title="Payments"
        subtitle={`${filteredCount} payment${filteredCount !== 1 ? "s" : ""} found`}
        icon={<AccountBalanceIcon />}
        size="medium"
        primaryAction={{
          label: "Add Payment",
          icon: <AddIcon />,
          onClick: () => setCreateDialogOpen(true),
          variant: "contained",
          color: "primary",
        }}
        secondaryActions={[
          {
            label: "Export",
            icon: <ExportIcon />,
            onClick: handleExport,
            variant: "outlined",
            disabled: true,
            tooltip: "Export coming soon",
          },
        ]}
      />

      {totalPayments === 0 && !hasActiveFilters ? (
        renderNoPaymentsState()
      ) : (
        <>
          {/* Filters - flat style */}
          <Box sx={{ mb: 3, p: 2, borderRadius: 1, bgcolor: "action.hover" }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems="center"
            >
              <TextField
                size="small"
                placeholder="Search payments..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
                }}
                sx={{ flex: 1, minWidth: 200 }}
              />

              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status || "all"}
                  label="Status"
                  onChange={(e) => handleFilterChange("status", e.target.value)}
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
                  color="warning"
                  onClick={() => {
                    setFilters({});
                    setSearchValue("");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </Stack>
          </Box>

          {/* Payments Table - flat style */}
          <Box
            sx={{
              borderRadius: 1,
              bgcolor: "background.paper",
              overflow: "hidden",
            }}
          >
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Status</TableCell>
                    <TableCell
                      sx={{ display: { xs: "none", lg: "table-cell" } }}
                    >
                      Due Date
                    </TableCell>
                    <TableCell
                      sx={{ display: { xs: "none", md: "table-cell" } }}
                    >
                      Invoice ID
                    </TableCell>
                    <TableCell
                      sx={{ display: { xs: "none", md: "table-cell" } }}
                    >
                      Client
                    </TableCell>
                    <TableCell
                      sx={{ display: { xs: "none", md: "table-cell" } }}
                    >
                      Event
                    </TableCell>
                    <TableCell>Balance Due</TableCell>
                    <TableCell width="50"></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.isArray(payments) &&
                    payments.map((payment) => {
                      const daysRemaining = getDaysRemaining(payment.due_date);

                      return (
                        <TableRow
                          key={payment.id}
                          hover
                          onClick={() => handleRowClick(payment)}
                          sx={{ cursor: "pointer" }}
                        >
                          <TableCell>
                            <Chip
                              icon={getStatusIcon(payment.status)}
                              label={
                                PAYMENT_STATUSES.find(
                                  (s) => s.value === payment.status,
                                )?.label || payment.status
                              }
                              color={getStatusColor(payment.status)}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>

                          <TableCell
                            sx={{ display: { xs: "none", lg: "table-cell" } }}
                          >
                            <Box>
                              <Typography variant="body2" fontWeight="600">
                                {new Date(
                                  payment.due_date,
                                ).toLocaleDateString()}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: daysRemaining.color,
                                  fontWeight:
                                    daysRemaining.severity === "overdue"
                                      ? "bold"
                                      : "normal",
                                }}
                              >
                                {daysRemaining.text}
                              </Typography>
                            </Box>
                          </TableCell>

                          <TableCell
                            sx={{ display: { xs: "none", md: "table-cell" } }}
                          >
                            <Typography
                              variant="body2"
                              fontFamily="monospace"
                              fontWeight="600"
                            >
                              {payment.invoice_details?.invoice_id ||
                                payment.payment_number}
                            </Typography>
                          </TableCell>

                          <TableCell
                            sx={{ display: { xs: "none", md: "table-cell" } }}
                          >
                            <Typography variant="body2" color="text.secondary">
                              {payment.event_details?.client_name ||
                                "Unknown Client"}
                            </Typography>
                          </TableCell>

                          <TableCell
                            sx={{ display: { xs: "none", md: "table-cell" } }}
                          >
                            <Typography variant="body2" color="text.secondary">
                              {payment.event_details?.name || "No Event"}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography
                              variant="body2"
                              fontWeight="600"
                              color={
                                payment.status === "COMPLETED"
                                  ? "success.main"
                                  : "text.primary"
                              }
                            >
                              {payment.status === "COMPLETED"
                                ? "Paid"
                                : formatPaymentAmount(payment)}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={(e) => handleMenuOpen(e, payment)}
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

            {/* Pagination */}
            <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
              <TablePagination
                rowsPerPageOptions={[10, 25, 50, 100]}
                component="div"
                count={totalPayments || 0}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </Box>
          </Box>
        </>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            if (selectedPayment) navigate(`/payments/${selectedPayment.id}`);
            handleMenuClose();
          }}
        >
          <PaymentIcon sx={{ mr: 1.5 }} />
          View Payment
        </MenuItem>
      </Menu>

      {/* Create Payment Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Payment</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <PaymentForm
            onSubmit={(data) => {
              createPayment(data as CreatePaymentData, {
                onSuccess: () => setCreateDialogOpen(false),
              });
            }}
            onCancel={() => setCreateDialogOpen(false)}
            isLoading={isCreatingPayment}
          />
        </DialogContent>
      </Dialog>
    </ModernPageLayout>
  );
};
